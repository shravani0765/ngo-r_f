import React from 'react';
import { LedgerVisualizer } from '../components/LedgerVisualizer';

export const LedgerPage: React.FC = () => {
  return (
    <div className="space-y-6 pb-12">
      <LedgerVisualizer />
    </div>
  );
};
