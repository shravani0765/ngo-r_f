import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Award, Building2, Heart, ArrowRight, Wallet, Users, FolderKanban, ArrowDown } from 'lucide-react';
import api from '../services/api';
import { NGO } from '../types';

export const NGOProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [ngo, setNgo] = useState<NGO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNgo = async () => {
      try {
        if (id) {
          const res = await api.get(`/ngos/${id}`);
          setNgo(res.data);
        } else {
          const res = await api.get('/ngos');
          if (res.data.length > 0) {
            const detail = await api.get(`/ngos/${res.data[0].id}`);
            setNgo(detail.data);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNgo();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-xs text-slate-500">Loading NGO Profile...</div>;
  if (!ngo) return <div className="p-8 text-center text-xs text-slate-500">NGO Profile Not Found.</div>;

  return (
    <div className="space-y-8 pb-16">
      
      {/* NGO Top Header */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-extrabold text-slate-900">{ngo.name}</h1>
              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified NGO</span>
              </span>
            </div>

            <p className="text-xs text-slate-500">Reg No: {ngo.regNum} • Registered in {ngo.state}</p>
          </div>

          <Link
            to="/donor/dashboard"
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors flex items-center space-x-2"
          >
            <Heart className="w-4 h-4" />
            <span>Support This NGO</span>
          </Link>
        </div>

        {/* Key Scores Pill */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/60 space-y-1">
            <div className="text-[10px] font-bold text-amber-800 uppercase">Transparency Score</div>
            <div className="text-2xl font-black text-amber-900">{ngo.transparencyScore || 92} / 100</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/60 space-y-1">
            <div className="text-[10px] font-bold text-blue-800 uppercase">Social Impact Score</div>
            <div className="text-2xl font-black text-blue-900">88 / 100</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 space-y-1">
            <div className="text-[10px] font-bold text-emerald-800 uppercase">Verified Projects</div>
            <div className="text-2xl font-black text-emerald-900">{ngo.projects?.length || 4} Active</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200/60 space-y-1">
            <div className="text-[10px] font-bold text-purple-800 uppercase">People Reached</div>
            <div className="text-2xl font-black text-purple-900">8,400+</div>
          </div>
        </div>
      </div>

      {/* ABOUT */}
      <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h2 className="font-extrabold text-slate-900 text-lg">ABOUT</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          {ngo.name} is a verified social organization working across {ngo.state} to deliver high-impact programs in {ngo.sector || 'Education, Rural Health, and Community Welfare'}. All financial records, audit reports, and project outcomes are independently verified on the platform.
        </p>
      </div>

      {/* MONEY TRANSPARENCY BAR */}
      <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-slate-900 text-lg">MONEY TRANSPARENCY</h2>
          <span className="text-xs font-bold text-emerald-700">100% Traceable Records</span>
        </div>

        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <div className="text-slate-400 font-bold uppercase text-[10px]">Funds Received</div>
            <div className="text-xl font-black text-slate-900">₹10.0L</div>
          </div>

          <div className="space-y-1">
            <div className="text-slate-400 font-bold uppercase text-[10px]">Funds Utilized</div>
            <div className="text-xl font-black text-emerald-700">₹7.2L</div>
          </div>

          <div className="space-y-1">
            <div className="text-slate-400 font-bold uppercase text-[10px]">Remaining Balance</div>
            <div className="text-xl font-black text-blue-700">₹2.8L</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 h-full w-[72%]" title="72% Utilized" />
            <div className="bg-blue-400 h-full w-[28%]" title="28% Remaining" />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-medium">
            <span>72% Utilized for Verified Expenses</span>
            <span>28% Available for Ongoing Projects</span>
          </div>
        </div>
      </div>

      {/* WHERE YOUR MONEY GOES VISUAL FLOW */}
      <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h2 className="font-extrabold text-slate-900 text-lg">WHERE YOUR MONEY GOES</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
          
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto text-xs font-bold">1</div>
            <h4 className="font-bold text-xs text-slate-900">Donation</h4>
            <p className="text-[10px] text-slate-600">Donor contributes securely online</p>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto text-xs font-bold">2</div>
            <h4 className="font-bold text-xs text-slate-900">Project Allocation</h4>
            <p className="text-[10px] text-slate-600">Funds assigned to specific cause</p>
          </div>

          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 space-y-2">
            <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center mx-auto text-xs font-bold">3</div>
            <h4 className="font-bold text-xs text-slate-900">Verified Expenses</h4>
            <p className="text-[10px] text-slate-600">Supplies & infrastructure purchased</p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto text-xs font-bold">4</div>
            <h4 className="font-bold text-xs text-slate-900">Beneficiaries Reached</h4>
            <p className="text-[10px] text-slate-600">Direct impact delivered to citizens</p>
          </div>

        </div>
      </div>

      {/* PROJECTS LIST */}
      <div className="space-y-4">
        <h2 className="font-extrabold text-slate-900 text-lg">ACTIVE PROJECTS</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ngo.projects?.map(p => (
            <div key={p.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-base text-slate-900">{p.title}</h3>
                <span className="px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">{p.category}</span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{p.description}</p>

              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-2 border-t border-slate-100">
                <span>Target Budget: ₹{p.budget?.toLocaleString()}</span>
                <span>Beneficiaries: {p.expectedBeneficiaries}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
