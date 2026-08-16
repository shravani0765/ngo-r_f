import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, CheckCircle2, Eye, Network, ArrowRight, Lock } from 'lucide-react';
import { BlockchainBlock } from '../types';
import api from '../services/api';

export const LedgerVisualizer: React.FC = () => {
  const [blocks, setBlocks] = useState<BlockchainBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ isValid: boolean; message: string; totalBlocks?: number } | null>(null);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ledger');
      setBlocks(res.data);
    } catch (err) {
      console.error('Failed to load ledger', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const res = await api.post('/ledger/verify');
      setVerificationResult(res.data);
    } catch (err) {
      setVerificationResult({ isValid: false, message: 'Verification API request failed' });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Audited Financial Records</span>
            </div>

            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Secure Fund Records
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Every donation and expense is securely recorded so that fund movement can be audited.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowTechDetails(!showTechDetails)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors flex items-center space-x-1.5"
            >
              <Eye className="w-4 h-4" />
              <span>{showTechDetails ? 'Hide Technical Details' : 'View Technical Details'}</span>
            </button>

            <button
              onClick={handleVerifyChain}
              disabled={verifying}
              className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              {verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{verifying ? 'Verifying...' : '✓ Verify Records'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Verification Result Notification */}
      {verificationResult && (
        <div className={`p-4 rounded-2xl border flex items-center space-x-3 transition-all ${
          verificationResult.isValid 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs font-bold">
            <div>{verificationResult.isValid ? '✓ All Financial Records Verified & Tamper-Free' : '⚠ Record Discrepancy Found'}</div>
            <div className="text-[11px] font-normal text-slate-600 mt-0.5">{verificationResult.message}</div>
          </div>
        </div>
      )}

      {/* WHERE YOUR DONATION WENT VISUAL TIMELINE */}
      <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-900 text-base">WHERE YOUR DONATION WENT</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-center text-xs">
          
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
            <div className="font-black text-blue-900">₹10,000</div>
            <div className="text-[10px] font-bold text-slate-600">Donation Received</div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 space-y-1">
            <div className="font-black text-indigo-900">₹7,000</div>
            <div className="text-[10px] font-bold text-slate-600">Learning Materials</div>
          </div>

          <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 space-y-1">
            <div className="font-black text-teal-900">₹2,000</div>
            <div className="text-[10px] font-bold text-slate-600">Teacher Support</div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
            <div className="font-black text-amber-900">₹1,000</div>
            <div className="text-[10px] font-bold text-slate-600">Transportation</div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
            <div className="font-black text-emerald-900">350 Students</div>
            <div className="text-[10px] font-bold text-slate-600">Impact Reached</div>
          </div>

        </div>
      </div>

      {/* Simple Fund Record Cards */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500">Loading secure fund records...</div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Recorded Transactions ({blocks.length} Records)
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">Auto-synced with platform ledger</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {blocks.map((block) => (
              <div 
                key={block.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Donation Record</span>
                    <h4 className="font-extrabold text-slate-900 text-sm">{block.project?.title || 'Digital Literacy Project'}</h4>
                    <p className="text-xs text-slate-500">{block.ngo?.name || 'Hope Foundation'}</p>
                  </div>

                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>✓ Securely Recorded</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Amount Recorded:</span>
                  <span className="font-extrabold text-emerald-800 text-sm">₹{block.amount.toLocaleString('en-IN')}</span>
                </div>

                <div className="text-[11px] text-slate-400">
                  Date: {new Date(block.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>

                {/* TECHNICAL DETAILS TOGGLE CONTENT */}
                {showTechDetails && (
                  <div className="bg-slate-900 text-slate-300 p-3 rounded-xl font-mono text-[10px] space-y-1 mt-2 border border-slate-800">
                    <div className="text-amber-400 font-bold">Cryptographic Block #{block.blockNumber}</div>
                    <div className="truncate">Transaction ID: {block.txnId}</div>
                    <div className="truncate">Previous Hash: {block.prevHash}</div>
                    <div className="text-blue-400 truncate">Current Hash (SHA-256): {block.currentHash}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
