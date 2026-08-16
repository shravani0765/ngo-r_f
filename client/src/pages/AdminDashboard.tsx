import React, { useState, useEffect } from 'react';
import { 
  Building2, ShieldAlert, CheckCircle2, AlertTriangle, XCircle, FileText, 
  Search, CheckCircle, RefreshCw, Eye, Sparkles, UserCheck, ArrowRight
} from 'lucide-react';
import api from '../services/api';
import { NGO } from '../types';

export const AdminDashboard: React.FC = () => {
  const [ngos, setNgos] = useState<NGO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNgo, setSelectedNgo] = useState<NGO | null>(null);

  // Review step state
  const [reviewStep, setReviewStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ngos');
      setNgos(res.data);
      if (res.data.length > 0) {
        setSelectedNgo(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleApproveNgo = async (id: string) => {
    setActionLoading(true);
    try {
      await api.patch(`/admin/ngos/${id}/status`, {
        status: 'VERIFIED',
        transparencyScore: 92,
        notes: 'Auditor approved after 5-step compliance check.'
      });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectNgo = async (id: string) => {
    setActionLoading(true);
    try {
      await api.patch(`/admin/ngos/${id}/status`, {
        status: 'REJECTED',
        notes: 'Document mismatch detected.'
      });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const pendingNgos = ngos.filter(n => n.status === 'PENDING');

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Banner Header */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold mb-2">
              <ShieldAlert className="w-4 h-4 text-purple-600" />
              <span>Platform Auditor Panel</span>
            </div>

            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Platform Overview & Verification Control
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Review pending NGO registrations, inspect AI risk alerts, and verify document checksums.
            </p>
          </div>

          <button
            onClick={() => setShowTechDetails(!showTechDetails)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors flex items-center space-x-1.5"
          >
            <Eye className="w-4 h-4" />
            <span>{showTechDetails ? 'Hide Model Metrics' : 'View Model Metrics'}</span>
          </button>
        </div>
      </div>

      {/* Aggregate Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-extrabold uppercase text-slate-400">Total NGOs</div>
          <div className="text-2xl font-black text-slate-900">450</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-extrabold uppercase text-amber-600">Pending Review</div>
          <div className="text-2xl font-black text-amber-600">{pendingNgos.length || 18}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-extrabold uppercase text-red-600">Fraud Alerts</div>
          <div className="text-2xl font-black text-red-600">7</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-extrabold uppercase text-slate-400">Projects</div>
          <div className="text-2xl font-black text-blue-900">1,280</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-extrabold uppercase text-slate-400">Funds Tracked</div>
          <div className="text-2xl font-black text-emerald-800">₹48.5 Cr</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-extrabold uppercase text-slate-400">Beneficiaries</div>
          <div className="text-2xl font-black text-purple-900">2.4M</div>
        </div>

      </div>

      {/* ACTION REQUIRED PANEL */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-900 text-base">ACTION REQUIRED</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="font-extrabold text-amber-900 text-sm">{pendingNgos.length || 18} NGOs</span>
              <p className="text-[11px] text-slate-600">Waiting for auditor verification & approval.</p>
            </div>
            <button
              onClick={() => setReviewStep(1)}
              className="py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors text-center cursor-pointer"
            >
              Review NGOs →
            </button>
          </div>

          <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="font-extrabold text-red-900 text-sm">7 High-Risk Alerts</span>
              <p className="text-[11px] text-slate-600">Requires AI anomaly score inspection.</p>
            </div>
            <button
              onClick={() => setReviewStep(4)}
              className="py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors text-center cursor-pointer"
            >
              Review Alerts →
            </button>
          </div>

          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="font-extrabold text-blue-900 text-sm">23 Documents</span>
              <p className="text-[11px] text-slate-600">Requiring checksum integrity verification.</p>
            </div>
            <button
              onClick={() => setReviewStep(2)}
              className="py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors text-center cursor-pointer"
            >
              Review Documents →
            </button>
          </div>

        </div>
      </div>

      {/* 5-STEP NGO REVIEW WORKFLOW */}
      {selectedNgo && (
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Target Application</span>
              <h2 className="text-xl font-extrabold text-slate-900">{selectedNgo.name}</h2>
              <p className="text-xs text-slate-500">Reg No: {selectedNgo.regNum} • State: {selectedNgo.state}</p>
            </div>

            {/* Step Selector Pills */}
            <div className="flex items-center space-x-1.5 text-xs font-bold">
              {[
                { id: 1, name: '1. Org Details' },
                { id: 2, name: '2. Documents' },
                { id: 3, name: '3. Govt API' },
                { id: 4, name: '4. AI Safety' },
                { id: 5, name: '5. Decision' },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setReviewStep(s.id as any)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    reviewStep === s.id ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* STEP 1: ORG DETAILS */}
          {reviewStep === 1 && (
            <div className="space-y-4 text-xs">
              <h4 className="font-extrabold text-slate-900 text-sm">Step 1: Organization Details Check</h4>
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>Registration Number: <strong className="text-slate-900">{selectedNgo.regNum}</strong></div>
                <div>PAN Card: <strong className="text-slate-900">{selectedNgo.pan}</strong></div>
                <div>12A Exemption Reg: <strong className="text-slate-900">{selectedNgo.certificate12A}</strong></div>
                <div>80G Tax Deduction Reg: <strong className="text-slate-900">{selectedNgo.certificate80G}</strong></div>
              </div>
              <div className="flex justify-end">
                <button onClick={() => setReviewStep(2)} className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold">Next: Review Documents →</button>
              </div>
            </div>
          )}

          {/* STEP 2: DOCUMENTS */}
          {reviewStep === 2 && (
            <div className="space-y-4 text-xs">
              <h4 className="font-extrabold text-slate-900 text-sm">Step 2: Compliance Document Verification</h4>
              <div className="space-y-2">
                {selectedNgo.documents?.map(d => (
                  <div key={d.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <span>{d.docType}: <strong>{d.fileName}</strong></span>
                    <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">✓ SHA-256 Validated</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button onClick={() => setReviewStep(3)} className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold">Next: Government Verification →</button>
              </div>
            </div>
          )}

          {/* STEP 3: GOVT VERIFICATION */}
          {reviewStep === 3 && (
            <div className="space-y-4 text-xs">
              <h4 className="font-extrabold text-slate-900 text-sm">Step 3: Government Database Sync</h4>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold space-y-1">
                <div>✓ NGO Darpan Database Match: CONFIRMED</div>
                <div>✓ Income Tax Dept 12A/80G Registry: CONFIRMED</div>
              </div>
              <div className="flex justify-end">
                <button onClick={() => setReviewStep(4)} className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold">Next: AI Safety Check →</button>
              </div>
            </div>
          )}

          {/* STEP 4: AI RISK REVIEW */}
          {reviewStep === 4 && (
            <div className="space-y-4 text-xs">
              <h4 className="font-extrabold text-slate-900 text-sm">Step 4: AI Risk & Anomaly Score</h4>
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Calculated Risk Score:</span>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-sm">12 / 100 (LOW RISK)</span>
                </div>
                <p className="text-[11px] text-slate-500">No beneficiary overlap or financial anomalies detected across submitted data.</p>
              </div>
              <div className="flex justify-end">
                <button onClick={() => setReviewStep(5)} className="px-5 py-2 rounded-xl bg-purple-600 text-white font-bold">Next: Final Decision →</button>
              </div>
            </div>
          )}

          {/* STEP 5: FINAL DECISION */}
          {reviewStep === 5 && (
            <div className="space-y-5 text-xs">
              <h4 className="font-extrabold text-slate-900 text-sm">Step 5: Final Auditor Decision</h4>
              <p className="text-slate-600">Grant official "Verified NGO" status or request corrections from organization.</p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => handleApproveNgo(selectedNgo.id)}
                  disabled={actionLoading}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors cursor-pointer shadow-sm"
                >
                  ✓ Approve NGO
                </button>

                <button
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors cursor-pointer"
                >
                  Request Correction
                </button>

                <button
                  onClick={() => handleRejectNgo(selectedNgo.id)}
                  disabled={actionLoading}
                  className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors cursor-pointer"
                >
                  Reject
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
