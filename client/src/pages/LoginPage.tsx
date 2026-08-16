import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Sparkles, Building2, Heart, ShieldAlert, UserCheck, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      // Route based on role
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoPreset = async (role: 'NGO' | 'DONOR' | 'ADMIN' | 'PUBLIC') => {
    setLoading(true);
    setError(null);

    const presets = {
      NGO: { email: 'ngo@ngocommons.demo', pass: 'NGO@123', path: '/ngo/dashboard' },
      DONOR: { email: 'donor@ngocommons.demo', pass: 'Donor@123', path: '/donor/dashboard' },
      ADMIN: { email: 'admin@ngocommons.demo', pass: 'Admin@123', path: '/admin/dashboard' },
      PUBLIC: { email: 'public@ngocommons.demo', pass: 'Public@123', path: '/public/directory' },
    }[role];

    try {
      await login(presets.email, presets.pass);
      navigate(presets.path);
    } catch (err: any) {
      setError('Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4 space-y-6">
      
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-md">
          <Shield className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Login to NGO Impact Commons</h1>
        <p className="text-xs text-slate-600">Access your verified dashboard or track your contributions</p>
      </div>

      {/* ONE-CLICK DEMO LOGIN PRESETS GRID */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <h3 className="font-extrabold text-xs text-amber-900">One-Click Demo Login Presets</h3>
        </div>
        <p className="text-[11px] text-amber-800 leading-relaxed">
          Evaluators can click any card below to test the platform instantly:
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => handleDemoPreset('NGO')}
            disabled={loading}
            className="flex items-center space-x-2 p-2.5 rounded-xl bg-white border border-amber-200/80 hover:border-blue-500 hover:bg-blue-50/50 text-left transition-all group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">NGO</div>
              <div className="text-[10px] text-slate-500">Representative</div>
            </div>
          </button>

          <button
            onClick={() => handleDemoPreset('DONOR')}
            disabled={loading}
            className="flex items-center space-x-2 p-2.5 rounded-xl bg-white border border-amber-200/80 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-all group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
              <Heart className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">Donor</div>
              <div className="text-[10px] text-slate-500">Support Causes</div>
            </div>
          </button>

          <button
            onClick={() => handleDemoPreset('ADMIN')}
            disabled={loading}
            className="flex items-center space-x-2 p-2.5 rounded-xl bg-white border border-amber-200/80 hover:border-purple-500 hover:bg-purple-50/50 text-left transition-all group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">Admin</div>
              <div className="text-[10px] text-slate-500">Auditor Panel</div>
            </div>
          </button>

          <button
            onClick={() => handleDemoPreset('PUBLIC')}
            disabled={loading}
            className="flex items-center space-x-2 p-2.5 rounded-xl bg-white border border-amber-200/80 hover:border-slate-400 hover:bg-slate-50 text-left transition-all group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">Public</div>
              <div className="text-[10px] text-slate-500">Directory & Impact</div>
            </div>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Manual Login Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="e.g. ngo@ngocommons.demo"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Sign In'}
        </button>

        <div className="text-center pt-2 border-t border-slate-100">
          <Link to="/register" className="text-xs font-semibold text-slate-500 hover:text-blue-700">
            Don't have an NGO account? Register here
          </Link>
        </div>
      </form>

    </div>
  );
};
