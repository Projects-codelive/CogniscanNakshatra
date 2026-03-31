import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  Activity, 
  User, 
  Camera, 
  ClipboardCheck,
  Brain,
  MoreHorizontal,
  X,
  ChevronRight,
  Settings,
  BarChart3,
  Pill,
  FileText,

  LogOut,
  Mic
} from 'lucide-react';

const BottomNav = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleClick = (path) => {
    setShowMore(false);
    navigate(path);
  };

  const menuItems = [
    { id: 'dashboard', label: t('nav.home'), path: '/', icon: LayoutDashboard },
    { id: 'facial', label: t('nav.face'), path: '/facial', icon: Camera },
    { id: 'speech', label: t('nav.speech'), path: '/speech', icon: Mic },
    { id: 'more', label: t('nav.more'), path: '#', icon: MoreHorizontal, isAction: true },
    { id: 'profile', label: t('nav.profile'), path: '/profile', icon: User },
  ];

  const moreOptions = [
    { 
      id: 'checkin', 
      label: t('nav.checkin'), 
      desc: t('dashboard.quickActions.checkinDesc'),
      path: '/checkin', 
      icon: ClipboardCheck,
      color: 'bg-green-500',
    },
    { 
      id: 'tests', 
      label: t('nav.tests'), 
      desc: t('dashboard.quickActions.testsDesc'),
      path: '/tests', 
      icon: Brain,
      color: 'bg-violet-500',
    },
    { 
      id: 'medications', 
      label: t('nav.medications'), 
      desc: t('dashboard.quickActions.checkinDesc'),
      path: '/medications', 
      icon: Pill,
      color: 'bg-emerald-500',
    },
    { 
      id: 'insights', 
      label: t('nav.insights'), 
      desc: t('dashboard.quickActions.facialDesc'),
      path: '/insights', 
      icon: BarChart3,
      color: 'bg-blue-500',
    },

    { 
      id: 'settings', 
      label: t('nav.settings'), 
      desc: t('profile.accessibility'),
      path: '/settings', 
      icon: Settings,
      color: 'bg-slate-500',
    },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex lg:hidden items-center justify-around h-16 px-2 z-[100]">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => item.isAction ? setShowMore(true) : handleClick(item.path)}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 px-2 rounded-lg transition-all duration-200 min-w-[56px] ${
              isActive(item.path)
                ? 'text-blue-500'
                : item.isAction
                  ? 'text-slate-500 hover:text-slate-300'
                  : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <item.icon size={20} className={isActive(item.path) ? 'stroke-[2.5px]' : ''} />
            <span className="text-[9px] font-bold uppercase tracking-wide">{item.label}</span>
            {isActive(item.path) && !item.isAction && (
              <div className="w-1 h-1 bg-blue-500 rounded-full mt-0.5" />
            )}
          </button>
        ))}
      </nav>

      {showMore && (
        <div 
          className="fixed inset-0 bg-black/60 z-[200] lg:hidden"
          onClick={() => setShowMore(false)}
        >
          <div 
            className="absolute bottom-0 left-0 right-0 bg-slate-900 rounded-t-3xl border-t border-slate-700 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '70vh', overflowY: 'auto' }}
          >
            <div className="sticky top-0 bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold text-white">{t('nav.moreOptions')}</h2>
              <button 
                onClick={() => setShowMore(false)}
                className="p-2 rounded-full hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {moreOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleClick(option.path)}
                  className="w-full flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors text-left"
                >
                  <div className={`w-12 h-12 ${option.color} rounded-xl flex items-center justify-center shrink-0`}>
                    <option.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">{option.label}</p>
                    <p className="text-sm text-slate-400 truncate">{option.desc}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setShowMore(false);
                  navigate('/login');
                }}
                className="w-full flex items-center justify-center gap-2 p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">{t('profile.signOut')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default BottomNav;
