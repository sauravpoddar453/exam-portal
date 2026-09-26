import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="glass-card max-w-md w-full p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-4xl font-extrabold text-white">404</h1>
          <h2 className="text-lg font-bold text-slate-200 mt-2">Page Not Found</h2>
          <p className="text-slate-400 text-xs mt-2">The route you requested does not exist or has been relocated.</p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Home className="w-4 h-4" />
          Return to Overview
        </Link>
      </div>
    </div>
  );
}
