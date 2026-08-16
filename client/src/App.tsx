import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AIChatbot } from './components/AIChatbot';
import { DemoModeGuide } from './components/DemoModeGuide';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NGODashboard } from './pages/NGODashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { DonorDashboard } from './pages/DonorDashboard';
import { PublicDirectory } from './pages/PublicDirectory';
import { NGOProfilePage } from './pages/NGOProfilePage';
import { PublicImpactDashboard } from './pages/PublicImpactDashboard';
import { LedgerPage } from './pages/LedgerPage';
import { SystemFlowPage } from './pages/SystemFlowPage';
import { ApiDocsPage } from './pages/ApiDocsPage';
import { WhistleblowerPage } from './pages/WhistleblowerPage';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-xs text-slate-500">Authenticating...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// Main Layout Wrapper
const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const role = user?.role || 'PUBLIC';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <div className="flex flex-1">
        {user && <Sidebar role={role} />}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
      <AIChatbot />
      <DemoModeGuide />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <Router>
        <DashboardLayout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Public Routes */}
            <Route path="/public/directory" element={<PublicDirectory />} />
            <Route path="/public/ngos/:id" element={<NGOProfilePage />} />
            <Route path="/public/impact" element={<PublicImpactDashboard />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/system-flow" element={<SystemFlowPage />} />
            <Route path="/api-docs" element={<ApiDocsPage />} />
            <Route path="/whistleblower" element={<WhistleblowerPage />} />

            {/* NGO Dashboard Routes */}
            <Route path="/ngo/*" element={
              <ProtectedRoute allowedRoles={['NGO', 'ADMIN']}>
                <NGODashboard />
              </ProtectedRoute>
            } />

            {/* Admin Dashboard Routes */}
            <Route path="/admin/*" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* Donor Dashboard Routes */}
            <Route path="/donor/*" element={
              <ProtectedRoute allowedRoles={['DONOR', 'ADMIN']}>
                <DonorDashboard />
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DashboardLayout>
      </Router>
    </AuthProvider>
  );
}

export default App;
