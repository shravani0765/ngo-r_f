import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  api, AdminStats, Ngo, Doc, Activity, Donation, Report,
  money, shortMoney, num, date, docLabel
} from '../lib/api';
import {
  Card, H1, H2, Btn, Badge, StatusBadge, Stat, Empty, Field, Tabs, Modal, Confirm,
  Input, Textarea, Select, Alert, Loading, useLoad, useToast
} from '../lib/ui';

type Tab = 'overview' | 'ngos' | 'documents' | 'photos' | 'transactions' | 'reports';

export function AdminPanel() {
  const [tab, setTab] = useState<Tab>('overview');
  const { data: stats, reload: reloadStats } = useLoad(() => api.get<AdminStats>('/admin/statistics'));

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview' },
    { id: 'ngos' as Tab, label: 'Organisations' },
    { id: 'documents' as Tab, label: 'Documents', badge: stats?.pendingDocuments },
    { id: 'photos' as Tab, label: 'Photos' },
    { id: 'transactions' as Tab, label: 'Transactions' },
    { id: 'reports' as Tab, label: 'Reports', badge: stats?.openReports }
  ];

  return (
    <>
      <H1 sub="Everything waiting on you, in one place. Approving an organisation is what makes it visible to the public.">
        Admin panel
      </H1>

      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Waiting on you" value={num(stats.actionsWaiting)} hint="Organisations, documents and reports" />
          <Stat label="Organisations" value={`${stats.verifiedNGOs} / ${stats.totalNGOs}`} hint="verified of total" />
          <Stat label="Total donations" value={shortMoney(stats.totalDonatedAmount)} hint={`${stats.totalLedgerBlocks} ledger records`} />
          <Stat label="Pending review" value={num(stats.pendingNGOs)} hint="organisations" />
        </div>
      )}

      <Tabs tabs={tabs} current={tab} onChange={setTab} />

      {tab === 'overview' && <Queue onChange={reloadStats} />}
      {tab === 'ngos' && <NgoTable onChange={reloadStats} />}
      {tab === 'documents' && <DocumentQueue onChange={reloadStats} />}
      {tab === 'photos' && <PhotoQueue />}
      {tab === 'transactions' && <Transactions />}
      {tab === 'reports' && <Reports onChange={reloadStats} />}
    </>
  );
}

/* -- Overview queue ------------------------------------------------------ */

function Queue({ onChange }: { onChange: () => void }) {
  const { data, loading, error, reload } = useLoad(() => api.get<any>('/admin/queue'));

  if (loading) return <Loading />;
  if (error) return <Alert tone="error">{error}</Alert>;

  const refresh = () => { reload(); onChange(); };

  return (
    <div className="space-y-8">
      <section>
        <H2>Organisations awaiting a decision ({data?.organisations.length ?? 0})</H2>
        {(data?.organisations.length ?? 0) === 0 ? (
          <Empty title="Nothing waiting" body="Every organisation has been reviewed." />
        ) : (
          <div className="space-y-3">
            {data.organisations.map((n: Ngo) => (
              <Card key={n.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{n.name}</h3>
                    <p className="text-sm text-slate-600">
                      {n.presidentName} · {n.city}, {n.state}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Registered {date(n.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={n.status} />
                    <ReviewButton ngoId={n.id} onDone={refresh} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <H2>Risk flags ({data?.alerts.length ?? 0})</H2>
        {(data?.alerts.length ?? 0) === 0 ? (
          <Empty title="No open flags" body="No organisation is currently flagged." />
        ) : (
          <div className="space-y-3">
            {data.alerts.map((a: any) => (
              <Card key={a.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Badge tone={a.riskLevel === 'HIGH' ? 'red' : 'amber'}>{a.riskLevel} risk</Badge>
                    <p className="mt-2 font-medium text-slate-900">{a.ngo?.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{a.reason}</p>
                  </div>
                  <Btn variant="secondary" onClick={async () => {
                    await api.patch(`/admin/alerts/${a.id}`, { status: 'RESOLVED' });
                    refresh();
                  }}>Resolve</Btn>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* -- Organisation table -------------------------------------------------- */

function NgoTable({ onChange }: { onChange: () => void }) {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Ngo | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, reload } = useLoad(
    () => api.get<Ngo[]>(`/admin/ngos?${new URLSearchParams({
      ...(status && { status }), ...(search && { search })
    })}`),
    [status, search]
  );

  const refresh = () => { reload(); onChange(); };

  const confirmRemove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      const r = await api.del<{ message: string }>(`/admin/ngos/${removing.id}`);
      toast(r.message, 'success');
      refresh();
      setRemoving(null);
    } catch (e: any) {
      // The server refuses when donations exist and explains why.
      toast(e.message, 'error');
      setRemoving(null);
    } finally {
      setBusy(false);
    }
  };

  const quick = async (id: string, decision: string, notes?: string) => {
    try {
      const r = await api.post<{ message: string }>(`/admin/ngos/${id}/decision`, { decision, notes });
      toast(r.message, 'success');
      refresh();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Search">
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Name, registration number, president or city" />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All</option>
              {['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REQUIRES_CORRECTION', 'REJECTED', 'SUSPENDED']
                .map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').toLowerCase()}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      {loading && <Loading />}

      {!loading && (data ?? []).length === 0 && (
        <Empty title="No organisations match" body="Try clearing the filters." />
      )}

      {(data ?? []).length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Organisation</th>
                  <th className="py-2 pr-3">Location</th>
                  <th className="py-2 pr-3">President</th>
                  <th className="py-2 pr-3">Registered</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Donations</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data ?? []).map(n => (
                  <tr key={n.id}>
                    <td className="py-2.5 pr-3">
                      <span className="font-medium text-slate-900">{n.name}</span>
                      <span className="block text-xs text-slate-500">{n.phone}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">{n.city}, {n.state}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{n.presidentName || '—'}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{date(n.createdAt)}</td>
                    <td className="py-2.5 pr-3"><StatusBadge status={n.status} /></td>
                    <td className="py-2.5 pr-3 text-right font-semibold">{shortMoney(n.totalDonations ?? 0)}</td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Btn variant="secondary" onClick={() => setReviewing(n.id)}>Review</Btn>
                        {n.status === 'SUSPENDED' ? (
                          <Btn onClick={() => quick(n.id, 'VERIFIED')}>Reactivate</Btn>
                        ) : (
                          <Btn variant="ghost" onClick={() => setReviewing(n.id)}>Suspend</Btn>
                        )}
                        <Btn variant="ghost" onClick={() => setRemoving(n)}>Delete</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {reviewing && (
        <NgoReviewModal ngoId={reviewing} onClose={() => setReviewing(null)} onDone={refresh} />
      )}

      {removing && (
        <Confirm danger title="Remove this organisation?"
          body={`Are you sure you want to remove ${removing.name}? This may affect its donation records. Suspending is usually safer.`}
          confirmLabel="Remove permanently" busy={busy}
          onConfirm={confirmRemove} onCancel={() => setRemoving(null)} />
      )}
    </div>
  );
}

function ReviewButton({ ngoId, onDone }: { ngoId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Btn onClick={() => setOpen(true)}>Review</Btn>
      {open && <NgoReviewModal ngoId={ngoId} onClose={() => setOpen(false)} onDone={onDone} />}
    </>
  );
}

/* -- Review one organisation --------------------------------------------- */

function NgoReviewModal({ ngoId, onClose, onDone }: { ngoId: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { data, loading, reload } = useLoad(() => api.get<Ngo>(`/admin/ngos/${ngoId}`), [ngoId]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const decide = async (decision: string) => {
    if (['REJECTED', 'REQUIRES_CORRECTION', 'SUSPENDED'].includes(decision) && !notes.trim()) {
      return toast('Please explain the decision so they know what to fix.', 'error');
    }
    setBusy(true);
    try {
      const r = await api.post<{ message: string }>(`/admin/ngos/${ngoId}/decision`,
        { decision, notes: notes.trim() || undefined });
      toast(r.message, decision === 'VERIFIED' ? 'success' : 'info');
      onDone();
      onClose();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={data?.name ?? 'Review organisation'} onClose={onClose}>
      {loading && <Loading />}
      {data && (
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Organisation</h3>
            <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
              {[
                ['President', data.presidentName],
                ['Registration', data.regNum],
                ['Phone', data.phone],
                ['Email', data.email],
                ['Address', `${data.address}, ${data.city}, ${data.state} ${data.pinCode}`],
                ['Causes', (data.causes ?? []).join(', ') || '—'],
                ['Description', data.description]
              ].map(([k, v]) => (
                <div key={k} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="max-w-[60%] text-right font-medium text-slate-900">{v || '—'}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Documents</h3>
            {(data.documents ?? []).length === 0 ? (
              <p className="text-sm text-slate-600">No documents uploaded.</p>
            ) : (
              <ul className="space-y-2">
                {data.documents!.map(d => (
                  <AdminDocRow key={d.id} doc={d} onChange={reload} />
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Payment details</h3>
            {data.payment?.upiId || (data as any).paymentDetails?.upiId ? (
              <p className="text-sm">
                UPI: <span className="font-mono font-semibold">
                  {data.payment?.upiId ?? (data as any).paymentDetails?.upiId}
                </span>
              </p>
            ) : (
              <p className="text-sm text-slate-600">No payment details added yet.</p>
            )}
          </section>

          <Field label="Notes" hint="Required when asking for changes, rejecting or suspending.">
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. The certificate is unclear — please upload a sharper copy." />
          </Field>

          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => decide('VERIFIED')} loading={busy}>Approve and publish</Btn>
            <Btn variant="secondary" onClick={() => decide('REQUIRES_CORRECTION')} loading={busy}>
              Ask for changes
            </Btn>
            <Btn variant="danger" onClick={() => decide('REJECTED')} loading={busy}>Reject</Btn>
            <Btn variant="ghost" onClick={() => decide('SUSPENDED')} loading={busy}>Suspend</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

function AdminDocRow({ doc, onChange }: { doc: Doc; onChange: () => void }) {
  const toast = useToast();

  const view = async () => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/file`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('ngo-commons-token')}` }
      });
      if (!res.ok) throw new Error('Could not open the file.');
      const url = URL.createObjectURL(await res.blob());
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const act = async (status: string) => {
    const notes = status === 'REJECTED' ? window.prompt('Why is it rejected?') ?? '' : undefined;
    if (status === 'REJECTED' && !notes) return;
    try {
      await api.patch(`/documents/${doc.id}/review`, { status, notes });
      toast('Saved.', 'success');
      onChange();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{docLabel(doc.docType)}</p>
        {doc.masked && doc.numberLast4 && (
          <p className="font-mono text-xs text-slate-500">{doc.masked}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge status={doc.status} />
        <Btn variant="secondary" onClick={view}>View</Btn>
        <Btn variant="ghost" onClick={() => act('VERIFIED')}>Accept</Btn>
        <Btn variant="ghost" onClick={() => act('REJECTED')}>Reject</Btn>
      </div>
    </li>
  );
}

/* -- Document queue ------------------------------------------------------ */

function DocumentQueue({ onChange }: { onChange: () => void }) {
  const { data, loading, reload } = useLoad(() => api.get<any>('/admin/queue'));

  if (loading) return <Loading />;
  const docs: Doc[] = data?.documents ?? [];

  if (docs.length === 0) {
    return <Empty title="No documents waiting" body="Every uploaded document has been reviewed." />;
  }

  return (
    <Card>
      <H2>Documents to review ({docs.length})</H2>
      <ul className="space-y-2">
        {docs.map(d => (
          <li key={d.id}>
            <p className="mb-1 text-xs text-slate-500">{d.ngo?.name}</p>
            <AdminDocRow doc={d} onChange={() => { reload(); onChange(); }} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* -- Photo approval ------------------------------------------------------ */

function PhotoQueue() {
  const toast = useToast();
  const { data, loading, reload } = useLoad(() => api.get<Ngo[]>('/admin/ngos'));
  const [pending, setPending] = useState<Activity[] | null>(null);

  // Photos live under each organisation, so gather the pending ones.
  React.useEffect(() => {
    if (!data) return;
    Promise.all(data.map(n => api.get<Ngo>(`/admin/ngos/${n.id}`).catch(() => null)))
      .then(list => {
        const all = list.filter(Boolean).flatMap(n =>
          (n!.activities ?? []).map(a => ({ ...a, ngo: { id: n!.id, name: n!.name, city: n!.city, state: n!.state } }))
        );
        setPending(all.filter(a => a.status === 'PENDING'));
      });
  }, [data]);

  const act = async (id: string, status: string) => {
    const notes = status === 'REJECTED' ? window.prompt('Why is it rejected?') ?? '' : undefined;
    if (status === 'REJECTED' && !notes) return;
    try {
      await api.patch(`/activities/${id}/review`, { status, notes });
      toast(`Photo ${status.toLowerCase()}.`, 'success');
      reload();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  if (loading || pending === null) return <Loading />;
  if (pending.length === 0) {
    return <Empty title="No photos waiting" body="Approved photos appear in the public gallery." />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {pending.map(a => (
        <Card key={a.id} className="flex flex-col p-0">
          <img src={`/api/activities/${a.id}/image`} alt={a.title} loading="lazy"
            className="h-40 w-full rounded-t-xl bg-slate-100 object-cover" />
          <div className="flex flex-1 flex-col p-4">
            <p className="text-xs text-slate-500">{a.ngo?.name}</p>
            <h3 className="mt-1 text-sm font-semibold text-slate-900">{a.title}</h3>
            <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-600">{a.description}</p>
            <p className="mt-2 text-xs text-slate-500">{a.category} · {date(a.activityDate)}</p>
            <div className="mt-3 flex gap-2">
              <Btn className="flex-1" onClick={() => act(a.id, 'APPROVED')}>Approve</Btn>
              <Btn variant="secondary" onClick={() => act(a.id, 'REJECTED')}>Reject</Btn>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* -- Transactions -------------------------------------------------------- */

function Transactions() {
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');

  const { data, loading } = useLoad(
    () => api.get<{ items: Donation[]; summary: any[] }>(
      `/admin/transactions?${new URLSearchParams({
        ...(status && { status }), ...(category && { category })
      })}`
    ),
    [status, category]
  );

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Status">
            <Select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="SUCCESSFUL">Successful</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </Select>
          </Field>
          <Field label="Cause">
            <Select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All causes</option>
              {['Free Education', 'Free Food', 'Medical Support', 'Child Welfare',
                'Women Empowerment', 'Old Age Support', 'Disaster Relief',
                'Community Development', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      {(data?.summary ?? []).length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {data!.summary.map(s => (
            <Stat key={s.status} label={s.status.toLowerCase()} value={money(s.amount)}
              hint={`${s.count} transaction${s.count === 1 ? '' : 's'}`} />
          ))}
        </div>
      )}

      {loading && <Loading />}

      {!loading && (data?.items ?? []).length === 0 && (
        <Empty title="No transactions" body="Donations will appear here as they are made." />
      )}

      {(data?.items ?? []).length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Transaction</th>
                  <th className="py-2 pr-3">Donor</th>
                  <th className="py-2 pr-3">Organisation</th>
                  <th className="py-2 pr-3">Cause</th>
                  <th className="py-2 pr-3">Method</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data!.items.map(t => (
                  <tr key={t.id}>
                    <td className="py-2.5 pr-3 font-mono text-xs">{t.txnId}</td>
                    <td className="py-2.5 pr-3 text-slate-700">{t.donor?.name ?? '—'}</td>
                    <td className="py-2.5 pr-3 text-slate-700">{t.ngo?.name}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{t.category}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{t.paymentMethod}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{date(t.date)}</td>
                    <td className="py-2.5 pr-3"><StatusBadge status={t.paymentStatus} /></td>
                    <td className="py-2.5 text-right font-semibold">{money(t.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* -- Reports ------------------------------------------------------------- */

function Reports({ onChange }: { onChange: () => void }) {
  const toast = useToast();
  const { data, loading, reload } = useLoad(() => api.get<Report[]>('/admin/reports'));

  const set = async (id: string, status: string) => {
    try {
      await api.patch(`/admin/reports/${id}`, { status });
      toast('Updated.', 'success');
      reload();
      onChange();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  if (loading) return <Loading />;
  if (!data || data.length === 0) {
    return <Empty title="No reports" body="Anonymous concerns will appear here." />;
  }

  return (
    <div className="space-y-3">
      {data.map(r => (
        <Card key={r.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge tone="grey">{r.category}</Badge>
                <StatusBadge status={r.status} />
              </div>
              <p className="mt-2 font-mono text-xs text-slate-500">{r.trackingCode} · {date(r.createdAt)}</p>
              <p className="mt-1 text-sm text-slate-700">{r.description}</p>
              {r.ngo && <p className="mt-1 text-xs text-slate-500">About: {r.ngo.name}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn variant="secondary" onClick={() => set(r.id, 'UNDER_INVESTIGATION')}>Investigate</Btn>
              <Btn onClick={() => set(r.id, 'RESOLVED')}>Resolve</Btn>
              <Btn variant="ghost" onClick={() => set(r.id, 'DISMISSED')}>Dismiss</Btn>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
