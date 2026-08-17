import React from 'react';
import { Database, Code2, Copy, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const ApiDocsPage: React.FC = () => {
  const { showToast } = useToast();

  const handleCopy = (text: string, name: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${name} response schema to clipboard!`, 'success');
  };

  const endpoints = [
    {
      method: 'GET',
      path: '/api/public/ngos',
      name: 'NGO Directory',
      desc: 'Retrieves all government-verified NGOs with transparency scores and document hash statuses.',
      response: `[
  {
    "id": "ngo-1",
    "name": "Hope Foundation India",
    "regNum": "DEL/2018/0019482",
    "status": "VERIFIED",
    "transparencyScore": 92,
    "fraudRiskScore": 12
  }
]`
    },
    {
      method: 'GET',
      path: '/api/public/projects',
      name: 'Impact Projects',
      desc: 'Retrieves verified social impact projects with budget utilization and beneficiary counts.',
      response: `[
  {
    "id": "proj-1",
    "title": "Digital Literacy for Rural Primary Schools",
    "category": "Education",
    "budget": 1500000,
    "actualBeneficiaries": 340,
    "status": "ACTIVE"
  }
]`
    },
    {
      method: 'GET',
      path: '/api/ledger',
      name: 'Cryptographic Ledger',
      desc: 'Retrieves the complete cryptographic donation block chain payload with SHA-256 hashes.',
      response: `[
  {
    "blockNumber": 1,
    "prevHash": "000000000000000000000000...",
    "currentHash": "a92f82d1c9748b...",
    "amount": 100000,
    "txnId": "TXN-20260814-88A1"
  }
]`
    },
    {
      method: 'POST',
      path: '/api/government/verify',
      name: 'Gov Verification API',
      desc: 'Simulates official Government NGO Darpan & Income Tax 12A/80G verification.',
      response: `{
  "overallStatus": "VERIFIED",
  "regNumStatus": "VERIFIED",
  "panStatus": "VERIFIED",
  "cert12AStatus": "VERIFIED",
  "cert80GStatus": "VERIFIED",
  "verificationSource": "Mock Gov Portal API"
}`
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-8 shadow-xl">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold">
            <Code2 className="w-3.5 h-3.5 text-blue-400" />
            <span>DEVELOPER REST API DOCUMENTATION</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Public & Developer Open APIs</h1>
          <p className="text-xs text-slate-300">Integrate verified NGO data, cryptographic ledger logs, and government compliance checks into external applications.</p>
        </div>
      </div>

      <div className="space-y-4">
        {endpoints.map((e, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  e.method === 'GET' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {e.method}
                </span>
                <code className="text-xs font-mono font-bold text-slate-900">{e.path}</code>
              </div>

              <button
                onClick={() => handleCopy(e.response, e.name)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy JSON Schema</span>
              </button>
            </div>

            <p className="text-xs text-slate-600">{e.desc}</p>

            <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[11px] overflow-x-auto relative">
              <pre>{e.response}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
