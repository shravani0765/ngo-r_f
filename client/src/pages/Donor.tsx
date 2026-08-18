import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Ngo, Donation, PayTo, CAUSES, money, shortMoney, num, date } from '../lib/api';
import {
  Card, H1, H2, Btn, Badge, StatusBadge, Stat, Empty, Field, Stepper,
  Input, Select, Alert, Loading, Modal, useLoad, useToast
} from '../lib/ui';

const AMOUNTS = [500, 1000, 2500, 5000, 10000];
const STEPS = ['Cause', 'Amount', 'Pay', 'Confirm'];

export function DonorHome() {
  const [search, setSearch] = useState('');
  const [cause, setCause] = useState('');
  const [sort, setSort] = useState('recent');

  const { data: ngos, loading } = useLoad(
    () => api.get<Ngo[]>(`/ngos?${new URLSearchParams({ ...(search && { search }) })}`),
    [search]
  );
  const { data: mine, reload: reloadMine } = useLoad(() => api.get<Donation[]>('/donations'));

  const [target, setTarget] = useState<Ngo | null>(null);

  const successful = (mine ?? []).filter(d => d.paymentStatus === 'SUCCESSFUL');
  const given = successful.reduce((s, d) => s + d.amount, 0);
  const pending = (mine ?? []).filter(d => d.paymentStatus === 'PENDING');

  const visible = (ngos ?? [])
    .filter(n => !cause || (n.causes ?? []).includes(cause))
    .sort((a, b) => {
      if (sort === 'donations') return (b.totalReceived ?? 0) - (a.totalReceived ?? 0);
      if (sort === 'location') return a.state.localeCompare(b.state);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <>
      <H1 sub="Give to a verified organisation and follow exactly where the money goes.">
        Support a cause
      </H1>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="You have given" value={money(given)} />
        <Stat label="Donations" value={num(successful.length)} />
        <Stat label="Organisations supported" value={num(new Set(successful.map(d => d.ngo?.id)).size)} />
      </div>

      {pending.length > 0 && (
        <div className="mb-8">
          <Alert tone="warning">
            <p className="font-semibold">
              You have {pending.length} donation{pending.length > 1 ? 's' : ''} waiting to be confirmed.
            </p>
            <p className="mt-1">Enter the UPI reference number so the organisation can see the payment.</p>
            <ul className="mt-3 space-y-2">
              {pending.map(d => (
                <li key={d.id}>
                  <PendingRow donation={d} onDone={reloadMine} />
                </li>
              ))}
            </ul>
          </Alert>
        </div>
      )}

      <Card className="mb-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Search">
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Name, city or cause" />
          </Field>
          <Field label="Cause">
            <Select value={cause} onChange={e => setCause(e.target.value)}>
              <option value="">All causes</option>
              {CAUSES.map(c => <option key={c} value={c}>{c}</option>)}
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

      {!loading && visible.length === 0 && (
        <Empty title="No organisations match"
          body="Try a different search, or clear the filters to see everyone." />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visible.map(ngo => (
          <Card key={ngo.id} className="flex flex-col">
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

            <p className="mt-3 text-xs text-slate-500">
              Received so far: <span className="font-semibold text-slate-800">{shortMoney(ngo.totalReceived ?? 0)}</span>
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link to={`/ngos/${ngo.id}`}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50">
                View impact
              </Link>
              <Btn onClick={() => setTarget(ngo)}>Donate</Btn>
            </div>
          </Card>
        ))}
      </div>

      {target && <DonateFlow ngo={target} onClose={() => { setTarget(null); reloadMine(); }} />}

      {successful.length > 0 && (
        <Card className="mt-8">
          <H2>Your donations</H2>
          <ul className="divide-y divide-slate-100">
            {successful.map(d => (
              <li key={d.id} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium text-slate-900">{d.ngo?.name}</p>
                  <p className="text-xs text-slate-500">{d.category} · {date(d.date)}</p>
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

/** Inline confirm for a donation that was started but never confirmed. */
function PendingRow({ donation, onDone }: { donation: Donation; onDone: () => void }) {
  const toast = useToast();
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await api.post(`/donations/${donation.id}/confirm`, { referenceId: reference.trim() });
      toast('Donation confirmed. Thank you.', 'success');
      onDone();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-2">
      <span className="text-sm font-medium">{money(donation.amount)} → {donation.ngo?.name}</span>
      <Input className="max-w-[14rem]" value={reference} onChange={e => setReference(e.target.value)}
        placeholder="UPI reference number" />
      <Btn onClick={confirm} loading={busy} disabled={reference.trim().length < 6}>Confirm</Btn>
    </div>
  );
}

/* -- Donation flow -------------------------------------------------------- */

function DonateFlow({ ngo, onClose }: { ngo: Ngo; onClose: () => void }) {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [cause, setCause] = useState((ngo.causes ?? [])[0] ?? 'Other');
  const [amount, setAmount] = useState('1000');
  const [started, setStarted] = useState<{ donation: Donation; payTo: PayTo } | null>(null);
  const [reference, setReference] = useState('');
  const [done, setDone] = useState<{ blockNumber: number } | null>(null);

  const value = Number(amount) || 0;

  const start = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ donation: Donation; payTo: PayTo }>('/donations', {
        ngoId: ngo.id, amount: value, category: cause
      });
      setStarted(r);
      setStep(2);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!started) return;
    setBusy(true);
    try {
      const r = await api.post<{ blockNumber: number }>(
        `/donations/${started.donation.id}/confirm`,
        { referenceId: reference.trim() }
      );
      setDone(r);
      setStep(3);
      toast('Donation recorded. Thank you.', 'success');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Donate to ${ngo.name}`} onClose={onClose}>
      <Stepper steps={STEPS} current={step} />

      {step === 0 && (
        <div className="space-y-4">
          <Field label="What should this go towards?">
            <Select value={cause} onChange={e => setCause(e.target.value)}>
              {((ngo.causes ?? []).length ? ngo.causes! : [...CAUSES]).map(c =>
                <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Btn className="w-full" onClick={() => setStep(1)}>Continue</Btn>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Field label="How much?">
            <div className="mb-2 flex flex-wrap gap-2">
              {AMOUNTS.map(a => (
                <button key={a} type="button" onClick={() => setAmount(String(a))}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    amount === String(a)
                      ? 'border-blue-700 bg-blue-50 text-blue-800'
                      : 'border-slate-300 hover:bg-slate-50'
                  }`}>
                  {money(a)}
                </button>
              ))}
            </div>
            <Input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} />
          </Field>

          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => setStep(0)}>Back</Btn>
            <Btn className="flex-1" onClick={start} loading={busy} disabled={value <= 0}>
              Continue to payment
            </Btn>
          </div>
        </div>
      )}

      {step === 2 && started && (
        <div className="space-y-4">
          <dl className="rounded-lg bg-slate-50 p-3 text-sm">
            <div className="flex justify-between py-1">
              <dt className="text-slate-500">Donating to</dt>
              <dd className="font-semibold">{ngo.name}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-slate-500">Purpose</dt>
              <dd className="font-semibold">{cause}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-slate-500">Amount</dt>
              <dd className="font-semibold text-emerald-700">{money(value)}</dd>
            </div>
          </dl>

          <div className="rounded-lg border border-slate-200 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pay using UPI</p>

            {started.payTo.upiId && (
              <p className="mt-2 select-all font-mono text-base font-bold text-slate-900">
                {started.payTo.upiId}
              </p>
            )}

            {started.payTo.qrCodeAvailable && (
              <img src={`/api/ngos/${ngo.id}/qr`} alt="UPI QR code"
                className="mx-auto mt-3 h-44 w-44 rounded-lg border border-slate-200 object-contain" />
            )}

            {!started.payTo.upiId && !started.payTo.qrCodeAvailable && (
              <Alert tone="warning">This organisation has not added payment details yet.</Alert>
            )}
          </div>

          <Field label="UPI reference number"
            hint="After paying, your app shows a reference or UTR number. Paste it here.">
            <Input value={reference} onChange={e => setReference(e.target.value)}
              placeholder="e.g. 402812345678" />
          </Field>

          <Btn className="w-full" onClick={confirm} loading={busy}
            disabled={reference.trim().length < 6}>
            I have paid — record my donation
          </Btn>
          <p className="text-center text-xs text-slate-500">
            You can also close this and confirm later from your dashboard.
          </p>
        </div>
      )}

      {step === 3 && done && (
        <div className="space-y-4 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
          <div>
            <p className="text-lg font-bold text-slate-900">Thank you</p>
            <p className="mt-1 text-sm text-slate-600">
              Your donation of {money(value)} to {ngo.name} is recorded.
            </p>
          </div>
          <dl className="rounded-lg bg-slate-50 p-3 text-left text-sm">
            <div className="flex justify-between py-1">
              <dt className="text-slate-500">Transaction</dt>
              <dd className="font-mono text-xs">{started?.donation.txnId}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-slate-500">Ledger record</dt>
              <dd className="font-semibold">#{done.blockNumber}</dd>
            </div>
          </dl>
          <div className="flex gap-2">
            <Btn variant="secondary" className="flex-1" onClick={onClose}>Close</Btn>
            <Link to="/ledger" onClick={onClose}
              className="flex-1 rounded-lg bg-blue-700 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-800">
              See the record
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}
