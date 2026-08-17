import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Ngo, Project, Donation, money, shortMoney, num, date } from '../lib/api';
import {
  Card, H1, H2, Btn, Badge, Stat, ScoreDial, Empty, Field,
  Input, Select, Alert, Loading, useLoad, useToast
} from '../lib/ui';

const AMOUNTS = [500, 1000, 2500, 5000, 10000];

export function DonorHome() {
  const toast = useToast();
  const { data: ngos, loading } = useLoad(() => api.get<Ngo[]>('/ngos'));
  const { data: mine, reload: reloadMine } = useLoad(() => api.get<Donation[]>('/donations'));

  const [target, setTarget] = useState<Ngo | null>(null);
  const [detail, setDetail] = useState<Ngo | null>(null);
  const [projectId, setProjectId] = useState('');
  const [amount, setAmount] = useState('2500');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<{ txnId: string; blockNumber: number } | null>(null);

  const given = (mine ?? []).reduce((s, d) => s + d.amount, 0);

  const openDonate = async (ngo: Ngo) => {
    setTarget(ngo);
    setReceipt(null);
    setDetail(null);
    try {
      // The list response has no projects; fetch the profile to pick one.
      const full = await api.get<Ngo>(`/ngos/${ngo.id}`);
      setDetail(full);
      setProjectId(full.projects?.[0]?.id ?? '');
    } catch (e: any) {
      toast(e.message, 'error');
      setTarget(null);
    }
  };

  const give = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target || !projectId) return;
    setBusy(true);
    try {
      const r = await api.post<{ txnId: string; block: { blockNumber: number } }>('/donations', {
        ngoId: target.id, projectId, amount: Number(amount)
      });
      // Only shown after the server confirms — never on failure.
      setReceipt({ txnId: r.txnId, blockNumber: r.block.blockNumber });
      toast('Donation recorded.', 'success');
      reloadMine();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <H1 sub="Give to a verified organisation and follow exactly where the money goes.">
        Support a cause
      </H1>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="You have given" value={money(given)} />
        <Stat label="Donations made" value={num((mine ?? []).length)} />
        <Stat label="Organisations supported" value={num(new Set((mine ?? []).map(d => d.ngo?.id)).size)} />
      </div>

      {target && (
        <Card className="mb-8">
          {receipt ? (
            <>
              <Alert tone="success">Your donation was recorded on the ledger.</Alert>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Organisation</dt><dd className="font-semibold">{target.name}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Amount</dt><dd className="font-semibold">{money(Number(amount))}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Transaction</dt><dd className="font-mono text-xs">{receipt.txnId}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Record number</dt><dd className="font-semibold">#{receipt.blockNumber}</dd></div>
              </dl>
              <div className="mt-4 flex gap-2">
                <Btn variant="secondary" onClick={() => { setTarget(null); setReceipt(null); }}>Close</Btn>
                <Link to="/ledger" className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
                  See it on the ledger
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <H2>Give to {target.name}</H2>
                <Btn variant="ghost" onClick={() => setTarget(null)}>Cancel</Btn>
              </div>

              {!detail ? <Loading label="Loading projects…" /> : (detail.projects?.length ?? 0) === 0 ? (
                <Alert tone="warning">This organisation has not published any projects yet, so it cannot receive donations.</Alert>
              ) : (
                <form onSubmit={give} className="space-y-4">
                  <Field label="Which project?">
                    <Select value={projectId} onChange={e => setProjectId(e.target.value)}>
                      {detail.projects!.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </Select>
                  </Field>

                  <Field label="Amount">
                    <div className="mb-2 flex flex-wrap gap-2">
                      {AMOUNTS.map(a => (
                        <button key={a} type="button" onClick={() => setAmount(String(a))}
                          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                            amount === String(a) ? 'border-blue-700 bg-blue-50 text-blue-800' : 'border-slate-300 hover:bg-slate-50'
                          }`}>
                          {money(a)}
                        </button>
                      ))}
                    </div>
                    <Input type="number" min="1" required value={amount} onChange={e => setAmount(e.target.value)} />
                  </Field>

                  <Btn type="submit" loading={busy} className="w-full">Give {money(Number(amount) || 0)}</Btn>
                </form>
              )}
            </>
          )}
        </Card>
      )}

      <H2>Verified organisations</H2>
      {loading && <Loading />}
      {ngos && ngos.length === 0 && (
        <Empty title="No verified organisations yet" body="Once an auditor approves an organisation it will appear here." />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(ngos ?? []).map(ngo => (
          <Card key={ngo.id} className="flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-900">{ngo.name}</h3>
              <Badge tone="green">Verified</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500">{ngo.sector ?? ngo.areaOfWork}</p>
            <p className="mt-2 line-clamp-2 flex-1 text-sm text-slate-600">{ngo.mission}</p>
            <div className="mt-4"><ScoreDial score={ngo.transparencyScore} /></div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link to={`/ngos/${ngo.id}`} className="rounded-lg border border-slate-300 px-3 py-2.5 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50">
                Details
              </Link>
              <Btn onClick={() => openDonate(ngo)}>Give</Btn>
            </div>
          </Card>
        ))}
      </div>

      {mine && mine.length > 0 && (
        <Card className="mt-8">
          <H2>Your donations</H2>
          <ul className="divide-y divide-slate-100">
            {mine.map(d => (
              <li key={d.id} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium text-slate-900">{d.project?.title}</p>
                  <p className="text-xs text-slate-500">{d.ngo?.name} · {date(d.date)}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">{d.txnId}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-emerald-700">{money(d.amount)}</p>
                  {d.block && <Badge tone="grey">Record #{d.block.blockNumber}</Badge>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
