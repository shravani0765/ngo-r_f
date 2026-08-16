import React, { useState } from 'react';
import { AlertTriangle, Shield, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export const WhistleblowerPage: React.FC = () => {
  const [category, setCategory] = useState('Financial Misuse');
  const [description, setDescription] = useState('');
  const [submittedReport, setSubmittedReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/whistleblower', {
        category,
        description
      });
      setSubmittedReport(res.data);
      setDescription('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 py-8">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto shadow-lg">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Anonymous Whistleblower Reporting</h1>
        <p className="text-xs text-slate-500">Report suspicious NGO activities, fake beneficiary records, or fund misuse with zero identity disclosure.</p>
      </div>

      {!submittedReport ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Violation Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
              >
                <option value="Financial Misuse">Financial Misuse / Fund Swapping</option>
                <option value="Fake Beneficiaries">Inflated / Fake Beneficiary Entries</option>
                <option value="Fake Documents">Forged Audit / Tax Exemption Certificate</option>
                <option value="Location Fraud">Geographic Misrepresentation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Incident Description</label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide specific details of the observed anomaly..."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Encrypting & Submitting...' : 'Submit Anonymous Report'}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-emerald-900 space-y-3">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <h3 className="font-bold text-sm">✓ Report Encrypted & Logged Successfully</h3>
          </div>
          <p className="text-xs">Your identity is completely untracked. Save your anonymous tracking ID for reference:</p>
          <div className="p-3 bg-white border border-emerald-300 rounded-xl font-mono text-sm font-bold text-emerald-800">
            Tracking ID: {submittedReport.trackingCode}
          </div>
          <button
            onClick={() => setSubmittedReport(null)}
            className="w-full py-2 bg-emerald-700 text-white rounded-xl font-bold text-xs"
          >
            Submit Another Report
          </button>
        </div>
      )}
    </div>
  );
};
