import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CommunityFeed } from '../community/CommunityFeed';

export const CommunityView: React.FC = () => {
  const { setActiveTab } = useApp();

  return (
    <div className="mx-auto w-full max-w-5xl pb-16">
      <div className="mb-3 flex items-center gap-3">
        <button onClick={() => setActiveTab('home')} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-gray-300"><ArrowLeft className="h-5 w-5" /></button>
        <div><h1 className="text-xl font-black text-white">M.Digi</h1><p className="text-xs text-gray-500">Communauté sociale MUNGWELE</p></div>
      </div>
      <CommunityFeed socialShell />
    </div>
  );
};
