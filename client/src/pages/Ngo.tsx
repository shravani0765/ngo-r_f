import React, { useState } from 'react';
import { api, Ngo, Project, Beneficiary, Scores, money, shortMoney, num, date } from '../lib/api';
import {
  Card, H1, H2, Btn, Badge, StatusBadge, Stat, ScoreDial, Empty, Field,
  Input, Textarea, Select, Alert, Loading, useLoad, useToast
} from '../lib/ui';
import { useAuth } from '../App';

type Tab = 'overview' | 'documents' | 'projects' | 'people' | 'money';

const TABS: [Tab, string][] = [
  ['overview', 'Overview'],
  ['documents', 'Documents'],
  ['projects', 'Projects'],
  ['people', 'People helped'],
  ['money', 'Money']
];

export function NgoWorkspace() {
  const [tab, setTab] = useState<Tab>('overview');
  const { data, loading, error, reload } = useLoad(() => api.get<Ngo & { ngo?: null }>('/ngos/mine'));

  if (loading) return <Loading label="Loading your workspace…" />;
  if (error) return <Alert tone="error">{error}</Alert>;

  // A brand-new NGO account with no profile yet.
  if (!data || (data as any).ngo === null) {
    return (
      <Empty title="No organisation profile yet"
        body="Your account is not linked to an organisation. Register again choosing 'An organisation', or ask an admin to link your account." />
    );
  }

  const ngo = data;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{ngo.name}</h1>
            <StatusBadge status={ngo.status} />
          </div>
          <p className="mt-1 text-sm text-slate-600">Registration {ngo.regNum}</p>
        </div>
      </div>

      {ngo.status !== 'VERIFIED' && (
        <div className="mb-6">
          <Alert tone={ngo.status === 'REJECTED' ? 'error' : 'warning'}>
            {ngo.status === 'PENDING' && 'Your organisation is waiting for an auditor to review it. Upload your documents and run the government check to speed this up.'}
            {ngo.status === 'REQUIRES_CORRECTION' && 'An auditor has asked for changes. Check your documents below for their notes.'}
            {ngo.status === 'REJECTED' && 'Your verification was not approved. See the notes on your documents.'}
          </Alert>
        </div>
      )}

      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            aria-current={tab === id ? 'page' : undefined}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === id ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}>
            {label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && <Overview ngo={ngo} reload={reload} />}
      {tab === 'documents' && <Documents ngo={ngo} reload={reload} />}
      {tab === 'projects' && <Projects ngo={ngo} reload={reload} />}
      {tab === 'people' && <People ngo={ngo} reload={reload} />}
      {tab === 'money' && <Money ngo={ngo} reload={reload} />}
    </>
  );
}

/* -- Overview ------------------------------------------------------------ */

function Overview({ ngo, reload }: { ngo: Ngo; reload: () => void }) {
  const toast = useToast();
  const { notes, refreshNotes } = useAuth();
  const [busy, setBusy] = useState(false);
  const f = ngo.finance;

  const runGovCheck = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ overallStatus: string; notes: string }>('/government/verify');
      toast(r.overallStatus === 'VERIFIED'
        ? 'Government check passed. An auditor will approve you shortly.'
        : 'Some details did not match. Check your registration number, PAN, 12A and 80G.',
        r.overallStatus === 'VERIFIED' ? 'success' : 'error');
      reload();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const unread = notes.filter(n => !n.read);

  return (
    <div className="space-y-6">
      {unread.length > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <H2>What needs your attention</H2>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><ScoreDial score={ngo.transparencyScore} /></Card>
        <Stat label="Received" value={shortMoney(f?.totalReceived ?? 0)} hint={`${f?.utilisationPercent ?? 0}% spent`} />
        <Stat label="Projects" value={num(ngo.projects?.length ?? 0)} />
        <Stat label="People helped" value={num(ngo.beneficiaryCount ?? 0)} />
      </div>

      <Card>
        <H2>Government check</H2>
        {ngo.govVerification ? (
          <>
            <ul className="mb-4 space-y-2 text-sm">
              {[
                ['Registration number', ngo.govVerification.regNumStatus],
                ['PAN', ngo.govVerification.panStatus],
                ['12A exemption', ngo.govVerification.cert12AStatus],
                ['80G deduction', ngo.govVerification.cert80GStatus]
              ].map(([label, s]) => (
                <li key={label} className="flex items-center justify-between">
                  <span className="text-slate-600">{label}</span>
                  <Badge tone={s === 'VERIFIED' ? 'green' : 'red'}>{s === 'VERIFIED' ? 'Confirmed' : 'Not confirmed'}</Badge>
                </li>
              ))}
            </ul>
            <p className="mb-3 text-sm text-slate-600">{ngo.govVerification.notes}</p>
          </>
        ) : (
          <p className="mb-3 text-sm text-slate-600">
            You have not run the check yet. It compares your registration number, PAN, 12A and 80G against government records.
          </p>
        )}
        <Btn onClick={runGovCheck} loading={busy}>Run the check</Btn>
      </Card>

      {ngo.alerts && ngo.alerts.length > 0 && (
        <Card>
          <H2>Open risk flags</H2>
          <ul className="space-y-3">
            {ngo.alerts.filter(a => a.status !== 'RESOLVED').map(a => (
              <li key={a.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center justify-between">
                  <Badge tone={a.riskLevel === 'HIGH' ? 'red' : 'amber'}>{a.riskLevel} risk</Badge>
                  <span className="text-xs text-slate-500">{date(a.date)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-800">{a.reason}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* -- Documents ----------------------------------------------------------- */

const DOC_TYPES = [
  ['REGISTRATION', 'Registration certificate'],
  ['PAN', 'PAN card'],
  ['12A', '12A certificate'],
  ['80G', '80G certificate'],
  ['AUDIT_REPORT', 'Audited financial statement'],
  ['ANNUAL_REPORT', 'Annual report'],
  ['BANK_DOC', 'Bank document']
];

function Documents({ ngo, reload }: { ngo: Ngo; reload: () => void }) {
  const toast = useToast();
  const [docType, setDocType] = useState('AUDIT_REPORT');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState<Record<string, { isIntegrityValid: boolean; message: string }>>({});

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/documents', { docType, fileName, content: `${fileName}|${Date.now()}` });
      toast('Document uploaded. An auditor will review it.', 'success');
      setFileName('');
      reload();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (id: string) => {
    try {
      const r = await api.post<{ isIntegrityValid: boolean; message: string }>(`/documents/${id}/verify-integrity`);
      setCheck(c => ({ ...c, [id]: r }));
      toast(r.message, r.isIntegrityValid ? 'success' : 'error');
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <H2>Upload a document</H2>
        <form onSubmit={upload} className="grid gap-3 sm:grid-cols-[1fr,1fr,auto] sm:items-end">
          <Field label="Type">
            <Select value={docType} onChange={e => setDocType(e.target.value)}>
              {DOC_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="File name">
            <Input required value={fileName} onChange={e => setFileName(e.target.value)} placeholder="Audit_Report_2026.pdf" />
          </Field>
          <Btn type="submit" loading={busy}>Upload</Btn>
        </form>
      </Card>

      {(!ngo.documents || ngo.documents.length === 0) ? (
        <Empty title="No documents yet" body="Upload your registration certificate and latest audit report to start the verification process." />
      ) : (
        <Card>
          <H2>Your documents</H2>
          <ul className="divide-y divide-slate-100">
            {ngo.documents.map(d => (
              <li key={d.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{d.fileName}</p>
                    <p className="text-xs text-slate-500">{d.docType.replace(/_/g, ' ').toLowerCase()} · uploaded {date(d.uploadDate)}</p>
                    <p className="mt-1 font-mono text-[11px] text-slate-400">SHA-256 {d.hash.slice(0, 24)}…</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={d.status} />
                    <Btn variant="secondary" onClick={() => verify(d.id)}>Check it is unchanged</Btn>
                  </div>
                </div>

                {d.reviewNotes && (
                  <div className="mt-2"><Alert tone="warning">Auditor: {d.reviewNotes}</Alert></div>
                )}
                {check[d.id] && (
                  <div className="mt-2">
                    <Alert tone={check[d.id].isIntegrityValid ? 'success' : 'error'}>{check[d.id].message}</Alert>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* -- Projects ------------------------------------------------------------ */

function Projects({ ngo, reload }: { ngo: Ngo; reload: () => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: 'Education',
    location: '', budget: '500000', expectedBeneficiaries: '250', lat: '', lng: ''
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/projects', {
        ...form,
        budget: Number(form.budget),
        expectedBeneficiaries: Number(form.expectedBeneficiaries),
        lat: form.lat || undefined,
        lng: form.lng || undefined
      });
      toast('Project added. Goals were suggested automatically from your description.', 'success');
      setOpen(false);
      setForm({ title: '', description: '', category: 'Education', location: '', budget: '500000', expectedBeneficiaries: '250', lat: '', lng: '' });
      reload();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Btn onClick={() => setOpen(o => !o)}>{open ? 'Cancel' : 'Add a project'}</Btn>
      </div>

      {open && (
        <Card>
          <H2>New project</H2>
          <form onSubmit={create} className="space-y-4">
            <Field label="Title">
              <Input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Digital literacy for rural schools" />
            </Field>
            <Field label="What will you do?" hint="We read this to suggest the right UN goals automatically.">
              <Textarea required rows={3} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cause">
                <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {['Education', 'Healthcare', 'Nutrition', 'Environment', 'Women Empowerment', 'Rural Development'].map(c =>
                    <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Where">
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Village, district" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Budget (₹)">
                <Input type="number" min="1" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
              </Field>
              <Field label="People you aim to help">
                <Input type="number" min="1" value={form.expectedBeneficiaries}
                  onChange={e => setForm(f => ({ ...f, expectedBeneficiaries: e.target.value }))} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Latitude" hint="Optional. Lets us check your photos were taken on site.">
                <Input value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} placeholder="30.3411" />
              </Field>
              <Field label="Longitude" hint="Optional.">
                <Input value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} placeholder="77.7812" />
              </Field>
            </div>
            <Btn type="submit" loading={busy} className="w-full">Add project</Btn>
          </form>
        </Card>
      )}

      {(!ngo.projects || ngo.projects.length === 0) ? (
        <Empty title="No projects yet" body="Add your first project so donors can support specific work." />
      ) : (
        <div className="space-y-4">
          {ngo.projects.map(p => <ProjectRow key={p.id} project={p} reload={reload} />)}
        </div>
      )}
    </div>
  );
}

function ProjectRow({ project, reload }: { project: Project; reload: () => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ caption: '', imageUrl: '', lat: '', lng: '', phase: 'PROGRESS' });

  const addEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post<{ message: string; geoStatus: string }>(`/projects/${project.id}/evidence`, {
        ...form, lat: Number(form.lat), lng: Number(form.lng)
      });
      toast(r.message, r.geoStatus === 'MISMATCH' ? 'error' : 'success');
      setForm({ caption: '', imageUrl: '', lat: '', lng: '', phase: 'PROGRESS' });
      setOpen(false);
      reload();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{project.title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{project.location}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="blue">{project.category}</Badge>
          <StatusBadge status={project.status} />
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-slate-500">Budget</dt><dd className="font-semibold">{shortMoney(project.budget)}</dd></div>
        <div><dt className="text-xs text-slate-500">Target</dt><dd className="font-semibold">{num(project.expectedBeneficiaries)}</dd></div>
        <div><dt className="text-xs text-slate-500">Reached</dt><dd className="font-semibold">{num(project.actualBeneficiaries)}</dd></div>
        <div><dt className="text-xs text-slate-500">Photos</dt><dd className="font-semibold">{project.evidence?.length ?? 0}</dd></div>
      </dl>

      <Btn variant="ghost" className="mt-2 px-0" onClick={() => setOpen(o => !o)}>
        {open ? 'Cancel' : 'Add a photo from the field'}
      </Btn>

      {open && (
        <form onSubmit={addEvidence} className="mt-3 space-y-3 rounded-lg border border-slate-200 p-4">
          <Field label="Caption">
            <Input required value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
              placeholder="What does this photo show?" />
          </Field>
          <Field label="Photo link">
            <Input required value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://…" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Latitude"><Input required value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} /></Field>
            <Field label="Longitude"><Input required value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} /></Field>
            <Field label="Stage">
              <Select value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value }))}>
                <option value="BEFORE">Before</option>
                <option value="PROGRESS">In progress</option>
                <option value="AFTER">After</option>
              </Select>
            </Field>
          </div>
          <Btn type="submit" loading={busy}>Add photo</Btn>
        </form>
      )}

      {project.evidence && project.evidence.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {project.evidence.map(e => (
            <figure key={e.id} className="overflow-hidden rounded-lg border border-slate-200">
              <img src={e.imageUrl} alt={e.caption} loading="lazy" className="h-24 w-full bg-slate-100 object-cover" />
              <figcaption className="p-2">
                <p className="truncate text-xs font-medium">{e.caption}</p>
                <div className="mt-1"><StatusBadge status={e.geoStatus} /></div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </Card>
  );
}

/* -- People helped ------------------------------------------------------- */

function People({ ngo, reload }: { ngo: Ngo; reload: () => void }) {
  const toast = useToast();
  const { data, reload: reloadList } = useLoad(() => api.get<Beneficiary[]>('/beneficiaries'));
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [form, setForm] = useState({
    projectId: '', name: '', age: '12', gender: 'Female', location: '', supportType: ''
  });

  const projects = ngo.projects ?? [];

  const add = async (e: React.FormEvent, force = false) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/beneficiaries', {
        ...form,
        projectId: form.projectId || projects[0]?.id,
        age: Number(form.age),
        confirmNotDuplicate: force
      });
      toast('Person added.', 'success');
      setWarning(null);
      setForm({ projectId: form.projectId, name: '', age: '12', gender: 'Female', location: '', supportType: '' });
      reloadList();
      reload();
    } catch (err: any) {
      // 409 means we found a likely duplicate and are asking before saving.
      if (err.status === 409) setWarning(err.message);
      else toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (projects.length === 0) {
    return <Empty title="Add a project first" body="People helped are recorded against a project." />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <H2>Record a person you helped</H2>
        <p className="mb-4 text-sm text-slate-600">
          Each person gets a unique ID. We check the name, age, gender and location against every
          existing record — including other organisations — so nobody is counted twice.
        </p>

        {warning && (
          <div className="mb-4">
            <Alert tone="warning">
              <p className="font-semibold">This looks like someone already recorded.</p>
              <p className="mt-1">{warning}</p>
              <div className="mt-3 flex gap-2">
                <Btn variant="secondary" onClick={() => setWarning(null)}>Let me change it</Btn>
                <Btn variant="danger" onClick={e => add(e as any, true)} loading={busy}>
                  Add anyway — different person
                </Btn>
              </div>
            </Alert>
          </div>
        )}

        <form onSubmit={e => add(e)} className="space-y-4">
          <Field label="Project">
            <Select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name">
              <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Age">
              <Input type="number" min="0" max="120" required value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
            </Field>
            <Field label="Gender">
              <Select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option>Female</option><option>Male</option><option>Other</option><option>Not stated</option>
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Village or area">
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </Field>
            <Field label="What they received">
              <Input value={form.supportType} onChange={e => setForm(f => ({ ...f, supportType: e.target.value }))}
                placeholder="e.g. Tablet and book kit" />
            </Field>
          </div>

          <Btn type="submit" loading={busy}>Add person</Btn>
        </form>
      </Card>

      {(!data || data.length === 0) ? (
        <Empty title="Nobody recorded yet" body="Add the people your projects have helped." />
      ) : (
        <Card>
          <H2>{num(data.length)} recorded</H2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-3">ID</th><th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Project</th><th className="py-2">Duplicate check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map(b => (
                  <tr key={b.id}>
                    <td className="py-2 pr-3 font-mono text-xs">{b.beneficiaryCode}</td>
                    <td className="py-2 pr-3 font-medium text-slate-900">{b.name}<span className="block text-xs text-slate-500">{b.age}, {b.gender}</span></td>
                    <td className="py-2 pr-3 text-slate-600">{b.project?.title}</td>
                    <td className="py-2">
                      {b.duplicateRisk === 'LOW'
                        ? <Badge tone="green">Unique</Badge>
                        : <><Badge tone={b.duplicateRisk === 'HIGH' ? 'red' : 'amber'}>{b.duplicateRisk} risk</Badge>
                            <span className="mt-1 block text-xs text-slate-500">{b.duplicateDetails}</span></>}
                    </td>
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

/* -- Money --------------------------------------------------------------- */

function Money({ ngo, reload }: { ngo: Ngo; reload: () => void }) {
  const toast = useToast();
  const { data: expenses, reload: reloadExpenses } = useLoad(() => api.get<any[]>('/expenses'));
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ projectId: '', category: '', amount: '', description: '', receiptUrl: '' });

  const projects = ngo.projects ?? [];
  const f = ngo.finance;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/expenses', {
        ...form,
        projectId: form.projectId || projects[0]?.id,
        amount: Number(form.amount)
      });
      toast('Expense recorded.', 'success');
      setForm({ projectId: form.projectId, category: '', amount: '', description: '', receiptUrl: '' });
      reloadExpenses();
      reload();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {f && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Received" value={money(f.totalReceived)} />
          <Stat label="Spent" value={money(f.totalSpent)} hint={`${f.utilisationPercent}% of what you received`} />
          <Stat label="Remaining" value={money(f.remaining)} />
        </div>
      )}

      {projects.length === 0 ? (
        <Empty title="Add a project first" body="Expenses are recorded against a project so donors can see where their money went." />
      ) : (
        <Card>
          <H2>Record an expense</H2>
          <form onSubmit={add} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Project">
                <Select value={form.projectId} onChange={e => setForm(f2 => ({ ...f2, projectId: e.target.value }))}>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </Select>
              </Field>
              <Field label="Category">
                <Input required value={form.category} onChange={e => setForm(f2 => ({ ...f2, category: e.target.value }))}
                  placeholder="e.g. Equipment" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Amount (₹)">
                <Input type="number" min="1" required value={form.amount}
                  onChange={e => setForm(f2 => ({ ...f2, amount: e.target.value }))} />
              </Field>
              <Field label="Receipt link" hint="Optional but strongly recommended.">
                <Input value={form.receiptUrl} onChange={e => setForm(f2 => ({ ...f2, receiptUrl: e.target.value }))} />
              </Field>
            </div>
            <Field label="What was it spent on?">
              <Input required value={form.description} onChange={e => setForm(f2 => ({ ...f2, description: e.target.value }))} />
            </Field>
            <Btn type="submit" loading={busy}>Record expense</Btn>
          </form>
        </Card>
      )}

      {expenses && expenses.length > 0 && (
        <Card>
          <H2>Recorded expenses</H2>
          <ul className="divide-y divide-slate-100">
            {expenses.map(x => (
              <li key={x.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium text-slate-900">{x.description}</p>
                  <p className="text-xs text-slate-500">{x.category} · {x.project?.title} · {date(x.date)}</p>
                </div>
                <span className="whitespace-nowrap font-semibold">{money(x.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
