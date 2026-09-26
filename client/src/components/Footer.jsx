import React from 'react';
import { GraduationCap, Heart, Code2, Server, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { getApiUrl } from '../utils/api';

export default function Footer() {
  return (
    <footer className="mt-auto bg-white border-t border-gray-200 pt-16 pb-12 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-red-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-red-600">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="font-bold text-gray-900 text-base tracking-wide">Exam Portal</span>
            </div>
            <p className="text-gray-600 text-sm max-w-md leading-relaxed mb-6 font-normal">
              A high-performance online examination architecture designed for seamless proctoring, automated evaluation, and real-time candidate analytics.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-mono">
              <span className="flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5 text-red-600" /> React 18 + Vite</span>
              <span className="flex items-center gap-1.5"><Server className="w-3.5 h-3.5 text-red-600" /> Express REST API</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-red-600" /> MongoDB Mongoose</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-widest mb-4">Platform Navigation</h4>
            <ul className="space-y-2.5 text-xs text-gray-600">
              <li><a href="/" className="hover:text-red-600 transition-colors">Overview</a></li>
              <li><a href="/exams" className="hover:text-red-600 transition-colors">Available Exams</a></li>
              <li><a href="/dashboard" className="hover:text-red-600 transition-colors">Analytics Dashboard</a></li>
              <li><a href="/login" className="hover:text-red-600 transition-colors">Candidate Sign In</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-widest mb-4">System Endpoints</h4>
            <ul className="space-y-2.5 text-xs text-gray-600">
              <li>
                <a href={getApiUrl('/api/health')} target="_blank" rel="noreferrer" className="hover:text-red-600 transition-colors font-mono flex items-center gap-1">
                  GET /api/health <ArrowUpRight className="w-3 h-3 opacity-60" />
                </a>
              </li>
              <li>
                <a href={getApiUrl('/api/exams')} target="_blank" rel="noreferrer" className="hover:text-red-600 transition-colors font-mono flex items-center gap-1">
                  GET /api/exams <ArrowUpRight className="w-3 h-3 opacity-60" />
                </a>
              </li>
              <li><span className="text-gray-500 font-mono">POST /api/attempts</span></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} Exam Portal. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            Crafted for <span className="text-gray-900 font-medium">Speed & Reliability</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
