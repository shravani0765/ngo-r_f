import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  api, Ngo, Activity, Overview, Block, CAUSES,
  money, shortMoney, num, date, docLabel
} from '../lib/api';
import {
  Card, H1, H2, Btn, Badge, StatusBadge, Stat, Empty, Field,
  Input, Textarea, Select, Alert, Loading, useLoad, useToast
} from '../lib/ui';

/* -- Landing ------------------------------------------------------------- */

export function Home() {
  const { data: stats } = useLoad(() => api.get<Overview>('/analytics/overview'));
  const { data: ngos } = useLoad(() => api.get<Ngo[]>('/ngos'));
  const { data: gallery } = useLoad(() => api.get<Activity[]>('/gallery'));

  return (
    <>
      {/* Hero */}
      <section className="rounded-2xl bg-slate-900 px-6 py-12 text-white sm:px-10 sm:py-16">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Give with confidence. See where it goes.
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-300">
            Every organisation here has had its documents checked by a real person.
            Every donation is recorded, and every rupee can be traced.
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

      {/* How it works */}
      <section className="mt-12">
        <H2>How it works</H2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['1', 'Organisations register', 'They submit their details, identity documents and a government NGO certificate.'],
            ['2', 'An admin checks them', 'A real person reviews every document before an organisation appears publicly.'],
            ['3', 'Donors give directly', 'Pay by UPI to the organisation, and record the reference so it is traceable.'],
            ['4', 'Impact is shown', 'Organisations upload photos of the work, approved before they go public.']
          ].map(([n, title, body]) => (
            <Card key={n}>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-700 text-sm font-bold text-white">{n}</span>
              <p className="mt-3 font-semibold text-slate-900">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Statistics */}
      {stats?.hasData && (
        <section className="mt-12">
          <H2>Where things stand</H2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Verified organisations" value={num(stats.verifiedNgos)} />
            <Stat label="Donations tracked" value={shortMoney(stats.totalDonatedAmount)} />
            <Stat label="Ledger records" value={num(stats.ledgerRecords)} />
            <Stat label="Impact photos" value={num((gallery ?? []).length)} />
          </div>
        </section>
      )}

      {/* Verified NGOs */}
      <section className="mt-12">
        <div className="mb-3 flex items-center justify-between">
          <H2>Verified organisations</H2>
          <Link to="/directory" className="text-sm font-medium text-blue-700 hover:underline">See all</Link>
        </div>
        {(ngos ?? []).length === 0 ? (
          <Empty title="None verified yet" body="Organisations appear here once an admin approves them." />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {(ngos ?? []).slice(0, 3).map(n => <NgoCard key={n.id} ngo={n} />)}
          </div>
        )}
      </section>

      {/* Causes */}
      <section className="mt-12">
        <H2>Browse by cause</H2>
        <div className="flex flex-wrap gap-2">
          {CAUSES.map(c => (
            <Link key={c} to={`/gallery?category=${encodeURIComponent(c)}`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-blue-600 hover:text-blue-700">
              {c}
            </Link>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      {(gallery ?? []).length > 0 && (
        <section className="mt-12">
          <div className="mb-3 flex items-center justify-between">
            <H2>Recent work</H2>
            <Link to="/gallery" className="text-sm font-medium text-blue-700 hover:underline">See the gallery</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(gallery ?? []).slice(0, 3).map(a => <ActivityCard key={a.id} activity={a} />)}
          </div>
        </section>
      )}
    </>
  );
}

function NgoCard({ ngo }: { ngo: Ngo }) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-100 text-sm font-bold text-blue-800">
            {ngo.name.slice(0, 2).toUpperCase()}
          </span>
          <h3 className="font-semibold text-slate-900">{ngo.name}</h3>
        </div>
        <Badge tone="green">Verified</Badge>
      </div>
      <p className="mt-2 text-xs text-slate-500">{ngo.city}, {ngo.state}</p>
      <p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-600">{ngo.description || ngo.mission}</p>
      {(ngo.causes ?? []).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(ngo.causes ?? []).slice(0, 3).map(c => <Badge key={c} tone="blue">{c}</Badge>)}
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link to={`/ngos/${ngo.id}`}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50">
          View impact
        </Link>
        <Link to="/donor"
          className="rounded-lg bg-blue-700 px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-800">
          Donate
        </Link>
      </div>
    </Card>
  );
}

function ActivityCard({ activity }: { activity: Activity }) {
  return (
    <Card className="flex flex-col p-0">
      <img src={`/api/activities/${activity.id}/image`} alt={activity.title} loading="lazy"
        className="h-44 w-full rounded-t-xl bg-slate-100 object-cover" />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">{activity.title}</h3>
          <Badge tone="blue">{activity.category}</Badge>
        </div>
        <p className="mt-1 line-clamp-3 flex-1 text-sm text-slate-600">{activity.description}</p>
        <p className="mt-3 text-xs text-slate-500">
          {activity.ngo?.name} · {date(activity.activityDate)}
        </p>
      </div>
    </Card>
  );
}

/* -- Directory ----------------------------------------------------------- */

export function Directory() {
  const [search, setSearch] = useState('');
  const [cause, setCause] = useState('');
  const [state, setState] = useState('');
  const [sort, setSort] = useState('recent');

  const { data, loading, error } = useLoad(
    () => api.get<Ngo[]>(`/ngos?${new URLSearchParams({ ...(search && { search }) })}`),
    [search]
  );

  const states = Array.from(new Set((data ?? []).map(n => n.state))).sort();

  const visible = (data ?? [])
    .filter(n => !cause || (n.causes ?? []).includes(cause))
    .filter(n => !state || n.state === state)
    .sort((a, b) => {
      if (sort === 'donations') return (b.totalReceived ?? 0) - (a.totalReceived ?? 0);
      if (sort === 'location') return a.state.localeCompare(b.state);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <>
      <H1 sub="Every organisation here has had its documents reviewed and approved by an admin.">
        Find an organisation
      </H1>

      <Card className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Search">
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or city" />
          </Field>
          <Field label="Cause">
            <Select value={cause} onChange={e => setCause(e.target.value)}>
              <option value="">All causes</option>
              {CAUSES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="State">
            <Select value={state} onChange={e => setState(e.target.value)}>
              <option value="">All states</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Sort by">
            <Select value={sort} onChange={e => setSort(e.target.value)}>
              <option value="recent">Recently registered</option>
              <option value="donations">Most donations</option>
              <option value="location">Location</option>
            </Select>
          </Field>
        </div>
      </Card>

      {loading && <Loading />}
      {error && <Alert tone="error">{error}</Alert>}

      {!loading && visible.length === 0 && (
        <Empty title="Nothing matches that search" body="Try a different word, or clear the filters." />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visible.map(n => <NgoCard key={n.id} ngo={n} />)}
      </div>
    </>
  );
}

/* -- Public impact gallery ----------------------------------------------- */

export function Gallery() {
  const [category, setCategory] = useState(
    new URLSearchParams(window.location.search).get('category') ?? ''
  );

  const { data, loading } = useLoad(
    () => api.get<Activity[]>(`/gallery?${new URLSearchParams({ ...(category && { category }) })}`),
    [category]
  );

  return (
    <>
      <H1 sub="Photos of real work, uploaded by verified organisations and approved before they appear here.">
        Impact gallery
      </H1>

      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => setCategory('')}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            !category ? 'border-blue-700 bg-blue-50 text-blue-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}>
          All
        </button>
        {CAUSES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              category === c ? 'border-blue-700 bg-blue-50 text-blue-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}>
            {c}
          </button>
        ))}
      </div>

      {loading && <Loading />}

      {!loading && (data ?? []).length === 0 && (
        <Empty title="No photos yet"
          body={category
            ? `No approved photos under "${category}". Try another cause.`
            : 'Once organisations upload photos and an admin approves them, they appear here.'} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map(a => <ActivityCard key={a.id} activity={a} />)}
      </div>
    </>
  );
}

/* -- NGO profile --------------------------------------------------------- */

export function NgoProfile() {
  const { id } = useParams<{ id: string }>();
  const { data: ngo, loading, error } = useLoad(() => api.get<Ngo>(`/ngos/${id}`), [id]);
  const { data: gallery } = useLoad(() => api.get<Activity[]>(`/gallery?ngoId=${id}`), [id]);

  if (loading) return <Loading />;
  if (error) return <Alert tone="error">{error}</Alert>;
  if (!ngo) return null;

  const f = ngo.finance;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{ngo.name}</h1>
            <StatusBadge status={ngo.status} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {ngo.presidentName && `${ngo.presidentName} · `}{ngo.city}, {ngo.state}
          </p>
        </div>
        <Link to="/donor" className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800">
          Donate
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <H2>About</H2>
            <p className="text-sm leading-relaxed text-slate-700">{ngo.description || ngo.mission}</p>
            {(ngo.causes ?? []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(ngo.causes ?? []).map(c => <Badge key={c} tone="blue">{c}</Badge>)}
              </div>
            )}
          </Card>

          {f && f.totalReceived > 0 && (
            <Card>
              <H2>Money received</H2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div><p className="text-xs text-slate-500">Received</p><p className="text-xl font-bold">{money(f.totalReceived)}</p></div>
                <div><p className="text-xs text-slate-500">Spent</p><p className="text-xl font-bold text-emerald-700">{money(f.totalSpent)}</p></div>
                <div><p className="text-xs text-slate-500">Remaining</p><p className="text-xl font-bold text-blue-700">{money(f.remaining)}</p></div>
              </div>
            </Card>
          )}

          <div>
            <H2>Work they have done</H2>
            {(gallery ?? []).length === 0 ? (
              <Empty title="No photos yet" body="This organisation has not published any activity photos." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {(gallery ?? []).map(a => <ActivityCard key={a.id} activity={a} />)}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <H2>Details</H2>
            <dl className="space-y-2 text-sm">
              {[
                ['Registration', ngo.regNum],
                ['Head', ngo.presidentName],
                ['Email', ngo.email],
                ['Phone', ngo.phone],
                ['Established', ngo.establishedYear ? String(ngo.establishedYear) : '']
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-medium text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Documents appear only for the owner or an admin — the public
              payload does not contain them at all. */}
          {(ngo.documents ?? []).length > 0 && (
            <Card>
              <H2>Documents on file</H2>
              <ul className="space-y-2 text-sm">
                {ngo.documents!.map(d => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <span className="text-slate-700">{docLabel(d.docType)}</span>
                    <StatusBadge status={d.status} />
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

/* -- Fund records -------------------------------------------------------- */

export function Ledger() {
  const toast = useToast();
  const { data, loading } = useLoad(() => api.get<Block[]>('/ledger'));
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ isValid: boolean; message: string } | null>(null);

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
            Each confirmed donation is written to a record linked to the one before it.
            Changing any past record breaks the chain — check it yourself.
          </p>
        </div>
        <Btn onClick={verify} loading={checking}>Check records</Btn>
      </div>

      {result && (
        <div className="mb-6">
          <Alert tone={result.isValid ? 'success' : 'error'}>{result.message}</Alert>
        </div>
      )}

      {loading && <Loading />}

      {!loading && (data ?? []).length === 0 && (
        <Empty title="No donations recorded yet" body="Confirmed donations appear here." />
      )}

      <div className="space-y-3">
        {(data ?? []).map(b => (
          <Card key={b.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{b.ngo?.name}</p>
                <p className="text-xs text-slate-500">{date(b.timestamp)}</p>
                <p className="mt-1 break-all font-mono text-[11px] text-slate-400">{b.currentHash}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-700">{money(b.amount)}</p>
                <Badge tone="grey">Record #{b.blockNumber}</Badge>
              </div>
            </div>
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
      <H1 sub="Nothing about you is recorded — no name, no account. Keep the tracking code to follow what happens.">
        Report a concern
      </H1>

      {done ? (
        <Card>
          <Alert tone="success">Your report has been received and sent to an admin.</Alert>
          <p className="mt-4 text-sm text-slate-600">Save this code — it is the only way to follow up:</p>
          <p className="mt-2 rounded-lg bg-slate-100 p-3 text-center font-mono text-lg font-bold text-slate-900">
            {done.trackingCode}
          </p>
          <Btn variant="secondary" className="mt-4 w-full"
            onClick={() => { setDone(null); setForm({ category: 'Financial Misuse', description: '' }); }}>
            Report something else
          </Btn>
        </Card>
      ) : (
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <Field label="What kind of problem is it?">
              <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="Financial Misuse">Money is being misused</option>
                <option value="Fake Beneficiaries">People helped are made up</option>
                <option value="Fake Documents">Documents look forged</option>
                <option value="Location Fraud">Work is not happening where claimed</option>
                <option value="Other">Something else</option>
              </Select>
            </Field>
            <Field label="What did you see?" hint="At least 20 characters. Include places and dates if you can.">
              <Textarea rows={5} required minLength={20} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
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
            <Alert tone="info">
              <span className="font-semibold">{status.status.replace(/_/g, ' ').toLowerCase()}</span> — {status.explanation}
            </Alert>
          </div>
        )}
      </Card>
    </div>
  );
}

/* -- API docs ------------------------------------------------------------ */

export function ApiDocs() {
  const endpoints = [
    ['GET', '/api/public/ngos', 'Verified organisations.'],
    ['GET', '/api/public/gallery', 'Approved impact photos.'],
    ['GET', '/api/public/ledger', 'The donation record chain.'],
    ['GET', '/api/public/statistics', 'Aggregate figures.'],
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
