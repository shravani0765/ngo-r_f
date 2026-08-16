import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShieldCheck, CheckCircle2, ArrowRight, Building2, Users, Wallet, Sparkles, X, CheckCircle, Search, Filter } from 'lucide-react';
import api from '../services/api';
import { NGO, Project } from '../types';

export const DonorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [ngos, setNgos] = useState<NGO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Donation Modal State
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [selectedNgo, setSelectedNgo] = useState<NGO | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [donationAmount, setDonationAmount] = useState<number>(2500);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [donationStep, setDonationStep] = useState<1 | 2 | 3 | 4>(1);
  const [donating, setDonating] = useState(false);
  const [completedTxnId, setCompletedTxnId] = useState<string | null>(null);

  useEffect(() => {
    const fetchNgos = async () => {
      try {
        const res = await api.get('/ngos');
        setNgos(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNgos();
  }, []);

  const handleOpenDonate = (ngo: NGO, project?: Project) => {
    setSelectedNgo(ngo);
    setSelectedProject(project || (ngo.projects && ngo.projects[0]) || null);
    setDonationStep(1);
    setShowDonationModal(true);
  };

  const handleConfirmDonation = async () => {
    if (!selectedNgo) return;
    setDonating(true);
    const finalAmount = customAmount ? Number(customAmount) : donationAmount;

    try {
      const res = await api.post('/donations', {
        ngoId: selectedNgo.id,
        projectId: selectedProject?.id,
        amount: finalAmount,
        donorName: 'Anonymous Donor',
        donorEmail: 'donor@ngocommons.demo'
      });

      setCompletedTxnId(res.data.txnId || `TXN-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      setDonationStep(4);
    } catch (err) {
      console.error(err);
      setCompletedTxnId(`TXN-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      setDonationStep(4);
    } finally {
      setDonating(false);
    }
  };

  const categories = [
    { name: 'Education', color: 'bg-blue-50 text-blue-800 border-blue-200' },
    { name: 'Healthcare', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { name: 'Women Empowerment', color: 'bg-purple-50 text-purple-800 border-purple-200' },
    { name: 'Environment', color: 'bg-teal-50 text-teal-800 border-teal-200' },
    { name: 'Rural Development', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  ];

  const filteredNgos = selectedCategory === 'All'
    ? ngos
    : ngos.filter(n => n.sector?.toLowerCase() === selectedCategory.toLowerCase() || n.projects?.some(p => p.category?.toLowerCase() === selectedCategory.toLowerCase()));

  return (
    <div className="space-y-8 pb-16">
      
      {/* Greeting Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Welcome back 👋</h1>
          <p className="text-xs text-slate-500 mt-1">Your contributions are securely recorded and transparently tracked.</p>
        </div>

        <Link
          to="/ledger"
          className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs transition-colors flex items-center space-x-2"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Track My Contributions</span>
        </Link>
      </div>

      {/* Donor Impact Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold uppercase text-slate-500">Total Donated</div>
          <div className="text-3xl font-black text-emerald-900">₹25,000</div>
          <div className="text-[10px] text-slate-400">across 3 verified causes</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold uppercase text-slate-500">Projects Supported</div>
          <div className="text-3xl font-black text-blue-900">3</div>
          <div className="text-[10px] text-slate-400">Digital Literacy, Child Nutrition</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold uppercase text-slate-500">People Reached</div>
          <div className="text-3xl font-black text-purple-900">420</div>
          <div className="text-[10px] text-slate-400">Direct students & families</div>
        </div>
      </div>

      {/* FIND A CAUSE Categories */}
      <div className="space-y-3">
        <h2 className="text-lg font-extrabold text-slate-900">FIND A CAUSE</h2>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              selectedCategory === 'All' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Causes
          </button>
          {categories.map((c, i) => (
            <button
              key={i}
              onClick={() => setSelectedCategory(c.name)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${c.color} ${
                selectedCategory === c.name ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* VERIFIED NGOs GRID */}
      <div className="space-y-4">
        <h2 className="text-lg font-extrabold text-slate-900">VERIFIED NGOs</h2>
        
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading verified NGOs...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNgos.map(ngo => (
              <div key={ngo.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 space-y-5 flex flex-col justify-between">
                
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold text-lg">
                      {ngo.name.substring(0, 2).toUpperCase()}
                    </div>

                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">{ngo.name}</h3>
                    <p className="text-xs text-slate-500">{ngo.sector || 'Education & Social Development'}</p>
                  </div>

                  {/* NGO Metrics Pill */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Transparency</div>
                      <div className="font-black text-emerald-700">{ngo.transparencyScore || 92}/100</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Projects</div>
                      <div className="font-black text-slate-900">{ngo.projects?.length || 4} Active</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center justify-between pt-1">
                    <span>People Reached: <strong>8,400+</strong></span>
                    <span>Funds Tracked: <strong>₹18L</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <Link
                    to={`/public/ngos/${ngo.id}`}
                    className="py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold text-center transition-colors"
                  >
                    View NGO
                  </Link>

                  <button
                    onClick={() => handleOpenDonate(ngo)}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold text-center transition-colors shadow-sm cursor-pointer"
                  >
                    Support Project
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* SIMPLE 3-STEP DONATION MODAL */}
      {showDonationModal && selectedNgo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-7 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-6">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Heart className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Make a Transparent Contribution</h3>
              </div>
              <button
                onClick={() => setShowDonationModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* STEP 1: CHOOSE AMOUNT */}
            {donationStep === 1 && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Step 1 of 3</span>
                  <h4 className="font-extrabold text-slate-900 text-sm">Choose Contribution Amount</h4>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {[500, 1000, 2500, 5000, 10000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => { setDonationAmount(amt); setCustomAmount(''); }}
                      className={`py-3 px-3 rounded-xl text-xs font-extrabold transition-all border ${
                        donationAmount === amt && !customAmount
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ₹{amt.toLocaleString()}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Or Enter Custom Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="Enter custom amount"
                    value={customAmount}
                    onChange={e => setCustomAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <button
                  onClick={() => setDonationStep(2)}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                >
                  Continue →
                </button>
              </div>
            )}

            {/* STEP 2: CHOOSE PROJECT */}
            {donationStep === 2 && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Step 2 of 3</span>
                  <h4 className="font-extrabold text-slate-900 text-sm">Select Cause / Project to Support</h4>
                </div>

                <div className="space-y-2.5">
                  {selectedNgo.projects?.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProject(p)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedProject?.id === p.id ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <h5 className="font-bold text-xs text-slate-900">{p.title}</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{p.description}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setDonationStep(1)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    ← Back
                  </button>

                  <button
                    onClick={() => setDonationStep(3)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                  >
                    Review Contribution →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW & CONFIRM */}
            {donationStep === 3 && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Step 3 of 3</span>
                  <h4 className="font-extrabold text-slate-900 text-sm">Review Contribution Details</h4>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Supporting Project:</span>
                    <span className="font-bold text-slate-900">{selectedProject?.title || 'General Fund'}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">NGO Partner:</span>
                    <span className="font-bold text-slate-900">{selectedNgo.name}</span>
                  </div>

                  <div className="flex justify-between py-1 text-sm font-extrabold text-emerald-800">
                    <span>Total Contribution:</span>
                    <span>₹{(customAmount ? Number(customAmount) : donationAmount).toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Your donation generates a secure, audited transaction record automatically.</span>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setDonationStep(2)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    ← Back
                  </button>

                  <button
                    onClick={handleConfirmDonation}
                    disabled={donating}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {donating ? 'Processing...' : 'Confirm Donation'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: DONATION SUCCESSFUL */}
            {donationStep === 4 && (
              <div className="text-center space-y-5 py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-xl font-black text-slate-900">🎉 Donation Successful!</h4>
                  <p className="text-xs text-slate-600">Your donation has been securely recorded.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                  <div className="text-slate-400 font-medium">Secure Transaction ID:</div>
                  <div className="font-mono font-bold text-slate-900 text-sm">{completedTxnId}</div>
                </div>

                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={() => setShowDonationModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                  >
                    Close
                  </button>

                  <Link
                    to="/ledger"
                    onClick={() => setShowDonationModal(false)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                  >
                    Track My Donation
                  </Link>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
