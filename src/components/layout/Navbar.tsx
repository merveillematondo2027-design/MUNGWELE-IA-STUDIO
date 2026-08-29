import React, { useState, useEffect } from 'react';
import { Menu, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DrawerMenu } from './DrawerMenu';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';

export const Navbar: React.FC = () => {
  const { user, setActiveTab } = useApp();
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth.currentUser));

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setIsAuthenticated(Boolean(firebaseUser));
    });
    return () => unsubscribe();
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#050b18]/80 backdrop-blur-xl border-b border-white/10 px-4 h-16 flex items-center justify-between shadow-lg">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setActiveTab('home')}
        >
          <img 
            src="/src/assets/logo-compact.svg" 
            alt="MUNGWELE IA STUDIO" 
            className="w-8 h-8 group-hover:scale-105 transition-transform"
          />
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
            MUNGWELE IA
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {isAuthenticated && (
            <div 
              onClick={() => setActiveTab('subscription')}
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all shadow-inner group"
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-amber-400 to-orange-600 flex items-center justify-center shadow-[0_0_10px_rgba(251,191,36,0.3)] group-hover:scale-110 transition-transform">
                <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="currentColor" />
              </div>
              <span className="font-bold text-sm sm:text-base text-white tracking-wide">
                {user?.credits?.toLocaleString() || 0}
              </span>
            </div>
          )}

          <button 
            onClick={() => setDrawerOpen(true)}
            className="p-2 sm:p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white transition-all shadow-sm"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      <DrawerMenu isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
};

