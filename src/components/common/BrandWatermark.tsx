import React from 'react';
import officialMark from '../../assets/mungwele-ai-official-mark.svg';

export const BrandWatermark: React.FC<{ className?: string; opacity?: number }> = ({ className = '', opacity = 0.2 }) => (
  <div
    className={`pointer-events-none absolute bottom-3 right-3 z-20 flex items-center justify-center rounded-xl border border-white/10 bg-black/20 p-1.5 backdrop-blur-[2px] ${className}`}
    style={{ opacity }}
    aria-hidden="true"
  >
    <img src={officialMark} alt="" className="h-7 w-10 object-contain sm:h-8 sm:w-12" />
  </div>
);
