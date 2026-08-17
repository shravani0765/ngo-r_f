import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Building2, Heart, ShieldAlert, UserCheck, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const QuickPersonaBar: React.FC = () => {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleQuickSwitch = async (role: 'NGO' | 'DONOR' | 'ADMIN' | 'PUBLIC') => {
    const creds = {
      ADMIN: { email: 'admin@ngocommons.demo', pass: 'Admin@123', path: '/admin/dashboard', title: 'Platform Admin' },
      NGO: { email: 'ngo@ngocommons.demo', pass: 'NGO@123', path: '/ngo/dashboard', title: 'NGO Representative' },
      DONOR: { email: 'donor@ngocommons.demo', pass: 'Donor@123', path: '/donor/dashboard', title: 'Donor' },
      PUBLIC: { email: 'public@ngocommons.demo', pass: 'Public@123', path: '/public/directory', title: 'Public User' },
    }[role];

    try {
      await login(creds.email, creds.pass);
      showToast(`Switched view to ${creds.title} persona`, 'success');
      navigate(creds.path);
    } catch (err) {
      showToast('Failed to switch persona', 'error');
    }
  };

  const handleLogout = () => {
    logout();
    showToast('Logged out to Public view', 'info');
    navigate('/');
  };

  return (
    <div className="bg-slate-900 text-white text-xs py-2 px-4 border-b border-slate-800 shadow-inner">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        
        {/* Left Status Indicator */}
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-slate-300">
            Interactive Evaluator Mode:
          </span>
          <span className="text-slate-400 hidden md:inline">
            Click any role to test platform features instantly
          </span>
        </div>

        {/* Quick Role Switcher Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => handleQuickSwitch('NGO')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              user?.role === 'NGO'
                ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Test NGO Dashboard & Document Verification"
          >
            <Building2 className="w-3 h-3 text-blue-400" />
            <span>NGO</span>
          </button>

          <button
            onClick={() => handleQuickSwitch('DONOR')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              user?.role === 'DONOR'
                ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Test Donor Dashboard & Cause Support"
          >
            <Heart className="w-3 h-3 text-emerald-400" />
            <span>Donor</span>
          </button>

          <button
            onClick={() => handleQuickSwitch('ADMIN')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              user?.role === 'ADMIN'
                ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Test Admin Safety Audit & Approval Workflow"
          >
            <ShieldAlert className="w-3 h-3 text-purple-400" />
            <span>Admin</span>
          </button>

          <button
            onClick={() => handleQuickSwitch('PUBLIC')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              !user || user?.role === 'PUBLIC'
                ? 'bg-slate-700 text-white shadow-md ring-2 ring-slate-400/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Explore Public Directory & Impact Data"
          >
            <UserCheck className="w-3 h-3 text-amber-400" />
            <span>Public</span>
          </button>

          {user && (
            <button
              onClick={handleLogout}
              className="text-[10px] text-slate-400 hover:text-rose-400 underline ml-2 transition-colors"
            >
              Reset
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
