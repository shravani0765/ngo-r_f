import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  api, Ngo, Project, Block, Overview, CommunityReport,
  money, shortMoney, num, date, parseSdgs
} from '../lib/api';
import {
  Card, H1, H2, Btn, Badge, StatusBadge, Stat, ScoreDial, Empty, Field,
  Input, Textarea, Select, Alert, Loading, useLoad, useToast
} from '../lib/ui';

/* -- Home ---------------------------------------------------------------- */

export function Home() {
  const { data } = useLoad(() => api.get<Overview>('/analytics/overview'));

  return (
    <>
      <section className="rounded-2xl bg-slate-900 px-6 py-12 text-white sm:px-10 sm:py-16">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            See exactly where donations go.
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-300">
            Every organisation here has had its registration and documents checked. Every
            donation is written to a record that anyone can re-verify.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/directory" className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              Find an organisation
            </Link>
            <Link to="/register" className="rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
              Register your NGO
            </Link>
          </div>
        </div>
      </section>

      {data && data.hasData && (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Verified NGOs" value={num(data.verifiedNgos)} hint="Registration and documents checked" />
          <Stat label="Funds tracked" value={shortMoney(data.totalDonatedAmount)} hint={`${data.ledgerRecords} linked records`} />
          <Stat label="People reached" value={num(data.totalBeneficiaries)} hint="Each with a unique ID" />
          <Stat label="Projects" value={num(data.totalProjects)} hint={`${data.activeProjects} running now`} />
        </section>
      )}

      <section className="mt-12">
        <H2>How it works</H2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['1', 'NGOs register', 'They submit registration, PAN, 12A and 80G details plus supporting documents.'],
            ['2', 'We check', 'An automated government check runs, then a human auditor reviews the documents.'],
            ['3', 'Donations are traced', 'Each donation is written to a linked record with the money in and out shown.'],
            ['4', 'Impact is evidenced', 'NGOs upload geo-tagged photos, and the community can confirm or dispute them.']
          ].map(([n, title, body]) => (
            <Card key={n}>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-700 text-sm font-bold text-white">{n}</span>
              <p className="mt-3 font-semibold text-slate-900">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}

/* -- Directory ----------------------------------------------------------- */

export function Directory() {
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const { data, loading, error } = useLoad(
    () => api.get<Ngo[]>(`/ngos?${new URLSearchParams({ ...(search && { search }), ...(state && { state }) })}`),
    [search, state]
  );

  const states = Array.from(new Set((data ?? []).map(n => n.state))).sort();

  return (
    <>
      <H1 sub="Every organisation listed here has passed a government registration check and had its documents reviewed by an auditor.">
        Find an organisation
      </H1>

      <Card className="mb-6">
        <div className="grid gap-3 sm:grid-cols-[2fr,1fr]">
          <Field label="Search by name or cause">
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="e.g. education, Hope Foundation" />
          </Field>
          <Field label="State">
            <Select value={state} onChange={e => setState(e.target.value)}>
              <option value="">All states</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      {loading && <Loading />}
      {error && <Alert tone="error">{error}</Alert>}

      {data && data.length === 0 && (
        <Empty title="Nothing matches that search"
          body="Try a different word, or clear the filters to see every verified organisation." />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map(ngo => (
          <Card key={ngo.id} className="flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-900">{ngo.name}</h3>
              <StatusBadge status={ngo.status} />
            </div>
            <p className="mt-1 text-xs text-slate-500">{ngo.district}, {ngo.state}</p>
            <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">{ngo.mission}</p>

            <div className="mt-4"><ScoreDial score={ngo.transparencyScore} /></div>

            <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-sm">
              <div><dt className="text-xs text-slate-500">Received</dt><dd className="font-semibold">{shortMoney(ngo.totalReceived ?? 0)}</dd></div>
              <div><dt className="text-xs text-slate-500">Projects</dt><dd className="font-semibold">{ngo.projectCount ?? 0}</dd></div>
            </dl>

            <Link to={`/ngos/${ngo.id}`} className="mt-4 rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50">
              View details
            </Link>
          </Card>
        ))}
      </div>
    </>
  );
}

/* -- NGO profile --------------------------------------------------------- */

export function NgoProfile() {
  const { id } = useParams<{ id: string }>();
  const { data: ngo, loading, error } = useLoad(() => api.get<Ngo>(`/ngos/${id}`), [id]);

  if (loading) return <Loading />;
  if (error) return <Alert tone="error">{error}</Alert>;
  if (!ngo) return null;

  const f = ngo.finance;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{ngo.name}</h1>
            <StatusBadge status={ngo.status} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Registration {ngo.regNum} · {ngo.district}, {ngo.state}
          </p>
        </div>
        <Link to="/donor" className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800">
          Support this organisation
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <H2>About</H2>
            <p className="text-sm leading-relaxed text-slate-700">{ngo.mission}</p>
            <p className="mt-3 text-sm text-slate-600"><span className="font-medium">Works on:</span> {ngo.areaOfWork}</p>
          </Card>

          {f && (
            <Card>
              <H2>Where the money is</H2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div><p className="text-xs text-slate-500">Received</p><p className="text-xl font-bold">{money(f.totalReceived)}</p></div>
                <div><p className="text-xs text-slate-500">Spent</p><p className="text-xl font-bold text-emerald-700">{money(f.totalSpent)}</p></div>
                <div><p className="text-xs text-slate-500">Remaining</p><p className="text-xl font-bold text-blue-700">{money(f.remaining)}</p></div>
              </div>
              <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-emerald-600" style={{ width: `${Math.min(100, f.utilisationPercent)}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-500">{f.utilisationPercent}% of money received has been spent and receipted.</p>
            </Card>
          )}

          <div>
            <H2>Projects</H2>
            {(!ngo.projects || ngo.projects.length === 0) ? (
              <Empty title="No projects yet" body="This organisation has not published any projects." />
            ) : (
              <div className="space-y-4">
                {ngo.projects.map(p => <ProjectCard key={p.id} project={p} />)}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card><ScoreDial score={ngo.transparencyScore} /></Card>

          <Card>
            <H2>Documents</H2>
            {(!ngo.documents || ngo.documents.length === 0) ? (
              <p className="text-sm text-slate-600">No documents uploaded yet.</p>
            ) : (
              <ul className="space-y-3">
                {ngo.documents.map(d => (
                  <li key={d.id} className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{d.fileName}</p>
                      <p className="font-mono text-[11px] text-slate-400">SHA-256 {d.hash.slice(0, 16)}…</p>
                    </div>
                    <StatusBadge status={d.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {ngo.govVerification && (
            <Card>
              <H2>Government check</H2>
              <ul className="space-y-2 text-sm">
                {[
                  ['Registration number', ngo.govVerification.regNumStatus],
                  ['PAN', ngo.govVerification.panStatus],
                  ['12A exemption', ngo.govVerification.cert12AStatus],
                  ['80G deduction', ngo.govVerification.cert80GStatus]
                ].map(([label, status]) => (
                  <li key={label} className="flex items-center justify-between">
                    <span className="text-slate-600">{label}</span>
                    <Badge tone={status === 'VERIFIED' ? 'green' : 'red'}>
                      {status === 'VERIFIED' ? 'Confirmed' : 'Not confirmed'}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const sdgs = parseSdgs(project.sdgGoals);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{project.title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{project.location}</p>
        </div>
        <Badge tone="blue">{project.category}</Badge>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-slate-600">{project.description}</p>

      {sdgs.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sdgs.map(s => <Badge key={s} tone="grey">{s}</Badge>)}
        </div>
      )}

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-sm">
        <div><dt className="text-xs text-slate-500">Budget</dt><dd className="font-semibold">{shortMoney(project.budget)}</dd></div>
        <div><dt className="text-xs text-slate-500">Target</dt><dd className="font-semibold">{num(project.expectedBeneficiaries)}</dd></div>
        <div><dt className="text-xs text-slate-500">Reached</dt><dd className="font-semibold">{num(project.actualBeneficiaries)}</dd></div>
      </dl>

      {project.evidence && project.evidence.length > 0 && (
        <>
          <Btn variant="ghost" className="mt-3 px-0" onClick={() => setOpen(o => !o)}>
            {open ? 'Hide' : 'Show'} {project.evidence.length} photo{project.evidence.length === 1 ? '' : 's'} from the field
          </Btn>
          {open && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {project.evidence.map(e => (
                <figure key={e.id} className="overflow-hidden rounded-lg border border-slate-200">
                  <img src={e.imageUrl} alt={e.caption} loading="lazy" className="h-32 w-full bg-slate-100 object-cover" />
                  <figcaption className="p-2">
                    <p className="text-xs font-medium text-slate-800">{e.caption}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge tone="grey">{e.phase.toLowerCase()}</Badge>
                      <StatusBadge status={e.geoStatus} />
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/* -- Impact -------------------------------------------------------------- */

export function Impact() {
  const { data, loading, error } = useLoad(() => api.get<Overview>('/analytics/overview'));

  if (loading) return <Loading />;
  if (error) return <Alert tone="error">{error}</Alert>;
  if (!data) return null;

  if (!data.hasData) {
    return (
      <>
        <H1>Impact across the platform</H1>
        <Empty title="No verified activity yet"
          body="Once organisations are verified and donations recorded, the totals will appear here. Nothing on this page is estimated." />
      </>
    );
  }

  return (
    <>
      <H1 sub="Every figure below is counted from live records. Nothing here is estimated.">
        Impact across the platform
      </H1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="People reached" value={num(data.totalBeneficiaries)} hint="Unique, de-duplicated IDs" />
        <Stat label="Verified NGOs" value={num(data.verifiedNgos)} hint={`of ${data.totalNgos} registered`} />
        <Stat label="Money tracked" value={shortMoney(data.totalDonatedAmount)} hint={`${data.utilisationPercent}% spent so far`} />
        <Stat label="Evidence photos" value={num(data.evidencePhotos)} hint={`${data.communityConfirmations} confirmed by locals`} />
      </div>

      {data.costPerBeneficiary !== null && (
        <Card className="mt-6">
          <H2>Cost per person reached</H2>
          <p className="text-3xl font-bold text-slate-900">{money(data.costPerBeneficiary)}</p>
          <p className="mt-1 text-sm text-slate-600">
            Total recorded spending divided by the number of people supported.
          </p>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <H2>Projects by cause</H2>
          {data.sectorDistribution.length === 0 ? (
            <p className="text-sm text-slate-600">No projects published yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.sectorDistribution.map(s => (
                <li key={s.sector}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-800">{s.sector}</span>
                    <span className="text-slate-600">{s.percentage}% ({s.projects})</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-blue-700" style={{ width: `${s.percentage}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <H2>Where organisations work</H2>
          {data.stateDistribution.length === 0 ? (
            <p className="text-sm text-slate-600">No verified organisations yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {data.stateDistribution.map(s => (
                <li key={s.state} className="flex justify-between py-2">
                  <span className="text-slate-700">{s.state}</span>
                  <span className="font-semibold">{s.organisations}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

/* -- Ledger -------------------------------------------------------------- */

export function Ledger() {
  const toast = useToast();
  const { data, loading, error } = useLoad(() => api.get<Block[]>('/ledger'));
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ isValid: boolean; message: string } | null>(null);
  const [showTech, setShowTech] = useState(false);

  const verify = async () => {
    setChecking(true);
    try {
      const r = await api.post<{ isValid: boolean; message: string }>('/ledger/verify');
      setResult(r);
      toast(r.isValid ? 'All records are intact.' : 'A problem was found.', r.isValid ? 'success' : 'error');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Fund records</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Each donation is written to a record linked to the one before it. Changing any past
            record breaks the chain — press the button to check for yourself.
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={() => setShowTech(s => !s)}>
            {showTech ? 'Hide' : 'Show'} technical detail
          </Btn>
          <Btn onClick={verify} loading={checking}>Check records</Btn>
        </div>
      </div>

      {result && (
        <div className="mb-6">
          <Alert tone={result.isValid ? 'success' : 'error'}>{result.message}</Alert>
        </div>
      )}

      {loading && <Loading />}
      {error && <Alert tone="error">{error}</Alert>}

      {data && data.length === 0 && (
        <Empty title="No donations recorded yet" body="Once a donation is made it will appear here." />
      )}

      <div className="space-y-3">
        {(data ?? []).map(b => (
          <Card key={b.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{b.project?.title ?? 'Donation'}</p>
                <p className="text-sm text-slate-600">{b.ngo?.name}</p>
                <p className="mt-1 text-xs text-slate-400">{date(b.timestamp)}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-700">{money(b.amount)}</p>
                <Badge tone="grey">Record #{b.blockNumber}</Badge>
              </div>
            </div>
            {showTech && (
              <dl className="mt-3 space-y-1 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-slate-300">
                <div><dt className="inline text-amber-400">Transaction: </dt><dd className="inline">{b.txnId}</dd></div>
                <div><dt className="inline text-amber-400">Previous: </dt><dd className="inline break-all">{b.prevHash}</dd></div>
                <div><dt className="inline text-blue-400">This record: </dt><dd className="inline break-all">{b.currentHash}</dd></div>
              </dl>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}

/* -- Report a concern ---------------------------------------------------- */

export function ReportConcern() {
  const toast = useToast();
  const [form, setForm] = useState({ category: 'Financial Misuse', description: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ trackingCode: string } | null>(null);
  const [lookup, setLookup] = useState('');
  const [status, setStatus] = useState<{ status: string; explanation: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      setDone(await api.post<{ trackingCode: string }>('/reports', form));
      toast('Your report was received.', 'success');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const track = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setStatus(await api.get(`/reports/track/${encodeURIComponent(lookup.trim())}`));
    } catch (err: any) {
      toast(err.message, 'error');
      setStatus(null);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <H1 sub="Nothing about you is recorded — no name, no account, no address. Keep the tracking code to follow what happens.">
        Report a concern
      </H1>

      {done ? (
        <Card>
          <Alert tone="success">Your report has been received and sent to an auditor.</Alert>
          <p className="mt-4 text-sm text-slate-600">Your tracking code — save this, it is the only way to follow up:</p>
          <p className="mt-2 rounded-lg bg-slate-100 p-3 text-center font-mono text-lg font-bold text-slate-900">{done.trackingCode}</p>
          <Btn variant="secondary" className="mt-4 w-full" onClick={() => { setDone(null); setForm({ category: 'Financial Misuse', description: '' }); }}>
            Report something else
          </Btn>
        </Card>
      ) : (
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <Field label="What kind of problem is it?">
              <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="Financial Misuse">Money is being misused</option>
                <option value="Fake Beneficiaries">People helped are made up or counted twice</option>
                <option value="Fake Documents">Documents or certificates look forged</option>
                <option value="Location Fraud">Work is not happening where they claim</option>
                <option value="Other">Something else</option>
              </Select>
            </Field>

            <Field label="What did you see?" hint="At least 20 characters. Include places, dates and names if you can.">
              <Textarea rows={5} required minLength={20} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe what happened…" />
            </Field>

            <Btn type="submit" loading={busy} className="w-full">Send report anonymously</Btn>
          </form>
        </Card>
      )}

      <Card className="mt-6">
        <H2>Check a report you sent</H2>
        <form onSubmit={track} className="flex gap-2">
          <Input value={lookup} onChange={e => setLookup(e.target.value)} placeholder="WB-2026-XXXXXXXX" />
          <Btn variant="secondary" type="submit">Check</Btn>
        </form>
        {status && (
          <div className="mt-3">
            <Alert tone="info"><span className="font-semibold">{status.status.replace(/_/g, ' ').toLowerCase()}</span> — {status.explanation}</Alert>
          </div>
        )}
      </Card>
    </div>
  );
}

/* -- API docs ------------------------------------------------------------ */

export function ApiDocs() {
  const endpoints = [
    ['GET', '/api/public/ngos', 'Verified organisations with transparency scores.'],
    ['GET', '/api/public/projects', 'Published projects with budgets and beneficiary counts.'],
    ['GET', '/api/public/ledger', 'The full donation record chain.'],
    ['GET', '/api/public/statistics', 'Aggregate impact figures.'],
    ['POST', '/api/reports', 'Submit an anonymous concern.']
  ];

  return (
    <>
      <H1 sub="Open, read-only endpoints returning JSON. No key needed.">Open data API</H1>
      <div className="space-y-3">
        {endpoints.map(([method, path, desc]) => (
          <Card key={path}>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={method === 'GET' ? 'blue' : 'green'}>{method}</Badge>
              <code className="font-mono text-sm font-semibold text-slate-900">{path}</code>
            </div>
            <p className="mt-2 text-sm text-slate-600">{desc}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
