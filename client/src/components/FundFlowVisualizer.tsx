import React from 'react';
import { ArrowDown, DollarSign, Building2, FolderKanban, Receipt, Users, CheckCircle } from 'lucide-react';

interface FundFlowProps {
  donorName?: string;
  ngoName?: string;
  projectTitle?: string;
  fundedAmount: number;
  expensedAmount: number;
  beneficiariesCount: number;
}

export const FundFlowVisualizer: React.FC<FundFlowProps> = ({
  donorName = 'Global Impact Donor',
  ngoName = 'Hope Foundation India',
  projectTitle = 'Digital Literacy for Rural Primary Schools',
  fundedAmount = 100000,
  expensedAmount = 90000,
  beneficiariesCount = 340
}) => {
  const remaining = Math.max(0, fundedAmount - expensedAmount);
  const utilization = fundedAmount > 0 ? Math.round((expensedAmount / fundedAmount) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">End-to-End Visual Fund Flow Tracker</h3>
          <p className="text-xs text-slate-500 mt-0.5">Real-time audit tracking from donor contribution to verified beneficiary support</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-slate-500">Fund Utilization</span>
          <p className="text-lg font-extrabold text-blue-700">{utilization}%</p>
        </div>
      </div>

      {/* Vertical Step Nodes */}
      <div className="max-w-xl mx-auto space-y-3">
        {/* Node 1: Donor */}
        <div className="flex items-center space-x-4 p-3.5 bg-blue-50/70 rounded-xl border border-blue-200/80">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">Step 1 • Contribution</span>
            <h4 className="text-xs font-bold text-slate-900">{donorName}</h4>
            <p className="text-[11px] text-slate-600 font-semibold mt-0.5">Donated: ₹{fundedAmount.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="flex justify-center text-blue-400">
          <ArrowDown className="w-4 h-4 animate-bounce" />
        </div>

        {/* Node 2: NGO */}
        <div className="flex items-center space-x-4 p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200/80">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider">Step 2 • Custody & Allocation</span>
            <h4 className="text-xs font-bold text-slate-900">{ngoName}</h4>
            <p className="text-[11px] text-slate-600">Status: Verified NGO (12A & 80G Compliant)</p>
          </div>
        </div>

        <div className="flex justify-center text-indigo-400">
          <ArrowDown className="w-4 h-4 animate-bounce" />
        </div>

        {/* Node 3: Project */}
        <div className="flex items-center space-x-4 p-3.5 bg-teal-50/70 rounded-xl border border-teal-200/80">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-sm">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] uppercase font-bold text-teal-700 tracking-wider">Step 3 • Target Project</span>
            <h4 className="text-xs font-bold text-slate-900">{projectTitle}</h4>
            <p className="text-[11px] text-slate-600">Active Deployment Budget: ₹{fundedAmount.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="flex justify-center text-teal-400">
          <ArrowDown className="w-4 h-4 animate-bounce" />
        </div>

        {/* Node 4: Audited Expenses */}
        <div className="flex items-center space-x-4 p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Step 4 • Verified Disbursal</span>
            <h4 className="text-xs font-bold text-slate-900">Audited Expense Receipts</h4>
            <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">
              Utilized: ₹{expensedAmount.toLocaleString('en-IN')} | Unspent Reserve: ₹{remaining.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <div className="flex justify-center text-emerald-400">
          <ArrowDown className="w-4 h-4 animate-bounce" />
        </div>

        {/* Node 5: Beneficiaries Impact */}
        <div className="flex items-center space-x-4 p-3.5 bg-purple-50/70 rounded-xl border border-purple-200/80">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-sm">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] uppercase font-bold text-purple-700 tracking-wider">Step 5 • Verified Social Impact</span>
            <h4 className="text-xs font-bold text-slate-900">{beneficiariesCount} Direct Beneficiaries Reached</h4>
            <p className="text-[11px] text-slate-600">Deduplicated IDs • Verified Field Deliverables</p>
          </div>
          <CheckCircle className="w-5 h-5 text-emerald-600" />
        </div>
      </div>
    </div>
  );
};
