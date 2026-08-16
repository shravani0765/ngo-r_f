import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ChevronRight, ChevronLeft, Sparkles, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Step {
  id: number;
  title: string;
  role: 'NGO' | 'DONOR' | 'ADMIN' | 'PUBLIC';
  email: string;
  description: string;
  actionText: string;
  route: string;
}

const DEMO_STEPS: Step[] = [
  {
    id: 1,
    title: 'NGO Registration & Onboarding',
    role: 'NGO',
    email: 'ngo@ngocommons.demo',
    description: 'NGO registers basic details, government IDs (PAN, 12A, 80G), and uploads audit documents.',
    actionText: 'View NGO Registration',
    route: '/register'
  },
  {
    id: 2,
    title: 'Automated Government Verification',
    role: 'NGO',
    email: 'ngo@ngocommons.demo',
    description: 'System checks credentials against NGO Darpan, Tax 12A/80G, and PAN databases.',
    actionText: 'View NGO Verification Status',
    route: '/ngo/dashboard'
  },
  {
    id: 3,
    title: 'Trust & Safety Check (AI Risk Check)',
    role: 'ADMIN',
    email: 'admin@ngocommons.demo',
    description: 'AI engine checks document consistency, financial records, and beneficiary entries for risk evaluation.',
    actionText: 'View Admin Safety Review',
    route: '/admin/dashboard'
  },
  {
    id: 4,
    title: 'Admin Review & Verified Listing',
    role: 'ADMIN',
    email: 'admin@ngocommons.demo',
    description: 'Platform auditor reviews AI findings and document uploads to grant official "Verified NGO" status.',
    actionText: 'Review Pending NGOs',
    route: '/admin/dashboard'
  },
  {
    id: 5,
    title: 'Donor Contribution & Project Support',
    role: 'DONOR',
    email: 'donor@ngocommons.demo',
    description: 'Donor selects a verified social cause and makes a transparent contribution.',
    actionText: 'View Donor Portal',
    route: '/donor/dashboard'
  },
  {
    id: 6,
    title: 'Secure Fund Records & Flow Tracking',
    role: 'PUBLIC',
    email: 'public@ngocommons.demo',
    description: 'Donations generate immutable cryptographic records to trace fund movement from Donor → NGO → Beneficiary.',
    actionText: 'View Secure Fund Records',
    route: '/ledger'
  },
  {
    id: 7,
    title: 'Transparency & Impact Scoring',
    role: 'PUBLIC',
    email: 'public@ngocommons.demo',
    description: 'Dynamic Transparency Score (0-100) based on reporting completeness, document verification, and verified outcomes.',
    actionText: 'View Verified NGO Profile',
    route: '/public/directory'
  },
  {
    id: 8,
    title: 'Public Social Impact Analytics',
    role: 'PUBLIC',
    email: 'public@ngocommons.demo',
    description: 'Open public directory showing aggregate beneficiaries, regional reach, and Social Return on Investment (SROI).',
    actionText: 'Explore Public Impact Data',
    route: '/public/impact'
  }
];

export const DemoModeGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();

  const currentStep = DEMO_STEPS[currentStepIndex];

  const handleExecuteStep = async () => {
    try {
      await login(currentStep.email, getPasswordForRole(currentStep.role));
    } catch {
      // Ignore if login pre-exists
    }
    navigate(currentStep.route);
  };

  const getPasswordForRole = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Admin@123';
      case 'NGO': return 'NGO@123';
      case 'DONOR': return 'Donor@123';
      default: return 'Public@123';
    }
  };

  const handleNext = () => {
    if (currentStepIndex < DEMO_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <div className="fixed bottom-20 left-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer border border-amber-300/40"
        >
          <Sparkles className="w-4 h-4 animate-spin text-amber-200" />
          <span>Interactive Demo Tour</span>
          <span className="bg-amber-700/60 text-amber-100 text-[10px] px-2 py-0.5 rounded-full font-mono">
            Step {currentStepIndex + 1}/{DEMO_STEPS.length}
          </span>
        </button>
      ) : (
        <div className="bg-white/95 backdrop-blur-md border border-amber-200 shadow-2xl rounded-2xl p-5 w-80 sm:w-96 text-slate-800 transition-all animate-in fade-in slide-in-from-bottom-4">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span className="font-bold text-sm text-slate-900">Platform Evaluator Demo Tour</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Tracker */}
          <div className="my-3">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 font-medium">
              <span>DEMO STEP {currentStepIndex + 1} OF {DEMO_STEPS.length}</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold border border-amber-200/60">
                Role: {currentStep.role}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
              {DEMO_STEPS.map((step, i) => (
                <button
                  key={step.id}
                  onClick={() => setCurrentStepIndex(i)}
                  className={`flex-1 h-full transition-all border-r border-white/50 ${
                    i === currentStepIndex
                      ? 'bg-amber-500'
                      : i < currentStepIndex
                      ? 'bg-emerald-500'
                      : 'bg-slate-200'
                  }`}
                  title={`Step ${step.id}: ${step.title}`}
                />
              ))}
            </div>
          </div>

          {/* Step Detail */}
          <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3.5 my-3">
            <h4 className="font-bold text-xs text-slate-900 flex items-center space-x-1.5 mb-1">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-extrabold">
                {currentStep.id}
              </span>
              <span>{currentStep.title}</span>
            </h4>
            <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
              {currentStep.description}
            </p>

            <button
              onClick={handleExecuteStep}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{currentStep.actionText}</span>
            </button>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              onClick={handleNext}
              disabled={currentStepIndex === DEMO_STEPS.length - 1}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>Next Step</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
