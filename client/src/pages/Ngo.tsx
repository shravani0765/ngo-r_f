import React, { useState } from 'react';
import {
  api, Ngo, Doc, Payment, Activity, Donation,
  CAUSES, DOCUMENT_TYPES, INDIAN_STATES, validate,
  money, shortMoney, num, date, docLabel
} from '../lib/api';
import {
  Card, H1, H2, Btn, Badge, StatusBadge, Stat, Empty, Field, Tabs, FileInput,
  Input, Textarea, Select, Alert, Loading, Confirm, useLoad, useToast
} from '../lib/ui';
import { useAuth } from '../App';

type Tab = 'dashboard' | 'profile' | 'documents' | 'payment' | 'causes' | 'activities' | 'donations';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'profile', label: 'Profile' },
  { id: 'documents', label: 'Documents' },
  { id: 'payment', label: 'Payment' },
  { id: 'causes', label: 'Causes' },
  { id: 'activities', label: 'Activity photos' },
  { id: 'donations', label: 'Donations' }
];

export function NgoWorkspace() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const { data, loading, error, reload } = useLoad(() => api.get<Ngo & { ngo?: null }>('/ngos/mine'));

  if (loading) return <Loading label="Loading your workspace…" />;
  if (error) return <Alert tone="error">{error}</Alert>;

  if (!data || (data as any).ngo === null) {
    return (
      <Empty title="No organisation profile yet"
        body="Your account is not linked to an organisation. Register again choosing 'An organisation'." />
    );
  }

  const ngo = data;

  return (
    <>
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{ngo.name}</h1>
          <StatusBadge status={ngo.status} />
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {ngo.presidentName && `${ngo.presidentName} · `}Registration {ngo.regNum}
        </p>
      </div>

      {ngo.status !== 'VERIFIED' && (
        <div className="mb-6">
          <Alert tone={['REJECTED', 'SUSPENDED'].includes(ngo.status) ? 'error' : 'warning'}>
            <p className="font-semibold">
              {ngo.status === 'PENDING' && 'Your organisation is waiting for review.'}
              {ngo.status === 'UNDER_REVIEW' && 'An admin is reviewing your organisation now.'}
              {ngo.status === 'REQUIRES_CORRECTION' && 'An admin has asked for changes.'}
              {ngo.status === 'REJECTED' && 'Your verification was not approved.'}
              {ngo.status === 'SUSPENDED' && 'Your organisation has been suspended.'}
            </p>
            <p className="mt-1">
              {ngo.statusReason ?? 'Upload your documents and add payment details to move things along. You will not appear publicly until an admin approves you.'}
            </p>
          </Alert>
        </div>
      )}

      <Tabs tabs={TABS} current={tab} onChange={setTab} />

      {tab === 'dashboard' && <Dashboard ngo={ngo} onGo={setTab} />}
      {tab === 'profile' && <Profile ngo={ngo} reload={reload} />}
      {tab === 'documents' && <Documents reload={reload} />}
      {tab === 'payment' && <PaymentTab />}
      {tab === 'causes' && <Causes ngo={ngo} reload={reload} />}
      {tab === 'activities' && <Activities />}
      {tab === 'donations' && <Donations />}
    </>
  );
}

/* -- Dashboard ----------------------------------------------------------- */

function Dashboard({ ngo, onGo }: { ngo: Ngo; onGo: (t: Tab) => void }) {
  const { notes, refreshNotes } = useAuth();
  const { data: donations } = useLoad(() => api.get<Donation[]>('/donations'));
  const { data: activities } = useLoad(() => api.get<Activity[]>('/activities/mine'));
  const { data: docs } = useLoad(() => api.get<Doc[]>('/documents/mine'));
  const { data: payment } = useLoad(() => api.get<Payment | null>('/payments/mine'));

  const successful = (donations ?? []).filter(d => d.paymentStatus === 'SUCCESSFUL');
  const total = successful.reduce((s, d) => s + d.amount, 0);
  const donorCount = new Set(successful.map(d => d.donor?.id ?? d.id)).size;

  // A simple, honest completion measure across the five things that matter.
  const checks = [
    { label: 'Organisation details', done: Boolean(ngo.description && ngo.presidentName && ngo.pinCode), tab: 'profile' as Tab },
    { label: 'Identity documents', done: (docs ?? []).length >= 3, tab: 'documents' as Tab },
    { label: 'Government certificate', done: (docs ?? []).some(d => d.docType === 'GOV_CERTIFICATE'), tab: 'documents' as Tab },
    { label: 'Payment details', done: Boolean(payment?.upiId || payment?.qrCodeAvailable), tab: 'payment' as Tab },
    { label: 'Causes chosen', done: (ngo.causes ?? []).length > 0, tab: 'causes' as Tab }
  ];
  const completion = Math.round((checks.filter(c => c.done).length / checks.length) * 100);
  const unread = notes.filter(n => !n.read);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total donations" value={shortMoney(total)} hint={`${successful.length} received`} />
        <Stat label="Donors" value={num(donorCount)} />
        <Stat label="Activity photos" value={num((activities ?? []).length)}
          hint={`${(activities ?? []).filter(a => a.status === 'APPROVED').length} approved`} />
        <Stat label="Profile complete" value={`${completion}%`} />
      </div>

      <Card>
        <H2>Finish setting up</H2>
        <ul className="space-y-2">
          {checks.map(c => (
            <li key={c.label} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-2.5">
              <span className="flex items-center gap-2 text-sm">
                <span className={c.done ? 'text-emerald-600' : 'text-slate-300'}>{c.done ? '✓' : '○'}</span>
                <span className={c.done ? 'text-slate-600' : 'font-medium text-slate-900'}>{c.label}</span>
              </span>
              {!c.done && <Btn variant="secondary" onClick={() => onGo(c.tab)}>Add</Btn>}
            </li>
          ))}
        </ul>
      </Card>

      {unread.length > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <H2>Updates for you</H2>
            <Btn variant="ghost" onClick={async () => { await api.post('/notifications/read-all'); refreshNotes(); }}>
              Mark all read
            </Btn>
          </div>
          <ul className="space-y-2">
            {unread.slice(0, 5).map(n => (
              <li key={n.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                <p className="mt-0.5 text-sm text-slate-600">{n.message}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <H2>Recent donations</H2>
        {successful.length === 0 ? (
          <p className="text-sm text-slate-600">No donations yet. They will appear here as they arrive.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {successful.slice(0, 5).map(d => (
              <li key={d.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-slate-900">{d.category}</p>
                  <p className="text-xs text-slate-500">{date(d.date)}</p>
                </div>
                <span className="font-semibold text-emerald-700">{money(d.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* -- Profile ------------------------------------------------------------- */

function Profile({ ngo, reload }: { ngo: Ngo; reload: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: ngo.name, description: ngo.description, presidentName: ngo.presidentName,
    phone: ngo.phone, email: ngo.email, address: ngo.address,
    city: ngo.city, state: ngo.state, pinCode: ngo.pinCode, website: ngo.website ?? ''
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate.phone(form.phone)) return toast('Enter a valid 10-digit mobile number.', 'error');
    if (!validate.email(form.email)) return toast('Enter a valid email address.', 'error');
    if (!validate.pin(form.pinCode)) return toast('Enter a valid 6-digit PIN code.', 'error');

    setBusy(true);
    try {
      await api.patch(`/ngos/${ngo.id}`, { ...form, district: form.city });
      toast('Profile saved.', 'success');
      reload();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const f = (label: string, key: keyof typeof form, props: Record<string, unknown> = {}) => (
    <Field label={label}>
      <Input value={form[key]} onChange={e => setForm(s => ({ ...s, [key]: e.target.value }))} {...props} />
    </Field>
  );

  return (
    <Card>
      <H2>Organisation profile</H2>
      <form onSubmit={save} className="space-y-4">
        {f('Organisation name', 'name', { required: true })}
        <Field label="What does your organisation do?">
          <Textarea rows={3} value={form.description}
            onChange={e => setForm(s => ({ ...s, description: e.target.value }))} />
        </Field>
        {f('Adhyaksha / President / Head', 'presidentName')}
        <div className="grid gap-4 sm:grid-cols-2">
          {f('Official phone', 'phone', { inputMode: 'numeric' })}
          {f('Official email', 'email', { type: 'email' })}
        </div>
        <Field label="Complete address">
          <Textarea rows={2} value={form.address}
            onChange={e => setForm(s => ({ ...s, address: e.target.value }))} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          {f('City', 'city')}
          <Field label="State">
            <Select value={form.state} onChange={e => setForm(s => ({ ...s, state: e.target.value }))}>
              <option value="">Choose…</option>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          {f('PIN code', 'pinCode', { inputMode: 'numeric' })}
        </div>
        {f('Website', 'website', { placeholder: 'https://' })}
        <Btn type="submit" loading={busy}>Save changes</Btn>
      </form>
    </Card>
  );
}

/* -- Documents ----------------------------------------------------------- */

function Documents({ reload }: { reload: () => void }) {
  const toast = useToast();
  const { data: docs, reload: reloadDocs } = useLoad(() => api.get<Doc[]>('/documents/mine'));

  const [docType, setDocType] = useState<string>('AADHAAR');
  const [documentNumber, setDocumentNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const spec = DOCUMENT_TYPES.find(d => d.value === docType)!;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast('Please choose a file.', 'error');

    if (spec.needsNumber) {
      const v = documentNumber.trim();
      const ok = docType === 'AADHAAR' ? validate.aadhaar(v)
        : docType === 'PAN' ? validate.pan(v)
        : validate.voterId(v);
      if (!ok) return toast(`That ${spec.label} number does not look right (${spec.hint}).`, 'error');
    }

    const form = new FormData();
    form.append('file', file);
    form.append('docType', docType);
    if (spec.needsNumber) form.append('documentNumber', documentNumber.trim());

    setBusy(true);
    try {
      await api.upload('/documents', form);
      toast('Document uploaded. An admin will review it.', 'success');
      setDocumentNumber('');
      setFile(null);
      reloadDocs();
      reload();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert tone="info">
        Your Aadhaar, PAN and Voter ID are never shown publicly and never stored in full —
        we keep only the last four digits for display. Only you and an admin can open these files.
      </Alert>

      <Card>
        <H2>Upload a document</H2>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Document type">
            <Select value={docType} onChange={e => { setDocType(e.target.value); setDocumentNumber(''); }}>
              {DOCUMENT_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
          </Field>

          {spec.needsNumber && (
            <Field label={`${spec.label} number`} hint={spec.hint}>
              <Input required value={documentNumber}
                onChange={e => setDocumentNumber(e.target.value.toUpperCase())}
                placeholder={spec.hint} />
            </Field>
          )}

          <Field label="File" hint="JPG, PNG or PDF, up to 5 MB.">
            <FileInput onChange={setFile} />
          </Field>

          <Btn type="submit" loading={busy}>Upload</Btn>
        </form>
      </Card>

      {(!docs || docs.length === 0) ? (
        <Empty title="No documents yet"
          body="Upload your Aadhaar, PAN and government NGO certificate to start verification." />
      ) : (
        <Card>
          <H2>Your documents</H2>
          <ul className="divide-y divide-slate-100">
            {docs.map(d => <DocRow key={d.id} doc={d} onChange={() => { reloadDocs(); reload(); }} />)}
          </ul>
        </Card>
      )}
    </div>
  );
}

function DocRow({ doc, onChange }: { doc: Doc; onChange: () => void }) {
  const toast = useToast();
  const [check, setCheck] = useState<string | null>(null);

  const verify = async () => {
    try {
      const r = await api.post<{ isIntegrityValid: boolean; message: string }>(
        `/documents/${doc.id}/verify-integrity`
      );
      setCheck(r.message);
      toast(r.message, r.isIntegrityValid ? 'success' : 'error');
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  // The file endpoint requires a bearer token, so it is fetched then opened.
  const view = async () => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/file`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('ngo-commons-token')}` }
      });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Could not open the file.');
      const url = URL.createObjectURL(await res.blob());
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{docLabel(doc.docType)}</p>
          <p className="truncate text-xs text-slate-500">{doc.fileName} · {date(doc.uploadDate)}</p>
          {doc.masked && doc.numberLast4 && (
            <p className="mt-0.5 font-mono text-xs text-slate-600">{doc.masked}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={doc.status} />
          <Btn variant="secondary" onClick={view}>View</Btn>
          <Btn variant="ghost" onClick={verify}>Check file</Btn>
        </div>
      </div>
      {doc.reviewNotes && <div className="mt-2"><Alert tone="warning">Admin: {doc.reviewNotes}</Alert></div>}
      {check && <div className="mt-2"><Alert tone="info">{check}</Alert></div>}
    </li>
  );
}

/* -- Payment ------------------------------------------------------------- */

function PaymentTab() {
  const toast = useToast();
  const { data, reload } = useLoad(() => api.get<Payment | null>('/payments/mine'));
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<File | null>(null);
  const [form, setForm] = useState({ upiId: '', bankAccountName: '', accountNumber: '', ifsc: '' });

  // Populate once the saved details arrive.
  React.useEffect(() => {
    if (data) {
      setForm(f => ({
        ...f,
        upiId: data.upiId ?? '',
        bankAccountName: data.bankAccountName ?? '',
        ifsc: data.ifsc ?? ''
      }));
    }
  }, [data]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.upiId && !validate.upi(form.upiId)) return toast('UPI ID should look like name@bank.', 'error');
    if (form.ifsc && !validate.ifsc(form.ifsc)) return toast('IFSC should look like HDFC0001234.', 'error');

    setBusy(true);
    try {
      await api.put('/payments/mine', form);
      if (qr) {
        const fd = new FormData();
        fd.append('file', qr);
        await api.upload('/payments/mine/qr', fd);
        setQr(null);
      }
      toast('Payment details saved.', 'success');
      reload();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert tone="info">
        Donors pay you directly using your UPI ID or QR code. Bank details are optional and
        only the last four digits of the account number are ever stored.
      </Alert>

      <Card>
        <H2>Where donors should pay</H2>
        <form onSubmit={save} className="space-y-4">
          <Field label="UPI ID" hint="For example: yourngo@okhdfcbank">
            <Input value={form.upiId} onChange={e => setForm(f => ({ ...f, upiId: e.target.value }))}
              placeholder="yourngo@upi" />
          </Field>

          <Field label="UPI QR code" hint="A screenshot of your QR code from any payment app.">
            <FileInput accept=".jpg,.jpeg,.png" onChange={setQr} />
          </Field>

          {data?.qrCodeAvailable && !qr && (
            <Alert tone="success">A QR code is already saved. Choosing a new file replaces it.</Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bank account name" hint="Optional">
              <Input value={form.bankAccountName}
                onChange={e => setForm(f => ({ ...f, bankAccountName: e.target.value }))} />
            </Field>
            <Field label="IFSC" hint="Optional">
              <Input value={form.ifsc}
                onChange={e => setForm(f => ({ ...f, ifsc: e.target.value.toUpperCase() }))}
                placeholder="HDFC0001234" />
            </Field>
          </div>

          <Field label="Account number" hint={
            data?.accountNumberLast4
              ? `Saved: ${data.accountNumberMasked}. Enter again only to change it.`
              : 'Optional. Only the last four digits are kept.'
          }>
            <Input inputMode="numeric" value={form.accountNumber}
              onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} />
          </Field>

          <Btn type="submit" loading={busy}>Save payment details</Btn>
        </form>
      </Card>
    </div>
  );
}

/* -- Causes -------------------------------------------------------------- */

function Causes({ ngo, reload }: { ngo: Ngo; reload: () => void }) {
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>(ngo.causes ?? []);
  const [busy, setBusy] = useState(false);

  const toggle = (c: string) =>
    setSelected(list => list.includes(c) ? list.filter(x => x !== c) : [...list, c]);

  const save = async () => {
    if (selected.length === 0) return toast('Choose at least one cause.', 'error');
    setBusy(true);
    try {
      await api.put('/causes/mine', { categories: selected });
      toast('Causes updated.', 'success');
      reload();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <H2>What you work on</H2>
      <p className="mb-4 text-sm text-slate-600">Donors browse and filter by these.</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {CAUSES.map(c => (
          <button key={c} type="button" onClick={() => toggle(c)} aria-pressed={selected.includes(c)}
            className={`rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
              selected.includes(c)
                ? 'border-blue-700 bg-blue-50 text-blue-900'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}>
            {selected.includes(c) ? '✓ ' : ''}{c}
          </button>
        ))}
      </div>
      <Btn className="mt-4" onClick={save} loading={busy}>Save causes</Btn>
    </Card>
  );
}

/* -- Activity photos ----------------------------------------------------- */

function Activities() {
  const toast = useToast();
  const { data, reload } = useLoad(() => api.get<Activity[]>('/activities/mine'));
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState<Activity | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', category: 'Free Food',
    activityDate: new Date().toISOString().slice(0, 10)
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast('Please choose a photo.', 'error');

    const fd = new FormData();
    fd.append('file', file);
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));

    setBusy(true);
    try {
      await api.upload('/activities', fd);
      toast('Photo uploaded. It appears publicly once an admin approves it.', 'success');
      setForm({ title: '', description: '', category: form.category, activityDate: form.activityDate });
      setFile(null);
      reload();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async () => {
    if (!remove) return;
    try {
      await api.del(`/activities/${remove.id}`);
      toast('Photo removed.', 'success');
      reload();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setRemove(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <H2>Show how donations were used</H2>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Title">
            <Input required value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Free food distribution" />
          </Field>
          <Field label="What happened?">
            <Textarea required rows={3} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Distributed food packages to 150 families." />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CAUSES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Date">
              <Input type="date" max={new Date().toISOString().slice(0, 10)} value={form.activityDate}
                onChange={e => setForm(f => ({ ...f, activityDate: e.target.value }))} />
            </Field>
          </div>
          <Field label="Photo" hint="JPG or PNG, up to 5 MB.">
            <FileInput accept=".jpg,.jpeg,.png" onChange={setFile} />
          </Field>
          <Btn type="submit" loading={busy}>Upload photo</Btn>
        </form>
      </Card>

      {(!data || data.length === 0) ? (
        <Empty title="No photos yet" body="Photos of your work build donor trust more than anything else." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map(a => (
            <Card key={a.id} className="flex flex-col p-0">
              <img src={`/api/activities/${a.id}/image`} alt={a.title} loading="lazy"
                className="h-40 w-full rounded-t-xl bg-slate-100 object-cover" />
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{a.title}</h3>
                  <StatusBadge status={a.status} />
                </div>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-600">{a.description}</p>
                <p className="mt-2 text-xs text-slate-500">{a.category} · {date(a.activityDate)}</p>
                {a.reviewNotes && <p className="mt-1 text-xs text-rose-700">Admin: {a.reviewNotes}</p>}
                <Btn variant="ghost" className="mt-2 self-start px-0" onClick={() => setRemove(a)}>Remove</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {remove && (
        <Confirm danger title="Remove this photo?"
          body={`"${remove.title}" will be deleted permanently. This cannot be undone.`}
          confirmLabel="Remove" onConfirm={confirmRemove} onCancel={() => setRemove(null)} />
      )}
    </div>
  );
}

/* -- Donations ----------------------------------------------------------- */

function Donations() {
  const { data, loading } = useLoad(() => api.get<Donation[]>('/donations'));

  if (loading) return <Loading />;
  if (!data || data.length === 0) {
    return <Empty title="No donations yet" body="Donations you receive will be listed here." />;
  }

  const total = data.filter(d => d.paymentStatus === 'SUCCESSFUL').reduce((s, d) => s + d.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Total received" value={money(total)} />
        <Stat label="Donations" value={num(data.filter(d => d.paymentStatus === 'SUCCESSFUL').length)} />
      </div>

      <Card>
        <H2>All donations</H2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Cause</th>
                <th className="py-2 pr-3">Reference</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map(d => (
                <tr key={d.id}>
                  <td className="py-2 pr-3 text-slate-600">{date(d.date)}</td>
                  <td className="py-2 pr-3 font-medium text-slate-900">{d.category}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-slate-500">{d.referenceId ?? '—'}</td>
                  <td className="py-2 pr-3"><StatusBadge status={d.paymentStatus} /></td>
                  <td className="py-2 text-right font-semibold">{money(d.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
