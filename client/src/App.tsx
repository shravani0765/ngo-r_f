import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  BrowserRouter, Routes, Route, Link, NavLink, Navigate, useNavigate, useLocation
} from 'react-router-dom';
import { api, token, User, Note } from './lib/api';
import { ToastHost, Btn, Badge, Loading } from './lib/ui';

import { Home, Directory, NgoProfile, Gallery, Ledger, ReportConcern, ApiDocs } from './pages/Public';
import { SignIn, Register, ForgotPassword, ResetPassword } from './pages/Account';
import { NgoWorkspace } from './pages/Ngo';
import { DonorHome } from './pages/Donor';
import { AdminPanel } from './pages/Admin';

/* -- Auth ---------------------------------------------------------------- */

interface AuthState {
  user: User | null;
  loading: boolean;
  notes: Note[];
  unread: number;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => void;
  refresh: () => Promise<void>;
  refreshNotes: () => Promise<void>;
}

const AuthCtx = createContext<AuthState>(null as any);
export const useAuth = () => useContext(AuthCtx);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);

  const refreshNotes = useCallback(async () => {
    if (!token.get()) return;
    try {
      const r = await api.get<{ items: Note[]; unreadCount: number }>('/notifications');
      setNotes(r.items);
      setUnread(r.unreadCount);
    } catch { /* notifications are non-critical */ }
  }, []);

  const refresh = useCallback(async () => {
    if (!token.get()) { setUser(null); setLoading(false); return; }
    try {
      const r = await api.get<{ user: User }>('/auth/me');
      setUser(r.user);
      await refreshNotes();
    } catch {
      token.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [refreshNotes]);

  useEffect(() => { refresh(); }, [refresh]);

  const signIn = async (email: string, password: string) => {
    const r = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    token.set(r.token);
    setUser(r.user);
    await refreshNotes();
    return r.user;
  };

  const signOut = () => {
    token.clear();
    setUser(null);
    setNotes([]);
    setUnread(0);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, notes, unread, signIn, signOut, refresh, refreshNotes }}>
      {children}
    </AuthCtx.Provider>
  );
}

/** Where each role lands after signing in. */
export function homeFor(role?: string) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'NGO') return '/ngo';
  if (role === 'DONOR') return '/donor';
  return '/directory';
}

function Protected({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading label="Checking your sign-in…" />;
  if (!user) return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}

/* -- Chrome -------------------------------------------------------------- */

const publicLinks = [
  { to: '/directory', label: 'Find NGOs' },
  { to: '/gallery', label: 'Impact gallery' },
  { to: '/ledger', label: 'Fund records' },
  { to: '/report', label: 'Report a concern' }
];

function Header() {
  const { user, signOut, unread } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-slate-900">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-700 text-sm text-white">NI</span>
          <span className="hidden sm:inline">NGO Impact Commons</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {publicLinks.map(l => <NavLink key={l.to} to={l.to} className={linkCls}>{l.label}</NavLink>)}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <NavLink to={homeFor(user.role)} className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:flex">
                My dashboard
                {unread > 0 && <Badge tone="blue">{unread}</Badge>}
              </NavLink>
              <Btn variant="ghost" onClick={() => { signOut(); navigate('/'); }}>Sign out</Btn>
            </>
          ) : (
            <>
              <Link to="/signin" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Sign in</Link>
              <Link to="/register" className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">Register</Link>
            </>
          )}
          <button
            onClick={() => setOpen(o => !o)}
            aria-label="Menu"
            aria-expanded={open}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          >
            <span className="block h-0.5 w-5 bg-current" />
            <span className="mt-1 block h-0.5 w-5 bg-current" />
            <span className="mt-1 block h-0.5 w-5 bg-current" />
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-slate-200 bg-white px-4 py-2 md:hidden">
          {publicLinks.map(l => (
            <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {l.label}
            </NavLink>
          ))}
          {user && (
            <NavLink to={homeFor(user.role)} onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              My dashboard
            </NavLink>
          )}
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>NGO Impact Data Commons — verified organisations, traceable funds.</p>
        <Link to="/api-docs" className="font-medium text-slate-700 hover:text-blue-700">Open data API</Link>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastHost>
        <AuthProvider>
          <div className="flex min-h-screen flex-col bg-slate-50">
            <Header />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/directory" element={<Directory />} />
                <Route path="/ngos/:id" element={<NgoProfile />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/ledger" element={<Ledger />} />
                <Route path="/report" element={<ReportConcern />} />
                <Route path="/api-docs" element={<ApiDocs />} />

                <Route path="/signin" element={<SignIn />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                <Route path="/ngo/*" element={
                  <Protected roles={['NGO', 'ADMIN']}><NgoWorkspace /></Protected>
                } />
                <Route path="/donor/*" element={
                  <Protected roles={['DONOR', 'ADMIN']}><DonorHome /></Protected>
                } />
                <Route path="/admin/*" element={
                  <Protected roles={['ADMIN']}><AdminPanel /></Protected>
                } />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </ToastHost>
    </BrowserRouter>
  );
}
