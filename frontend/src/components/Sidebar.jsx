import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Activity,
  Users,
  Settings,
  LogOut, 
  ChevronRight,
  ChevronDown,
  BrainCircuit,
  Camera,
  ClipboardCheck,
  Pill,
  TrendingUp,
  User,
  Brain,
  BarChart3,

  Mic,
  Calendar
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [expandedGroups, setExpandedGroups] = useState(['overview', 'assessment']);

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavClick = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const navGroups = [
    {
      id: 'overview',
      label: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard },
        { id: 'checkin', label: 'Daily Check-in', path: '/checkin', icon: ClipboardCheck },
      ]
    },
    {
      id: 'assessment',
      label: 'Assessment',
      items: [
        { id: 'tests', label: 'Cognitive Tests', path: '/tests', icon: Brain },
        { id: 'speech', label: 'Speech Analysis', path: '/speech', icon: Mic },
        { id: 'facial', label: 'Facial Analysis', path: '/facial', icon: Camera },
      ]
    },
    {
      id: 'insights',
      label: 'Insights',
      items: [
        { id: 'insights', label: 'Insights', path: '/insights', icon: TrendingUp },
        { id: 'medications', label: 'Medications', path: '/medications', icon: Pill },
      ]
    },
    {
      id: 'system',
      label: 'System',
      items: [
        { id: 'caregiver', label: 'Caregiver Portal', path: '/caregiver', icon: Users },
        { id: 'profile', label: 'Profile', path: '/profile', icon: User },
      ]
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 h-screen fixed left-0 top-0 text-slate-300 z-40">
      <div className="p-5 flex items-center gap-3 border-b border-slate-800">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <BrainCircuit className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg">Nakshatra</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Cognitive Health</p>
        </div>
      </div>

      <nav className="flex-1 mt-3 px-3 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.id} className="mb-4">
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
            >
              <span className="flex-1 text-left">{group.label}</span>
              <ChevronDown 
                size={14} 
                className={`transition-transform duration-200 ${expandedGroups.includes(group.id) ? 'rotate-0' : '-rotate-90'}`}
              />
            </button>
            
            {expandedGroups.includes(group.id) && (
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
                      isActive(item.path)
                        ? 'bg-blue-600 text-white' 
                        : 'hover:bg-slate-800 hover:text-white text-slate-400'
                    }`}
                  >
                    <item.icon size={18} />
                    <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                    {isActive(item.path) && <ChevronRight size={14} className="text-blue-200" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-800">
        {user && (
          <div className="bg-slate-800/50 rounded-xl p-3 mb-3">
            <p className="text-xs font-semibold text-white truncate">{user.email}</p>
            <p className="text-[10px] text-slate-500">User Account</p>
          </div>
        )}
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors text-slate-400 group"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
