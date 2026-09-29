import React from 'react';
import { GraduationCap, Heart, Code2, Server, ShieldCheck, User, Mail, Phone, ArrowUpRight } from 'lucide-react';
import { getApiUrl } from '../utils/api';

export default function Footer() {
  return (
    <footer className="mt-auto bg-[#090822] border-t border-amber-500/15 pt-16 pb-12 relative overflow-hidden text-indigo-200">
      {/* Background ambient glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="font-bold text-white text-base tracking-wide">Exam Portal</span>
            </div>
            <p className="text-indigo-200/70 text-sm max-w-md leading-relaxed mb-6 font-normal">
              A high-performance online examination architecture designed for seamless proctoring, automated evaluation, and real-time candidate analytics.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-indigo-300/80 font-mono">
              <span className="flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5 text-amber-400" /> React 18 + Vite</span>
              <span className="flex items-center gap-1.5"><Server className="w-3.5 h-3.5 text-teal-400" /> Express REST API</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> MongoDB Mongoose</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-4">Platform Navigation</h4>
            <ul className="space-y-2.5 text-xs text-indigo-200/80">
              <li><a href="/" className="hover:text-amber-400 transition-colors">Overview</a></li>
              <li><a href="/exams" className="hover:text-amber-400 transition-colors">Available Exams</a></li>
              <li><a href="/dashboard" className="hover:text-amber-400 transition-colors">Analytics Dashboard</a></li>
              <li><a href="/login" className="hover:text-amber-400 transition-colors">Candidate Sign In</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-4">Developer & Support</h4>
            <ul className="space-y-2.5 text-xs text-indigo-200/80">
              <li className="font-semibold text-white flex items-center gap-1.5 text-sm">
                <User className="w-4 h-4 text-amber-400" /> Saurav Poddar
              </li>
              <li>
                <a href="mailto:sauravpoddarengg@gmail.com" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span className="truncate">sauravpoddarengg@gmail.com</span>
                </a>
              </li>
              <li>
                <a href="tel:9693281811" className="hover:text-amber-400 transition-colors flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>+91 9693281811</span>
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-indigo-900/60 flex flex-col sm:flex-row items-center justify-between text-xs text-indigo-300/60 gap-4">
          <p>© {new Date().getFullYear()} Exam Portal. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            Designed & Developed with <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" /> by <span className="text-white font-semibold">Saurav Poddar</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
