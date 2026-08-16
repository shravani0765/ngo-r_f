import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Building2, FolderKanban, Wallet, BarChart3, FileText, 
  Bell, HelpCircle, Settings, ShieldAlert, Heart, Eye, Network, CheckCircle2, UserCheck
} from 'lucide-react';

interface SidebarProps {
  role: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 hidden md:block min-h-[calc(100vh-4rem)] p-4">
      <div className="space-y-6">
        
        {/* NGO Navigation Items */}
        {role === 'NGO' && (
          <nav className="space-y-1 text-xs font-semibold">
            <div className="text-[10px] font-extrabold uppercase text-slate-400 px-3 pb-1 tracking-wider">
              NGO Workspace
            </div>
            
            <NavLink
              to="/ngo/dashboard"
              className={({ isActive }) =>
                `flex items-center space-x-2.5 px-3 py-2.5 rounded-xl transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4 text-blue-600" />
              <span>Dashboard</span>
            </NavLink>

            {/* My NGO Group */}
            <div className="pt-2">
              <div className="flex items-center space-x-2.5 px-3 py-1.5 text-slate-700 font-bold">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>My NGO</span>
              </div>
              <div className="pl-7 space-y-1 pt-1">
                <NavLink to="/ngo/dashboard#profile" className="block py-1.5 px-2 text-slate-500 hover:text-blue-700">
                  Profile Details
                </NavLink>
                <NavLink to="/ngo/dashboard#documents" className="block py-1.5 px-2 text-slate-500 hover:text-blue-700">
                  Documents
                </NavLink>
                <NavLink to="/ngo/dashboard#verification" className="block py-1.5 px-2 text-slate-500 hover:text-blue-700">
                  Verification Status
                </NavLink>
              </div>
            </div>

            {/* Projects Group */}
            <div className="pt-2">
              <div className="flex items-center space-x-2.5 px-3 py-1.5 text-slate-700 font-bold">
                <FolderKanban className="w-4 h-4 text-teal-600" />
                <span>Projects</span>
              </div>
              <div className="pl-7 space-y-1 pt-1">
                <NavLink to="/ngo/dashboard#projects" className="block py-1.5 px-2 text-slate-500 hover:text-blue-700">
                  My Projects
                </NavLink>
                <NavLink to="/ngo/dashboard#add-project" className="block py-1.5 px-2 text-slate-500 hover:text-blue-700">
                  + Add Project
                </NavLink>
              </div>
            </div>

            {/* Money Group */}
            <div className="pt-2">
              <div className="flex items-center space-x-2.5 px-3 py-1.5 text-slate-700 font-bold">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span>Money</span>
              </div>
              <div className="pl-7 space-y-1 pt-1">
                <NavLink to="/ngo/dashboard#donations" className="block py-1.5 px-2 text-slate-500 hover:text-blue-700">
                  Donations Received
                </NavLink>
                <NavLink to="/ngo/dashboard#expenses" className="block py-1.5 px-2 text-slate-500 hover:text-blue-700">
                  Expenses & Utilization
                </NavLink>
              </div>
            </div>

            {/* Impact Group */}
            <div className="pt-2">
              <div className="flex items-center space-x-2.5 px-3 py-1.5 text-slate-700 font-bold">
                <BarChart3 className="w-4 h-4 text-amber-600" />
                <span>Impact</span>
              </div>
              <div className="pl-7 space-y-1 pt-1">
                <NavLink to="/ngo/dashboard#beneficiaries" className="block py-1.5 px-2 text-slate-500 hover:text-blue-700">
                  Beneficiaries Reached
                </NavLink>
                <NavLink to="/ngo/dashboard#transparency" className="block py-1.5 px-2 text-slate-500 hover:text-blue-700">
                  Transparency Score
                </NavLink>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-1">
              <NavLink to="/ngo/dashboard#reports" className="flex items-center space-x-2.5 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-xl">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Reports</span>
              </NavLink>

              <NavLink to="/ngo/dashboard#notifications" className="flex items-center space-x-2.5 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-xl">
                <Bell className="w-4 h-4 text-slate-500" />
                <span>Notifications</span>
              </NavLink>

              <a href="#help" className="flex items-center space-x-2.5 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-xl">
                <HelpCircle className="w-4 h-4 text-slate-500" />
                <span>Help & AI Assistant</span>
              </a>
            </div>
          </nav>
        )}

        {/* DONOR Navigation */}
        {role === 'DONOR' && (
          <nav className="space-y-1 text-xs font-semibold">
            <div className="text-[10px] font-extrabold uppercase text-slate-400 px-3 pb-1 tracking-wider">
              Donor Portal
            </div>

            <NavLink to="/donor/dashboard" className="flex items-center space-x-2.5 px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-900 font-bold">
              <LayoutDashboard className="w-4 h-4 text-emerald-600" />
              <span>My Contributions</span>
            </NavLink>

            <NavLink to="/public/directory" className="flex items-center space-x-2.5 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl">
              <Heart className="w-4 h-4 text-emerald-600" />
              <span>Find Verified Causes</span>
            </NavLink>

            <NavLink to="/ledger" className="flex items-center space-x-2.5 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl">
              <Network className="w-4 h-4 text-blue-600" />
              <span>Track My Donation</span>
            </NavLink>
          </nav>
        )}

        {/* ADMIN Navigation */}
        {role === 'ADMIN' && (
          <nav className="space-y-1 text-xs font-semibold">
            <div className="text-[10px] font-extrabold uppercase text-slate-400 px-3 pb-1 tracking-wider">
              Admin & Auditor Panel
            </div>

            <NavLink to="/admin/dashboard" className="flex items-center space-x-2.5 px-3 py-2.5 rounded-xl bg-purple-50 text-purple-900 font-bold">
              <ShieldAlert className="w-4 h-4 text-purple-600" />
              <span>Overview & Approvals</span>
            </NavLink>

            <NavLink to="/admin/dashboard#ngos" className="flex items-center space-x-2.5 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Review Pending NGOs</span>
            </NavLink>

            <NavLink to="/admin/dashboard#safety" className="flex items-center space-x-2.5 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Trust & Safety Alerts</span>
            </NavLink>

            <NavLink to="/whistleblower" className="flex items-center space-x-2.5 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>Auditor Reports</span>
            </NavLink>
          </nav>
        )}

      </div>
    </aside>
  );
};
