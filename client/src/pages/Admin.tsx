import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, AdminStats, Ngo, Doc, Alert as RiskAlert, Report, shortMoney, num, date } from '../lib/api';
import {
  Card, H1, H2, Btn, Badge, StatusBadge, Stat, Empty, Field,
  Textarea, Alert, Loading, useLoad, useToast
} from '../lib/ui';

interface Queue {
  organisations: (Ngo & { _count: { documents: number; projects: number; beneficiaries: number } })[];
  documents: Doc[];
  alerts: RiskAlert[];
  reports: Report[];
}

export function AdminPanel() {
  const { data: stats, reload: reloadStats } = useLoad(() => api.get<AdminStats>('/admin/statistics'));
  const { data: queue, loading, error, reload } = useLoad(() => api.get<Queue>('/admin/queue'));

  const refreshAll = () => { reload(); reloadStats(); };

  if (loading) return <Loading label="Loading the review queue…" />;
  if (error) return <Alert tone="error">{error}</Alert>;

  return (
    <>
      <H1 sub="Everything waiting on you, in one place. Approving an organisation is what makes it visible to the public.">
        Auditor panel
      </H1>

      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Waiting on you" value={num(stats.actionsWaiting)} hint="Organisations, documents, flags and reports" />
          <Stat label="Verified NGOs" value={`${stats.verifiedNGOs} / ${stats.totalNGOs}`}
            hint={stats.avgTransparencyScore !== null ? `Average score ${stats.avgTransparencyScore}` : 'No scores yet'} />
          <Stat label="Funds tracked" value={shortMoney(stats.totalDonatedAmount)} hint={`${stats.totalLedgerBlocks} ledger records`} />
          <Stat label="Possible duplicates" value={num(stats.duplicateBeneficiaries)} hint={`of ${num(stats.totalBeneficiaries)} people recorded`} />
        </div>
      )}

      <div className="space-y-8">
        <section>
          <H2>Organisations awaiting a decision ({queue?.organisations.length ?? 0})</H2>
          {(queue?.organisations.length ?? 0) === 0 ? (
            <Empty title="Nothing waiting" body="Every organisation has been reviewed." />
          ) : (
            <div className="space-y-4">
              {queue!.organisations.map(ngo => <ReviewCard key={ngo.id} ngo={ngo} onDone={refreshAll} />)}
            </div>
          )}
        </section>

        <section>
          <H2>Documents to review ({queue?.documents.length ?? 0})</H2>
          {(queue?.documents.length ?? 0) === 0 ? (
            <Empty title="No documents waiting" body="All uploaded documents have been reviewed." />
          ) : (
            <Card>
              <ul className="divide-y divide-slate-100">
                {queue!.documents.map(d => <DocRow key={d.id} doc={d} onDone={refreshAll} />)}
              </ul>
            </Card>
          )}
        </section>

        <section>
          <H2>Risk flags ({queue?.alerts.length ?? 0})</H2>
          {(queue?.alerts.length ?? 0) === 0 ? (
            <Empty title="No open flags" body="No organisation is currently flagged." />
          ) : (
            <div className="space-y-3">
              {queue!.alerts.map(a => <AlertRow key={a.id} alert={a} onDone={refreshAll} />)}
            </div>
          )}
        </section>

        <section>
          <H2>Anonymous reports ({queue?.reports.length ?? 0})</H2>
          {(queue?.reports.length ?? 0) === 0 ? (
            <Empty title="No open reports" body="Nothing has been reported." />
          ) : (
            <div className="space-y-3">
              {queue!.reports.map(r => <ReportRow key={r.id} report={r} onDone={refreshAll} />)}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function ReviewCard({ ngo, onDone }: { ngo: Ngo & { _count: any }; onDone: () => void }) {
  const toast = useToast();
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const decide = async (decision: 'VERIFIED' | 'REQUIRES_CORRECTION' | 'REJECTED') => {
    if (decision !== 'VERIFIED' && !notes.trim()) {
      toast('Please explain the decision so they know what to fix.', 'error');
      return;
    }
    setBusy(true);
    try {
      const r = await api.post<{ message: string }>(`/admin/ngos/${ngo.id}/decision`, { decision, notes: notes.trim() || undefined });
      toast(r.message, decision === 'VERIFIED' ? 'success' : 'info');
      onDone();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const gov = ngo.govVerification;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{ngo.name}</h3>
          <p className="mt-0.5 text-sm text-slate-600">Registration {ngo.regNum} · {ngo.district}, {ngo.state}</p>
        </div>
        <StatusBadge status={ngo.status} />
      </div>

      <p className="mt-2 text-sm text-slate-600">{ngo.mission}</p>

      <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-slate-500">Documents</dt><dd className="font-semibold">{ngo._count.documents}</dd></div>
        <div><dt className="text-xs text-slate-500">Projects</dt><dd className="font-semibold">{ngo._count.projects}</dd></div>
        <div><dt className="text-xs text-slate-500">People</dt><dd className="font-semibold">{ngo._count.beneficiaries}</dd></div>
        <div><dt className="text-xs text-slate-500">Risk score</dt><dd className="font-semibold">{ngo.fraudRiskScore}/100</dd></div>
      </dl>

      <div className="mt-3">
        {gov ? (
          <Badge tone={gov.overallStatus === 'VERIFIED' ? 'green' : 'amber'}>
            Government check: {gov.overallStatus === 'VERIFIED' ? 'passed' : 'needs review'}
          </Badge>
        ) : (
          <Badge tone="amber">Government check not run yet</Badge>
        )}
      </div>

      <div className="mt-4">
        <Field label="Notes" hint="Required when asking for changes or rejecting. Sent to the organisation.">
          <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="e.g. The 80G certificate has expired — please upload the current one." />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Btn onClick={() => decide('VERIFIED')} loading={busy}>Approve and publish</Btn>
        <Btn variant="secondary" onClick={() => decide('REQUIRES_CORRECTION')} loading={busy}>Ask for changes</Btn>
        <Btn variant="danger" onClick={() => decide('REJECTED')} loading={busy}>Reject</Btn>
        <Link to={`/ngos/${ngo.id}`} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
          View full profile
        </Link>
      </div>
    </Card>
  );
}

function DocRow({ doc, onDone }: { doc: Doc; onDone: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState<string | null>(null);

  const act = async (status: 'VERIFIED' | 'REQUIRES_CORRECTION') => {
    const notes = status === 'VERIFIED' ? undefined : window.prompt('What needs to change?') ?? '';
    if (status !== 'VERIFIED' && !notes) return;
    setBusy(true);
    try {
      await api.patch(`/documents/${doc.id}/review`, { status, notes });
      toast('Decision saved.', 'success');
      onDone();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const verifyHash = async () => {
    try {
      const r = await api.post<{ isIntegrityValid: boolean; message: string }>(`/documents/${doc.id}/verify-integrity`);
      setCheck(r.message);
      toast(r.message, r.isIntegrityValid ? 'success' : 'error');
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{doc.fileName}</p>
          <p className="text-xs text-slate-500">{doc.ngo?.name} · {doc.docType.replace(/_/g, ' ').toLowerCase()} · {date(doc.uploadDate)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={verifyHash}>Check fingerprint</Btn>
          <Btn variant="secondary" onClick={() => act('REQUIRES_CORRECTION')} loading={busy}>Ask for a fix</Btn>
          <Btn onClick={() => act('VERIFIED')} loading={busy}>Accept</Btn>
        </div>
      </div>
      {check && <div className="mt-2"><Alert tone="info">{check}</Alert></div>}
    </li>
  );
}

function AlertRow({ alert, onDone }: { alert: RiskAlert; onDone: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const set = async (status: string) => {
    setBusy(true);
    try {
      await api.patch(`/admin/alerts/${alert.id}`, { status });
      toast('Updated.', 'success');
      onDone();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone={alert.riskLevel === 'HIGH' ? 'red' : 'amber'}>{alert.riskLevel} risk</Badge>
            <StatusBadge status={alert.status} />
          </div>
          <p className="mt-2 font-medium text-slate-900">{alert.ngo?.name}</p>
          <p className="mt-1 text-sm text-slate-600">{alert.reason}</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={() => set('INVESTIGATING')} loading={busy}>Investigating</Btn>
          <Btn onClick={() => set('RESOLVED')} loading={busy}>Resolve</Btn>
        </div>
      </div>
    </Card>
  );
}

function ReportRow({ report, onDone }: { report: Report; onDone: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const set = async (status: string) => {
    setBusy(true);
    try {
      await api.patch(`/admin/reports/${report.id}`, { status });
      toast('Updated.', 'success');
      onDone();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone="grey">{report.category}</Badge>
            <StatusBadge status={report.status} />
          </div>
          <p className="mt-2 font-mono text-xs text-slate-500">{report.trackingCode} · {date(report.createdAt)}</p>
          <p className="mt-1 text-sm text-slate-700">{report.description}</p>
          {report.ngo && <p className="mt-1 text-xs text-slate-500">About: {report.ngo.name}</p>}
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={() => set('UNDER_INVESTIGATION')} loading={busy}>Investigate</Btn>
          <Btn onClick={() => set('RESOLVED')} loading={busy}>Resolve</Btn>
          <Btn variant="ghost" onClick={() => set('DISMISSED')} loading={busy}>Dismiss</Btn>
        </div>
      </div>
    </Card>
  );
}
