import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, User as UserIcon, LogOut, CheckCircle2, Heart, HelpCircle, 
  BarChart2, Code, Sparkles, ChevronDown, Building2, UserCheck, ShieldAlert,
  Menu, X, ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Navbar: React.FC = () => {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getDashboardPath = () => {
    if (!user) return '/public/directory';
    switch (user.role) {
      case 'ADMIN': return '/admin/dashboard';
      case 'NGO': return '/ngo/dashboard';
      case 'DONOR': return '/donor/dashboard';
      default: return '/public/directory';
    }
  };

  const handleDemoLogin = async (role: 'NGO' | 'DONOR' | 'ADMIN' | 'PUBLIC') => {
    const creds = {
      ADMIN: { email: 'admin@ngocommons.demo', pass: 'Admin@123', path: '/admin/dashboard', title: 'Platform Admin' },
      NGO: { email: 'ngo@ngocommons.demo', pass: 'NGO@123', path: '/ngo/dashboard', title: 'NGO Representative' },
      DONOR: { email: 'donor@ngocommons.demo', pass: 'Donor@123', path: '/donor/dashboard', title: 'Donor' },
      PUBLIC: { email: 'public@ngocommons.demo', pass: 'Public@123', path: '/public/directory', title: 'Public User' },
    }[role];

    try {
      await login(creds.email, creds.pass);
      showToast(`Logged in as ${creds.title}`, 'success');
      setShowDemoModal(false);
      setMobileMenuOpen(false);
      navigate(creds.path);
    } catch (err) {
      showToast('Login failed', 'error');
    }
  };

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully', 'info');
    navigate('/');
    setMobileMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Brand Identity */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-all">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">NGO IMPACT</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                  COMMONS
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 hidden sm:block">
                Verified Impact • Transparent Funds • Trusted NGOs
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 text-xs font-semibold text-slate-600">
            <Link 
              to="/" 
              className={`transition-colors ${isActive('/') ? 'text-blue-700 font-bold' : 'hover:text-blue-700'}`}
            >
              Home
            </Link>
            <Link 
              to="/public/directory" 
              className={`flex items-center space-x-1 transition-colors ${isActive('/public/directory') ? 'text-blue-700 font-bold' : 'hover:text-blue-700'}`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Find NGOs</span>
            </Link>
            <a href="/#how-it-works" className="hover:text-blue-700 transition-colors flex items-center space-x-1">
              <HelpCircle className="w-4 h-4 text-amber-500" />
              <span>How It Works</span>
            </a>
            <Link 
              to="/public/impact" 
              className={`flex items-center space-x-1 transition-colors ${isActive('/public/impact') ? 'text-blue-700 font-bold' : 'hover:text-blue-700'}`}
            >
              <BarChart2 className="w-4 h-4 text-blue-500" />
              <span>Impact Data</span>
            </Link>

            {/* Developer / Technical Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDevMenu(!showDevMenu)}
                className="hover:text-blue-700 transition-colors flex items-center space-x-1 text-slate-500 py-1"
              >
                <Code className="w-3.5 h-3.5" />
                <span>Dev Tools</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {showDevMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <Link
                    to="/ledger"
                    onClick={() => setShowDevMenu(false)}
                    className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                  >
                    Secure Fund Records
                  </Link>
                  <Link
                    to="/system-flow"
                    onClick={() => setShowDevMenu(false)}
                    className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                  >
                    System Architecture Flow
                  </Link>
                  <Link
                    to="/api-docs"
                    onClick={() => setShowDevMenu(false)}
                    className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                  >
                    API Documentation & Schemas
                  </Link>
                  <Link
                    to="/whistleblower"
                    onClick={() => setShowDevMenu(false)}
                    className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 border-t border-slate-100"
                  >
                    Auditor & Whistleblower Portal
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* User Actions & Mobile Hamburger */}
          <div className="flex items-center space-x-3">
            
            {/* Try Demo Launcher */}
            <button
              onClick={() => setShowDemoModal(true)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-105"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Try Demo</span>
              <span className="sm:hidden">Demo</span>
            </button>

            {user ? (
              <div className="hidden sm:flex items-center space-x-2">
                <Link 
                  to={getDashboardPath()}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-semibold border border-blue-200 transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-blue-700" />
                  <span>{user.name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold">
                    {user.role}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-colors"
                >
                  Register NGO
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

          </div>

        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-24 z-50 bg-white border-b border-slate-200 shadow-2xl p-4 animate-in slide-in-from-top-2 space-y-4">
          <nav className="flex flex-col space-y-2 text-xs font-semibold text-slate-700">
            <Link 
              to="/" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg hover:bg-slate-50 hover:text-blue-600"
            >
              Home
            </Link>
            <Link 
              to="/public/directory" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg hover:bg-slate-50 hover:text-blue-600 flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Find Verified NGOs</span>
            </Link>
            <Link 
              to="/public/impact" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg hover:bg-slate-50 hover:text-blue-600 flex items-center space-x-2"
            >
              <BarChart2 className="w-4 h-4 text-blue-500" />
              <span>Impact Data Analytics</span>
            </Link>
            <Link 
              to="/ledger" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg hover:bg-slate-50 hover:text-blue-600"
            >
              Cryptographic Fund Ledger
            </Link>
            <Link 
              to="/api-docs" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg hover:bg-slate-50 hover:text-blue-600"
            >
              API Documentation
            </Link>
          </nav>

          <div className="pt-3 border-t border-slate-100 flex flex-col space-y-2">
            {user ? (
              <>
                <Link
                  to={getDashboardPath()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 px-4 rounded-lg bg-blue-600 text-white font-bold text-xs shadow-sm"
                >
                  Go to {user.role} Dashboard ({user.name})
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-center py-2 px-4 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold text-xs"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 rounded-lg bg-blue-700 text-white font-semibold text-xs"
                >
                  Register NGO
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* One-Click Demo Role Selector Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-base">Select One-Click Demo Role</h3>
              </div>
              <button
                onClick={() => setShowDemoModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Explore the platform instantly without entering passwords. Select any persona to test feature views:
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => handleDemoLogin('NGO')}
                className="flex flex-col items-start p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-left transition-all group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs text-slate-900">NGO Representative</span>
                <span className="text-[10px] text-slate-500">Manage org & projects</span>
              </button>

              <button
                onClick={() => handleDemoLogin('DONOR')}
                className="flex flex-col items-start p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition-all group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Heart className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs text-slate-900">Donor</span>
                <span className="text-[10px] text-slate-500">Support verified causes</span>
              </button>

              <button
                onClick={() => handleDemoLogin('ADMIN')}
                className="flex flex-col items-start p-3.5 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 text-left transition-all group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs text-slate-900">Platform Admin</span>
                <span className="text-[10px] text-slate-500">Review & safety auditor</span>
              </button>

              <button
                onClick={() => handleDemoLogin('PUBLIC')}
                className="flex flex-col items-start p-3.5 rounded-xl border border-slate-200 hover:border-slate-500 hover:bg-slate-50 text-left transition-all group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <UserCheck className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs text-slate-900">Public User</span>
                <span className="text-[10px] text-slate-500">Search directory & impact</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-400 text-center italic">
              Note: Pre-seeded data is used for demonstration purposes.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
