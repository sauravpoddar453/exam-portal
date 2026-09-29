import React from 'react';
import { GraduationCap } from 'lucide-react';

export default function BrandedLoader({ message = 'Loading workspace...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
      {/* Animated Logo Mark */}
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-xl animate-pulse" />
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-850 to-indigo-900 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
          <GraduationCap className="w-7 h-7 animate-bounce" />
        </div>
      </div>

      {/* Pulsing Amber Dots */}
      <div className="flex items-center gap-1.5 pt-1">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" style={{ animationDelay: '200ms' }} />
        <div className="w-2 h-2 rounded-full bg-teal-400 animate-ping" style={{ animationDelay: '400ms' }} />
      </div>

      {/* Message */}
      <p className="text-xs font-mono tracking-wide text-indigo-200/80">{message}</p>
    </div>
  );
}
