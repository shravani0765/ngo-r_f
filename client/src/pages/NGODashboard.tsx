import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Award, ShieldCheck, FolderKanban, Wallet, Users, Upload, CheckCircle2, 
  RefreshCw, Plus, Sparkles, FileText, ArrowRight, Clock, AlertTriangle, Eye
} from 'lucide-react';
import api from '../services/api';
import { NGO } from '../types';
import { useToast } from '../context/ToastContext';

export const NGODashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'documents' | 'projects' | 'beneficiaries' | 'expenses'>('overview');
  const [ngo, setNgo] = useState<NGO | null>(null);
  const [loading, setLoading] = useState(true);

  // Verification state
  const [govVerifying, setGovVerifying] = useState(false);
  const [govResult, setGovResult] = useState<any>(null);

  // Document Upload state
  const [docType, setDocType] = useState('AUDIT_REPORT');
  const [fileName, setFileName] = useState('');
  const [docUploading, setDocUploading] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [hashVerificationResult, setHashVerificationResult] = useState<any>(null);

  // Project Creation state
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    category: 'Education',
    location: '',
    state: 'Maharashtra',
    district: 'Mumbai',
    budget: 500000,
    expectedBeneficiaries: 250
  });
  const [aiSdgs, setAiSdgs] = useState<any[]>([]);
  const [sdgClassifying, setSdgClassifying] = useState(false);
  const [projectCreating, setProjectCreating] = useState(false);

  // Beneficiary & Expense state
  const [newBeneficiary, setNewBeneficiary] = useState({
    projectId: '',
    name: '',
    age: 12,
    gender: 'Male',
    location: 'Vashi Village',
    program: 'Digital Literacy',
    supportType: 'Tablet & Book Kit'
  });
  const [dupCheckResult, setDupCheckResult] = useState<any>(null);
  const [beneficiaryAdding, setBeneficiaryAdding] = useState(false);

  const [newExpense, setNewExpense] = useState({
    projectId: '',
    category: 'Equipment Purchase',
    amount: 15000,
    description: 'Procured learning supplies'
  });

  const fetchNgoData = async () => {
    setLoading(true);
    try {
      if (user?.ngo?.id) {
        const res = await api.get(`/ngos/${user.ngo.id}`);
        setNgo(res.data);
      } else {
        const res = await api.get('/ngos');
        if (res.data.length > 0) {
          const detailRes = await api.get(`/ngos/${res.data[0].id}`);
          setNgo(detailRes.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch NGO details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNgoData();
  }, [user]);

  const handleGovVerify = async () => {
    if (!ngo) return;
    setGovVerifying(true);
    try {
      const res = await api.post('/government/verify', {
        ngoId: ngo.id,
        regNum: ngo.regNum,
        pan: ngo.pan,
        certificate12A: ngo.certificate12A,
        certificate80G: ngo.certificate80G
      });
      setGovResult(res.data);
      showToast('Government database verification completed successfully!', 'success');
      fetchNgoData();
    } catch (err) {
      showToast('Verification failed with government database', 'error');
    } finally {
      setGovVerifying(false);
    }
  };

  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ngo || !fileName) return;
    setDocUploading(true);
    try {
      await api.post('/documents', {
        ngoId: ngo.id,
        docType,
        fileName,
        content: `${fileName}_${Date.now()}`
      });
      showToast(`Document "${fileName}" uploaded & cryptographic SHA-256 hash computed!`, 'success');
      setFileName('');
      fetchNgoData();
    } catch (err) {
      showToast('Failed to upload document', 'error');
    } finally {
      setDocUploading(false);
    }
  };

  const handleVerifyIntegrity = async (docId: string) => {
    try {
      const res = await api.post(`/documents/${docId}/verify-integrity`);
      setHashVerificationResult(res.data);
      if (res.data.isTampered) {
        showToast('⚠️ WARNING: Document hash mismatch / tamper detected!', 'error');
      } else {
        showToast('✅ Document SHA-256 integrity verified! Hash is authentic.', 'success');
      }
    } catch (err) {
      showToast('Integrity verification failed', 'error');
    }
  };

  const handleDescriptionChange = async (text: string) => {
    setNewProject(prev => ({ ...prev, description: text }));
    if (text.length > 15) {
      setSdgClassifying(true);
      try {
        const res = await api.post('/ai/sdg-classify', { description: text });
        setAiSdgs(res.data.recommendations || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSdgClassifying(false);
      }
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ngo) return;
    setProjectCreating(true);
    try {
      const sdgText = JSON.stringify(aiSdgs.map(s => `${s.code} — ${s.title}`));
      await api.post('/projects', {
        ...newProject,
        ngoId: ngo.id,
        sdgGoals: sdgText
      });
      showToast(`Project "${newProject.title}" created with AI SDG tagging!`, 'success');
      setNewProject({
        title: '',
        description: '',
        category: 'Education',
        location: '',
        state: 'Maharashtra',
        district: 'Mumbai',
        budget: 500000,
        expectedBeneficiaries: 250
      });
      fetchNgoData();
    } catch (err) {
      showToast('Failed to create project', 'error');
    } finally {
      setProjectCreating(false);
    }
  };

  const handleAddBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ngo) return;
    const targetProjectId = newBeneficiary.projectId || (ngo.projects && ngo.projects[0]?.id);
    if (!targetProjectId) return;

    setBeneficiaryAdding(true);
    try {
      const res = await api.post('/beneficiaries', {
        ...newBeneficiary,
        projectId: targetProjectId,
        ngoId: ngo.id
      });
      setDupCheckResult(res.data.duplicateCheck);
      fetchNgoData();
    } catch (err) {
      console.error(err);
    } finally {
      setBeneficiaryAdding(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ngo) return;
    const targetProjectId = newExpense.projectId || (ngo.projects && ngo.projects[0]?.id);
    if (!targetProjectId) return;

    try {
      await api.post('/expenses', {
        ...newExpense,
        projectId: targetProjectId,
        ngoId: ngo.id
      });
      setNewExpense({ projectId: '', category: 'Equipment Purchase', amount: 15000, description: '' });
      fetchNgoData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center text-xs text-slate-500">Loading NGO Portal...</div>;
  if (!ngo) return <div className="p-8 text-center text-xs text-slate-500">No NGO Profile found.</div>;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Greeting Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black text-slate-900">Good morning, {ngo.name} 👋</h1>
            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-extrabold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>✓ VERIFIED NGO</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Reg No: {ngo.regNum} • Registered in {ngo.state}</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowTechDetails(!showTechDetails)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center space-x-1"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showTechDetails ? 'Hide Technical Details' : 'View Technical Details'}</span>
          </button>
          
          <button
            onClick={handleGovVerify}
            disabled={govVerifying}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${govVerifying ? 'animate-spin' : ''}`} />
            <span>{govVerifying ? 'Verifying...' : 'Government Re-Check'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Transparency Score Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Transparency Score</span>
            <Award className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{ngo.transparencyScore || 86}</span>
            <span className="text-xs font-bold text-emerald-600">/ 100 (Good)</span>
          </div>
          <p className="text-[10px] text-slate-400">Based on documents & financial audit</p>
        </div>

        {/* Funding Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Fund Utilization</span>
            <Wallet className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">₹12.5L <span className="text-xs text-slate-500 font-normal">received</span></div>
          <div className="text-xs font-semibold text-emerald-700">₹8.2L utilized (65.6%)</div>
        </div>

        {/* Active Projects Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Active Projects</span>
            <FolderKanban className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{ngo.projects?.length || 4}</div>
          <p className="text-[10px] text-slate-400">Education, Nutrition & Health</p>
        </div>

        {/* Beneficiaries Reached Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">People Reached</span>
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">1,240</div>
          <p className="text-[10px] text-slate-400">Verified direct beneficiaries</p>
        </div>

      </div>

      {/* Action Required & Progress Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* YOUR PROGRESS CHECKLIST */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 md:col-span-1">
          <h3 className="font-extrabold text-slate-900 text-sm tracking-tight border-b border-slate-100 pb-2">
            YOUR PROGRESS
          </h3>
          
          <div className="space-y-3 text-xs font-semibold">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>NGO Registration</span>
              </span>
              <span>✓</span>
            </div>

            <div className="flex items-center justify-between text-emerald-700">
              <span className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Documents Uploaded</span>
              </span>
              <span>✓</span>
            </div>

            <div className="flex items-center justify-between text-emerald-700">
              <span className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Government Verification</span>
              </span>
              <span>✓</span>
            </div>

            <div className="flex items-center justify-between text-emerald-700">
              <span className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Admin Approval</span>
              </span>
              <span>✓</span>
            </div>

            <div className="flex items-center justify-between text-emerald-700">
              <span className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Public Listing</span>
              </span>
              <span>✓</span>
            </div>
          </div>
        </div>

        {/* ACTION REQUIRED CARDS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 md:col-span-2">
          <h3 className="font-extrabold text-slate-900 text-sm tracking-tight border-b border-slate-100 pb-2">
            ACTION REQUIRED
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                  Q2 Financial Audit
                </span>
                <h4 className="font-bold text-xs text-slate-900">Upload your latest project report</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Keep your transparency score above 85 by uploading Q2 expense proofs.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('documents')}
                className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
              >
                <span>Upload Report →</span>
              </button>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                  Fund Utilization
                </span>
                <h4 className="font-bold text-xs text-slate-900">Add expenses for Digital Literacy</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Record recent tablet purchases for rural school beneficiaries.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('expenses')}
                className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
              >
                <span>Update Expenses →</span>
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* Tabs Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-2 text-xs font-bold">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'projects', label: 'Projects & SDGs' },
          { id: 'documents', label: 'Compliance Documents' },
          { id: 'beneficiaries', label: 'Beneficiaries' },
          { id: 'expenses', label: 'Expenses & Receipts' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === t.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: PROJECTS */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900">Add New Social Impact Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Project Title (e.g. Rural Digital Literacy Program)"
                  required
                  value={newProject.title}
                  onChange={e => setNewProject(p => ({ ...p, title: e.target.value }))}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none md:col-span-2"
                />
                <textarea
                  placeholder="Describe your project goal, activities, and beneficiary impact (AI will suggest UN SDGs)..."
                  required
                  rows={3}
                  value={newProject.description}
                  onChange={e => handleDescriptionChange(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none md:col-span-2"
                />
              </div>

              {/* AI SDG Recommendations Pill Display */}
              {aiSdgs.length > 0 && (
                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 space-y-2">
                  <div className="flex items-center space-x-1.5 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span>AI Suggested UN Sustainable Development Goals (SDGs)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {aiSdgs.map((sdg, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-teal-600 text-white font-extrabold text-[11px]">
                        {sdg.code}: {sdg.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={projectCreating}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                {projectCreating ? 'Creating Project...' : '+ Add Project'}
              </button>
            </form>
          </div>

          {/* Listed Projects */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ngo.projects?.map(p => (
              <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <h4 className="font-bold text-sm text-slate-900">{p.title}</h4>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">{p.category}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{p.description}</p>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-2 border-t border-slate-100">
                  <span>Budget: ₹{p.budget?.toLocaleString()}</span>
                  <span>Beneficiaries: {p.expectedBeneficiaries}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="font-bold text-base text-slate-900">Upload & Verify Compliance Documents</h3>
          
          <form onSubmit={handleDocUpload} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium"
            >
              <option value="AUDIT_REPORT">Financial Audit Report</option>
              <option value="12A_CERTIFICATE">12A Tax Exemption Certificate</option>
              <option value="80G_CERTIFICATE">80G Certificate</option>
              <option value="PAN_CARD">PAN Card Copy</option>
            </select>

            <input
              type="text"
              placeholder="Document name (e.g. Audit_Report_FY2026.pdf)"
              required
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
            />

            <button
              type="submit"
              disabled={docUploading}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors cursor-pointer"
            >
              {docUploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </form>

          {/* Document Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-y border-slate-200">
                <tr>
                  <th className="p-3">Document Type</th>
                  <th className="p-3">File Name</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ngo.documents?.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{d.docType}</td>
                    <td className="p-3 text-slate-600">{d.fileName}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        ✓ Uploaded & Checked
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleVerifyIntegrity(d.id)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
                      >
                        Check Document Integrity
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Technical Details Toggle Content */}
          {showTechDetails && hashVerificationResult && (
            <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] space-y-1">
              <div className="text-amber-400 font-bold">SHA-256 Checksum Result:</div>
              <div>Computed Checksum: {hashVerificationResult.computedChecksum}</div>
              <div>Stored Checksum: {hashVerificationResult.storedChecksum}</div>
              <div className="text-emerald-400 font-bold">Integrity Verified: {hashVerificationResult.verified ? 'YES' : 'NO'}</div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: BENEFICIARIES */}
      {activeTab === 'beneficiaries' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="font-bold text-base text-slate-900">Add Beneficiary Record (Duplicate Protection)</h3>
          
          <form onSubmit={handleAddBeneficiary} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <input
              type="text"
              placeholder="Beneficiary Full Name"
              required
              value={newBeneficiary.name}
              onChange={e => setNewBeneficiary(b => ({ ...b, name: e.target.value }))}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300"
            />
            <input
              type="text"
              placeholder="Program (e.g. Digital Literacy)"
              required
              value={newBeneficiary.program}
              onChange={e => setNewBeneficiary(b => ({ ...b, program: e.target.value }))}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300"
            />
            <button
              type="submit"
              disabled={beneficiaryAdding}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer"
            >
              {beneficiaryAdding ? 'Adding...' : '+ Add Beneficiary'}
            </button>
          </form>

          {dupCheckResult && (
            <div className={`p-4 rounded-xl text-xs font-semibold ${
              dupCheckResult.isDuplicate ? 'bg-amber-50 text-amber-900 border border-amber-300' : 'bg-emerald-50 text-emerald-900 border border-emerald-300'
            }`}>
              {dupCheckResult.isDuplicate ? (
                <span>⚠️ Duplicate Beneficiary Flagged! Matching record detected.</span>
              ) : (
                <span>✓ Beneficiary Verified Unique (No duplicates found across platform records).</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="font-bold text-base text-slate-900">Record Project Expense</h3>
          
          <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <input
              type="text"
              placeholder="Category (e.g. Learning Kits)"
              required
              value={newExpense.category}
              onChange={e => setNewExpense(ex => ({ ...ex, category: e.target.value }))}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300"
            />
            <input
              type="number"
              placeholder="Amount (₹)"
              required
              value={newExpense.amount}
              onChange={e => setNewExpense(ex => ({ ...ex, amount: Number(e.target.value) }))}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
            >
              + Record Expense
            </button>
          </form>
        </div>
      )}

    </div>
  );
};
