import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="glass-card max-w-md w-full p-8 text-center space-y-6 border border-amber-500/15">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-4xl font-extrabold text-white">404</h1>
          <h2 className="text-lg font-bold text-slate-200 mt-2">Page Not Found</h2>
          <p className="text-[#a5a3c9] text-xs mt-2">The route you requested does not exist or has been relocated.</p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-indigo-950 font-bold text-xs shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-colors"
        >
          <Home className="w-4 h-4" />
          Return to Overview
        </Link>
      </div>
    </div>
  );
}
