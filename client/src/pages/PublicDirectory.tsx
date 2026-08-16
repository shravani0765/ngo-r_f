import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, ShieldCheck, Award, MapPin, ArrowRight, Building2, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { NGO } from '../types';

export const PublicDirectory: React.FC = () => {
  const [ngos, setNgos] = useState<NGO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedSector, setSelectedSector] = useState('');

  useEffect(() => {
    const fetchVerifiedNGOs = async () => {
      setLoading(true);
      try {
        const res = await api.get('/public/ngos');
        // Filter strictly VERIFIED NGOs for public directory
        const verifiedOnly = res.data.filter((n: NGO) => n.status === 'VERIFIED');
        setNgos(verifiedOnly);
      } catch (err) {
        console.error('Failed to load directory', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVerifiedNGOs();
  }, []);

  const filteredNgos = ngos.filter((n) => {
    const matchesSearch = n.name.toLowerCase().includes(search.toLowerCase()) || n.areaOfWork.toLowerCase().includes(search.toLowerCase());
    const matchesState = selectedState ? n.state === selectedState : true;
    const matchesSector = selectedSector ? n.areaOfWork.toLowerCase().includes(selectedSector.toLowerCase()) : true;
    return matchesSearch && matchesState && matchesSector;
  });

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-8 shadow-xl">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>PUBLIC TRANSPARENCY REGISTRY</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Verified NGO Transparency Directory</h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            Public directory of government-verified social organizations meeting strict document hashing, 12A/80G tax compliance, and cryptographic donation ledger standards.
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by NGO name or key activity..."
            className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="text-xs p-2 border border-slate-200 rounded-xl bg-white text-slate-700 font-medium"
          >
            <option value="">All States</option>
            <option value="Delhi">Delhi</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Uttarakhand">Uttarakhand</option>
          </select>

          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="text-xs p-2 border border-slate-200 rounded-xl bg-white text-slate-700 font-medium"
          >
            <option value="">All Sectors</option>
            <option value="Education">Education</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Environment">Environment</option>
            <option value="Rural">Rural Development</option>
          </select>
        </div>
      </div>

      {/* NGO Grid Cards */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading verified directory...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredNgos.map((ngo) => (
            <div 
              key={ngo.id}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>VERIFIED NGO</span>
                  </span>
                  <div className="flex items-center space-x-1 text-blue-900 font-bold text-xs bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                    <Award className="w-3.5 h-3.5 text-blue-600" />
                    <span>Score: {ngo.transparencyScore}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{ngo.name}</h3>
                  <div className="flex items-center space-x-1 text-[11px] text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ngo.district}, {ngo.state}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{ngo.mission}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[10px] text-slate-500">
                  <span className="block font-bold text-slate-800">Reg: {ngo.regNum}</span>
                  <span>12A & 80G Tax Exempt</span>
                </div>
                <Link
                  to={`/public/ngos/${ngo.id}`}
                  className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
                >
                  <span>Public Specs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
