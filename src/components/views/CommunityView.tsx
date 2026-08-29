import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CommunityFeed } from '../community/CommunityFeed';

export const CommunityView: React.FC = () => {
  const { setActiveTab } = useApp();

  return (
    <div className="mx-auto w-full max-w-6xl pb-16">
      <div className="mb-5 flex items-center gap-3">
        <button onClick={() => setActiveTab('home')} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-gray-300"><ArrowLeft className="h-4 w-4" /></button>
        <div><h1 className="text-xl font-black text-white sm:text-2xl">Fil Communauté</h1><p className="mt-1 text-xs text-gray-500">Explorez les créations publiques de MUNGWELE IA STUDIO.</p></div>
      </div>
      <CommunityFeed />
    </div>
  );
};
