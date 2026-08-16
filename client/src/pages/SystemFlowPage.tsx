import React, { useState } from 'react';
import { Cpu, CheckCircle2, ArrowRight, Eye, ShieldCheck, Lock } from 'lucide-react';

interface SystemStep {
  id: number;
  label: string;
  simpleDesc: string;
  techDesc: string;
}

const FLOW_STEPS: SystemStep[] = [
  {
    id: 1,
    label: 'REGISTER',
    simpleDesc: 'NGOs submit their organization profile, registration certificates, and active social impact projects.',
    techDesc: 'JWT authentication, Prisma user schema, file payload ingestion via Express.js API.'
  },
  {
    id: 2,
    label: 'VERIFY',
    simpleDesc: 'We check whether submitted NGO documents are complete and authentic against government records.',
    techDesc: 'SHA-256 binary hash computation on uploaded PDFs, mock API requests to NGO Darpan, 12A, 80G, and PAN databases.'
  },
  {
    id: 3,
    label: 'CHECK',
    simpleDesc: 'The platform checks financial records and beneficiary entries to ensure data is consistent.',
    techDesc: 'AI anomaly detection model evaluates feature vectors (DocChecksumWeight, BeneficiaryDupFreq, BudgetOutlierScore).'
  },
  {
    id: 4,
    label: 'APPROVE',
    simpleDesc: 'Platform auditors inspect verified reports and grant official "Verified NGO" status.',
    techDesc: 'Auditor state machine update (`status = VERIFIED`), calculation of initial Transparency Score (0-100).'
  },
  {
    id: 5,
    label: 'TRACK FUNDS',
    simpleDesc: 'Donations create a secure, traceable fund record from Donor → NGO → Project → Beneficiary.',
    techDesc: 'Immutable SHA-256 block ledger creation where `currentHash = SHA256(previousHash + payload)`.'
  },
  {
    id: 6,
    label: 'MEASURE IMPACT',
    simpleDesc: 'NGOs upload project outcome evidence and verified beneficiary metrics.',
    techDesc: 'Automatic tagging against 17 UN Sustainable Development Goals (SDGs) and Social Return on Investment (SROI 1.85:1).'
  },
  {
    id: 7,
    label: 'PUBLIC TRANSPARENCY',
    simpleDesc: 'Open public directory showcasing verified NGOs, tracked funds, and total citizens reached.',
    techDesc: 'Open REST API endpoint (`/api/public/impact`) and searchable directory.'
  }
];

export const SystemFlowPage: React.FC = () => {
  const [selectedStep, setSelectedStep] = useState<SystemStep>(FLOW_STEPS[0]);
  const [showTechDetails, setShowTechDetails] = useState(false);

  return (
    <div className="space-y-8 pb-16">
      
      {/* Title Header */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold mb-2">
              <Cpu className="w-4 h-4 text-purple-600" />
              <span>Platform Architecture & Flow</span>
            </div>

            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              End-to-End System Flow
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Click any step below to understand how data moves through the verification and fund tracking pipeline.
            </p>
          </div>

          <button
            onClick={() => setShowTechDetails(!showTechDetails)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors flex items-center space-x-1.5"
          >
            <Eye className="w-4 h-4" />
            <span>{showTechDetails ? 'Hide Technical Details' : 'View Technical Details'}</span>
          </button>
        </div>
      </div>

      {/* VISUAL STEP DIAGRAM */}
      <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {FLOW_STEPS.map((step, idx) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => setSelectedStep(step)}
                className={`py-3 px-4 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                  selectedStep.id === step.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {step.label}
              </button>

              {idx < FLOW_STEPS.length - 1 && (
                <ArrowRight className="w-4 h-4 text-slate-300 hidden md:block" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* STEP DETAIL EXPLANATION */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <span className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center">
            {selectedStep.id}
          </span>
          <h2 className="text-xl font-extrabold text-slate-900">{selectedStep.label} STEP</h2>
        </div>

        <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200/60 space-y-2">
          <h4 className="font-bold text-xs uppercase tracking-wider text-blue-900">What happens here?</h4>
          <p className="text-sm text-slate-700 leading-relaxed font-medium">
            {selectedStep.simpleDesc}
          </p>
        </div>

        {/* Optional Technical Details Toggle */}
        {showTechDetails && (
          <div className="p-5 rounded-2xl bg-slate-900 text-slate-200 font-mono text-xs space-y-2 border border-slate-800">
            <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">Technical Implementation Details:</h4>
            <p className="leading-relaxed">
              {selectedStep.techDesc}
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
