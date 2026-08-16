import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Heart, UserCheck, ShieldCheck, CheckCircle2, ArrowRight, ArrowLeft, Upload, FileText, Sparkles, Clock, AlertCircle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<'NGO' | 'DONOR' | 'PUBLIC'>('NGO');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    password: '',

    // Step 2: Org Details
    registrationNumber: '',
    panNumber: '',
    darpanId: '',
    tax12A: '',
    tax80G: '',
    address: '',
    state: 'Maharashtra',
    district: 'Mumbai',
    sector: 'Education',

    // Step 3: Documents
    docReg: false,
    docPan: false,
    doc12A: false,
    doc80G: false,
    docAudit: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.password) {
        setError('Please fill in all required basic fields.');
        return;
      }
      setError(null);
      setStep(2);
    } else if (step === 2) {
      setError(null);
      setStep(3);
    }
  };

  const handleSubmitFinal = async () => {
    setLoading(true);
    setError(null);

    try {
      await register(formData.email, formData.password, formData.name, role, formData.phone);

      if (role === 'NGO') {
        setStep(4); // Submitted success screen
      } else {
        navigate(role === 'DONOR' ? '/donor/dashboard' : '/public/directory');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      
      {/* Title Header */}
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Simple 3-Step NGO Onboarding</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Join the Verified Impact Network
        </h1>
        <p className="text-sm text-slate-600">
          Create an account to demonstrate transparent social outcomes and connect with donors.
        </p>
      </div>

      {/* Role Selection Tabs (NO PUBLIC ADMIN SELECTION ALLOWED) */}
      {step < 4 && (
        <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center mb-8 border border-slate-200">
          <button
            type="button"
            onClick={() => { setRole('NGO'); setStep(1); }}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
              role === 'NGO' ? 'bg-white text-blue-900 shadow-sm border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>NGO / Non-Profit</span>
          </button>

          <button
            type="button"
            onClick={() => { setRole('DONOR'); setStep(1); }}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
              role === 'DONOR' ? 'bg-white text-emerald-900 shadow-sm border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Heart className="w-4 h-4 text-emerald-600" />
            <span>Individual / CSR Donor</span>
          </button>

          <button
            type="button"
            onClick={() => { setRole('PUBLIC'); setStep(1); }}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
              role === 'PUBLIC' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4 text-slate-600" />
            <span>Public Observer</span>
          </button>
        </div>
      )}

      {/* Progress Tracker Bar for NGO Registration */}
      {role === 'NGO' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-8">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-3">
            <span className={step >= 1 ? 'text-blue-700' : 'text-slate-400'}>1. Registration {step > 1 ? '✓' : ''}</span>
            <span className={step >= 2 ? 'text-blue-700' : 'text-slate-400'}>2. Details {step > 2 ? '✓' : ''}</span>
            <span className={step >= 3 ? 'text-blue-700' : 'text-slate-400'}>3. Documents {step > 3 ? '✓' : ''}</span>
            <span className={step === 4 ? 'text-amber-600' : 'text-slate-400'}>4. Verification ⏳</span>
            <span className="text-slate-400">5. Public Listing ○</span>
          </div>

          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
            <div className={`h-full transition-all duration-300 ${
              step === 1 ? 'w-1/5 bg-blue-600' : step === 2 ? 'w-2/5 bg-blue-600' : step === 3 ? 'w-3/5 bg-blue-600' : 'w-4/5 bg-emerald-500'
            }`} />
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold mb-6 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: BASIC INFORMATION */}
      {step === 1 && (
        <form onSubmit={handleNextStep} className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
          <h2 className="font-extrabold text-slate-900 text-lg border-b border-slate-100 pb-3">
            Step 1: Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700">Organization Name *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Hope Social Welfare Foundation"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Contact Person Name</label>
              <input
                type="text"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleChange}
                placeholder="e.g. Dr. Rajesh Kumar"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Official Phone</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Email Address *</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="contact@hopefoundation.org"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Password *</label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <Link to="/login" className="text-xs font-semibold text-slate-500 hover:text-slate-800">
              Already registered? Login here
            </Link>

            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center space-x-2 cursor-pointer shadow-sm"
            >
              <span>Continue →</span>
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: ORGANIZATION DETAILS */}
      {step === 2 && (
        <form onSubmit={handleNextStep} className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
          <h2 className="font-extrabold text-slate-900 text-lg border-b border-slate-100 pb-3">
            Step 2: Organization & Verification Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Registration Number</label>
              <input
                type="text"
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                placeholder="REG/2021/10452"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">PAN Number</label>
              <input
                type="text"
                name="panNumber"
                value={formData.panNumber}
                onChange={handleChange}
                placeholder="AAATH1234F"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">12A Certificate Reg.</label>
              <input
                type="text"
                name="tax12A"
                value={formData.tax12A}
                onChange={handleChange}
                placeholder="12A/APP/2022/98"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">80G Certificate Reg.</label>
              <input
                type="text"
                name="tax80G"
                value={formData.tax80G}
                onChange={handleChange}
                placeholder="80G/CERT/2022/45"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Primary Sector of Work</label>
              <select
                name="sector"
                value={formData.sector}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Education">Education & Digital Literacy</option>
                <option value="Healthcare">Healthcare & Nutrition</option>
                <option value="Women Empowerment">Women Empowerment</option>
                <option value="Environment">Environment & Rural Sanitation</option>
                <option value="Disaster Relief">Disaster Relief</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">State / Region</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="Maharashtra"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700">Registered Address</label>
              <textarea
                name="address"
                rows={2}
                value={formData.address}
                onChange={handleChange}
                placeholder="Plot No. 42, Sector 15, Vashi, Navi Mumbai, Maharashtra 400703"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center space-x-2 cursor-pointer shadow-sm"
            >
              <span>Continue →</span>
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: UPLOAD DOCUMENTS */}
      {step === 3 && (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
          <h2 className="font-extrabold text-slate-900 text-lg border-b border-slate-100 pb-3">
            Step 3: Upload Compliance Documents
          </h2>

          <p className="text-xs text-slate-600">
            Uploaded files are stored securely. Checksum integrity ensures document authenticity.
          </p>

          <div className="space-y-3">
            {[
              { key: 'docReg', name: 'Registration Certificate (Trust / Society Act)' },
              { key: 'docPan', name: 'NGO PAN Card Copy' },
              { key: 'doc12A', name: '12A Income Tax Exemption Certificate' },
              { key: 'doc80G', name: '80G Tax Deduction Certificate' },
              { key: 'docAudit', name: 'Latest Financial Audit Report (FY 2025-26)' },
            ].map((doc, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">{doc.name}</span>
                </div>

                <div className="flex items-center space-x-3">
                  {formData[doc.key as keyof typeof formData] ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>✓ Uploaded</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>⏳ Pending</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, [doc.key]: !prev[doc.key as keyof typeof formData] }))}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {formData[doc.key as keyof typeof formData] ? 'Replace' : 'Upload File'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleSubmitFinal}
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center space-x-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <span>{loading ? 'Submitting...' : 'Submit for Verification'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SUBMITTED FOR VERIFICATION SCREEN */}
      {step === 4 && (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">Your NGO has been submitted for verification!</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Your details and documents are now under review. You can track your progress from your NGO dashboard.
            </p>
          </div>

          {/* Submission Status Tracker */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left space-y-4 max-w-md mx-auto">
            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Verification Status Tracker</h4>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-emerald-700 font-bold">
                <span className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Registration</span>
                </span>
                <span>✓ Completed</span>
              </div>

              <div className="flex items-center justify-between text-emerald-700 font-bold">
                <span className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Documents Uploaded</span>
                </span>
                <span>✓ Completed</span>
              </div>

              <div className="flex items-center justify-between text-amber-700 font-bold">
                <span className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span>Government Verification</span>
                </span>
                <span>⏳ Processing</span>
              </div>

              <div className="flex items-center justify-between text-slate-400 font-medium">
                <span>Admin Review</span>
                <span>○ Pending</span>
              </div>

              <div className="flex items-center justify-between text-slate-400 font-medium">
                <span>Public Listing</span>
                <span>○ Pending</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/ngo/dashboard')}
            className="px-8 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
          >
            Go to NGO Dashboard
          </button>
        </div>
      )}

    </div>
  );
};
