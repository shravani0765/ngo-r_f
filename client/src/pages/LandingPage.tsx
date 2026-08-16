import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ShieldCheck, HeartHandshake, Eye, Search, Building2, Heart, BarChart3, ChevronRight, Lock, FileText, Sparkles, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleQuickRoleSelect = async (role: 'NGO' | 'DONOR' | 'PUBLIC') => {
    const creds = {
      NGO: { email: 'ngo@ngocommons.demo', pass: 'NGO@123', path: '/ngo/dashboard' },
      DONOR: { email: 'donor@ngocommons.demo', pass: 'Donor@123', path: '/donor/dashboard' },
      PUBLIC: { email: 'public@ngocommons.demo', pass: 'Public@123', path: '/public/directory' },
    }[role];

    try {
      await login(creds.email, creds.pass);
      navigate(creds.path);
    } catch {
      navigate(creds.path);
    }
  };

  return (
    <div className="space-y-16 py-6 pb-20">

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-blue-900 via-slate-900 to-indigo-950 text-white p-8 sm:p-14 border border-slate-800 shadow-2xl">
        <div className="max-w-3xl space-y-6 relative z-10">
          
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Open Data & Transparency Platform for Social Good</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            BUILDING TRUST THROUGH <br />
            <span className="bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              VERIFIED SOCIAL IMPACT
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
            Discover verified NGOs, track donations transparently, and see the real-world impact created by social welfare projects.
          </p>

          {/* Core Simple Value Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            {[
              'Verified NGOs',
              'Transparent Donations',
              'AI-Assisted Fraud Detection',
              'Measurable Impact'
            ].map((badge, i) => (
              <div key={i} className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-xs font-semibold text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{badge}</span>
              </div>
            ))}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link
              to="/public/directory"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center space-x-2"
            >
              <span>Explore Verified NGOs</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            
            <Link
              to="/register"
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-sm backdrop-blur-sm transition-all"
            >
              Register Your NGO
            </Link>

            <Link
              to="/login"
              className="px-5 py-3 rounded-xl text-slate-300 hover:text-white font-semibold text-sm transition-colors"
            >
              Login
            </Link>
          </div>
        </div>

        {/* Decorative Grid Lines */}
        <div className="absolute right-0 bottom-0 w-1/2 h-full opacity-10 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
      </section>

      {/* Platform Statistics */}
      <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">Platform Impact at a Glance</h3>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
            Demo platform statistics
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 pt-2">
          <div className="space-y-1">
            <div className="text-3xl font-extrabold text-blue-900 tracking-tight">450+</div>
            <div className="text-xs font-semibold text-slate-600">Verified NGOs</div>
            <div className="text-[10px] text-slate-400">Identity & Darpan Verified</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-3xl font-extrabold text-indigo-900 tracking-tight">1,280+</div>
            <div className="text-xs font-semibold text-slate-600">Projects Tracked</div>
            <div className="text-[10px] text-slate-400">Education, Health, Climate</div>
          </div>

          <div className="space-y-1">
            <div className="text-3xl font-extrabold text-emerald-900 tracking-tight">₹48.5 Cr</div>
            <div className="text-xs font-semibold text-slate-600">Funds Tracked</div>
            <div className="text-[10px] text-slate-400">100% Traceable Records</div>
          </div>

          <div className="space-y-1">
            <div className="text-3xl font-extrabold text-teal-900 tracking-tight">2.4M+</div>
            <div className="text-xs font-semibold text-slate-600">People Reached</div>
            <div className="text-[10px] text-slate-400">Direct Beneficiaries</div>
          </div>

          <div className="space-y-1">
            <div className="text-3xl font-extrabold text-amber-900 tracking-tight">88/100</div>
            <div className="text-xs font-semibold text-slate-600">Avg Transparency</div>
            <div className="text-[10px] text-slate-400">Verified Data Integrity</div>
          </div>
        </div>
      </section>

      {/* How It Works (4 Simple Steps) */}
      <section id="how-it-works" className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">How It Works</h2>
          <p className="text-sm text-slate-600">
            A simple 4-step verification process designed for absolute transparency without technical complexity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {[
            {
              step: '01',
              title: 'NGOs Register',
              desc: 'NGOs submit registration documents, tax certificates (12A/80G), and active social projects.',
              color: 'border-blue-200 bg-blue-50/50 text-blue-900'
            },
            {
              step: '02',
              title: 'Information is Verified',
              desc: 'System checks government records and AI safety models evaluate document authenticity.',
              color: 'border-indigo-200 bg-indigo-50/50 text-indigo-900'
            },
            {
              step: '03',
              title: 'Donations are Tracked',
              desc: 'Every financial contribution creates a secure, traceable fund record.',
              color: 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
            },
            {
              step: '04',
              title: 'Impact is Reported',
              desc: 'NGOs upload verified proof of outcomes, showcasing clear beneficiary impact.',
              color: 'border-teal-200 bg-teal-50/50 text-teal-900'
            }
          ].map((item, idx) => (
            <div key={idx} className={`p-6 rounded-2xl border ${item.color} space-y-3 relative flex flex-col justify-between`}>
              <div className="space-y-2">
                <span className="text-2xl font-black opacity-40">{item.step}</span>
                <h3 className="font-extrabold text-base">{item.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-2">
          <span className="inline-block px-4 py-2 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
            ✨ That's it. No technical knowledge required.
          </span>
        </div>
      </section>

      {/* 3 Main Guided User Journeys */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-1">
          <h2 className="text-2xl font-extrabold text-slate-900">Choose Your Pathway</h2>
          <p className="text-xs text-slate-600">Select how you want to interact with the platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* NGO Journey */}
          <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">"I represent an NGO"</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Register your organization, verify credentials, list social projects, and demonstrate transparency to global donors.
              </p>
            </div>
            <button
              onClick={() => handleQuickRoleSelect('NGO')}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Register / Manage NGO</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Donor Journey */}
          <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">"I want to support a cause"</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Browse verified NGOs, contribute directly to vetted causes, and receive end-to-end fund movement tracking reports.
              </p>
            </div>
            <button
              onClick={() => handleQuickRoleSelect('DONOR')}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Find a Verified NGO</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Public / Researcher Journey */}
          <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">"I want to explore impact data"</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Access open transparency registries, view state-wise impact stats, evaluate Social Return on Investment (SROI), and search records.
              </p>
            </div>
            <button
              onClick={() => handleQuickRoleSelect('PUBLIC')}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Explore Impact Data</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* About Section */}
      <section id="about" className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 border border-slate-800 space-y-6">
        <div className="max-w-2xl space-y-3">
          <h2 className="text-2xl font-extrabold">About NGO Impact Commons</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Our mission is to make social welfare spending 100% transparent, accountable, and verifiable. By combining automated government checks, financial record integrity, and clear impact analytics, we ensure every rupee donated produces real, measurable social value.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <h4 className="font-bold text-xs text-blue-300">Identity Integrity</h4>
            <p className="text-[11px] text-slate-400">Simulated government checks across NGO Darpan, 12A, 80G, and PAN databases.</p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <h4 className="font-bold text-xs text-emerald-300">Fund Transparency</h4>
            <p className="text-[11px] text-slate-400">Cryptographic SHA-256 block ledger recording every financial transaction.</p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <h4 className="font-bold text-xs text-amber-300">Trust & Safety Check</h4>
            <p className="text-[11px] text-slate-400">AI anomaly detection checking beneficiary duplicates and financial consistency.</p>
          </div>
        </div>
      </section>

    </div>
  );
};
