import React from 'react';
import { 
  Users, 
  FileCheck2, 
  Clock, 
  TrendingUp, 
  BarChart3, 
  CheckCircle2, 
  Zap, 
  AlertCircle,
  Database
} from 'lucide-react';
import { useHealthCheck } from '../hooks/useHealthCheck';

export default function Dashboard() {
  const { healthData, isConnected } = useHealthCheck();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Portal Analytics & Control</h1>
        <p className="text-slate-400 text-sm mt-1">Overview of student enrollment, active test sessions, and API engine metrics.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase text-slate-400">Total Enrolled</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">1,248</div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-2 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            +14% from last week
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase text-slate-400">Exams Completed</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">4,890</div>
          <div className="flex items-center gap-1.5 text-xs text-purple-400 mt-2 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            98.4% completion rate
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase text-slate-400">Avg Test Time</span>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">42m 15s</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2 font-medium">
            Optimized pace
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase text-slate-400">System State</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">
            {isConnected ? 'Healthy' : 'Disconnected'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2 font-medium">
            {healthData?.database?.status || 'No DB'}
          </div>
        </div>

      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Exam Activity List */}
        <div className="lg:col-span-2 glass-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              Recent Candidate Activity
            </h3>
            <span className="text-xs text-slate-400">Live feed</span>
          </div>

          <div className="space-y-4">
            {[
              { candidate: 'Alex Johnson', exam: 'CS101 - DSA Basics', score: '92/100', status: 'Passed', time: '10 mins ago' },
              { candidate: 'Sophia Martinez', exam: 'WEB202 - Full Stack MERN', score: '138/150', status: 'Passed', time: '24 mins ago' },
              { candidate: 'Ethan Wright', exam: 'DB301 - Database Systems', score: '44/50', status: 'Passed', time: '1 hour ago' },
              { candidate: 'Liam Miller', exam: 'CS101 - DSA Basics', score: '35/100', status: 'Failed', time: '2 hours ago' },
            ].map((activity, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-4 hover:border-slate-700 transition-colors"
              >
                <div>
                  <h4 className="text-sm font-semibold text-white">{activity.candidate}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{activity.exam}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    activity.status === 'Passed' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {activity.score} ({activity.status})
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-1">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Database & Architecture Info Sidebar */}
        <div className="glass-card p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" />
              MERN Stack Info
            </h3>
            <p className="text-xs text-slate-400 mt-1">Full stack deployment status</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Frontend:</span>
                <span className="text-indigo-400 font-semibold">React 18 + Vite</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Styling:</span>
                <span className="text-indigo-400 font-semibold">Tailwind CSS</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Backend API:</span>
                <span className="text-indigo-400 font-semibold">Express 4.19</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">ODM Driver:</span>
                <span className="text-indigo-400 font-semibold">Mongoose 8.3</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-slate-300 space-y-2">
              <span className="font-semibold text-indigo-300 block text-xs">💡 Pro-tip: Database Setup</span>
              <p className="text-[11px] leading-relaxed text-slate-400">
                To connect your local MongoDB or Atlas cluster, edit <code className="text-indigo-300 bg-slate-950 px-1 py-0.5 rounded font-mono">server/.env</code> and set <code className="text-indigo-300 bg-slate-950 px-1 py-0.5 rounded font-mono">MONGO_URI</code>.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
