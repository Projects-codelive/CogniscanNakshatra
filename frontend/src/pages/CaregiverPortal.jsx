import React from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  FileText,
  Zap,
  Moon,
  ChevronRight,
  Users,
  Phone,
  Calendar
} from 'lucide-react';

const CaregiverPortal = () => {
  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Patient Profile Header */}
      <header className="bg-slate-900 p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl overflow-hidden">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Arthur`} 
                alt="Patient" 
                className="w-full h-full object-cover bg-slate-800"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg lg:text-xl font-bold text-white">Arthur Miller</h1>
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded">Active</span>
              </div>
              <p className="text-xs lg:text-sm text-slate-400 mt-1">
                Patient ID: #CS-8842
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl font-medium text-sm hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
              <FileText size={16} />
              <span className="hidden sm:inline">Archives</span>
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-blue-500 transition-colors flex items-center justify-center gap-2">
              <FileText size={16} />
              Report
            </button>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[
          { label: 'Overall Score', value: '78', icon: ShieldCheck, color: 'text-emerald-400' },
          { label: 'Alerts Today', value: '2', icon: AlertTriangle, color: 'text-yellow-400' },
          { label: 'Last Check-in', value: '2h ago', icon: Calendar, color: 'text-blue-400' },
          { label: 'Care Team', value: '3', icon: Users, color: 'text-purple-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Burnout Risk */}
      <div className="bg-slate-900 p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="font-semibold text-white">Caregiver Wellness</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <span className="text-xl lg:text-2xl font-bold text-emerald-400">65%</span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-white font-medium">Low Burnout Risk</p>
            <p className="text-xs text-slate-400 mt-1">Taking regular breaks helps maintain care quality.</p>
          </div>
        </div>
      </div>

      {/* AI Insight */}
      <div className="bg-gradient-to-br from-blue-900/50 to-slate-900 p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-blue-500/20">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-blue-400" />
          <h2 className="text-xs font-bold text-blue-400 uppercase">AI Insight</h2>
        </div>
        <h3 className="text-base lg:text-lg font-semibold text-white mb-3">
          Predicted behavioral shift in next 48 hours based on activity patterns.
        </h3>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-400">
            <span className="text-blue-400 font-medium">Observation:</span> Reduced activity noted in morning sessions.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            <span className="text-blue-400 font-medium">Recommendation:</span> Ensure adequate hydration before 4 PM.
          </p>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-slate-900 p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-800">
        <h2 className="font-semibold text-white mb-4">Recent Alerts</h2>
        <div className="space-y-3">
          <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Medication Shift Detected</p>
              <p className="text-xs text-slate-400 mt-1">Morning dosage taken 4 hours early</p>
            </div>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex items-start gap-3">
            <Moon className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Sleep Disruption</p>
              <p className="text-xs text-slate-400 mt-1">3 movement events between 01:00 - 04:00 AM</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-slate-900 p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-800">
        <h2 className="font-semibold text-white mb-4">Care Team Contacts</h2>
        <div className="space-y-3">
          {[
            { name: 'Dr. Sarah Chen', role: 'Primary Physician', phone: '+1 555-0123' },
            { name: 'Michael Chen', role: 'Family Contact', phone: '+1 555-0456' },
          ].map((contact) => (
            <div key={contact.name} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-white">{contact.name}</p>
                <p className="text-xs text-slate-500">{contact.role}</p>
              </div>
              <a 
                href={`tel:${contact.phone}`}
                className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center hover:bg-blue-500/20 transition-colors"
              >
                <Phone className="w-4 h-4 text-blue-400" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap justify-center gap-4 lg:gap-6 pt-4 border-t border-slate-800 opacity-60">
        <button className="text-[10px] text-slate-500 hover:text-slate-300">Privacy</button>
        <button className="text-[10px] text-slate-500 hover:text-slate-300">Emergency</button>
        <button className="text-[10px] text-slate-500 hover:text-slate-300">Terms</button>
      </div>
    </div>
  );
};

export default CaregiverPortal;
