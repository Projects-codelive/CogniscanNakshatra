import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { User, Download, LogOut, Eye, Type, Lock, ChevronRight } from 'lucide-react';
import { getTestResults, getCheckIns } from '../store/db';

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [largeTextMode, setLargeTextMode] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [checkIns, setCheckIns] = useState([]);

  useEffect(() => {
    loadData();
    const saved = localStorage.getItem('nakshatra-large-text');
    if (saved === 'true') setLargeTextMode(true);
  }, []);

  const loadData = async () => {
    const tests = await getTestResults(100);
    const checks = await getCheckIns(100);
    setTestResults(tests);
    setCheckIns(checks);
  };

  useEffect(() => {
    if (largeTextMode) {
      document.body.classList.add('large-text');
    } else {
      document.body.classList.remove('large-text');
    }
    localStorage.setItem('nakshatra-large-text', String(largeTextMode));
  }, [largeTextMode]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const exportData = () => {
    const data = {
      user: user?.email,
      testResults,
      checkIns,
      medications: [],
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nakshatra-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const items = [
    { icon: User, label: 'Personal Info', desc: 'Name, age, emergency contact' },
    { icon: Eye, label: 'Notifications', desc: 'Reminders & alerts' },
    { icon: Lock, label: 'Privacy & Security', desc: 'Password, biometrics' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 pb-8">
      <div className="bg-slate-900 p-5 lg:p-6 border-b border-slate-800">
        <h1 className="text-lg lg:text-xl font-bold text-white">Profile</h1>
        <p className="text-slate-400 text-sm mt-1">Settings & preferences</p>
      </div>

      <div className="p-4 lg:p-6 space-y-3 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 bg-slate-900 rounded-2xl p-4 lg:p-5 border border-slate-800">
          <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-blue-500/10 flex items-center justify-center">
            <User className="w-6 h-6 lg:w-7 lg:h-7 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm lg:text-base truncate">{user?.email || 'User'}</p>
            <p className="text-xs text-slate-500">Password login</p>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-4 lg:p-5 border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-blue-400" />
            <p className="font-semibold text-white">Accessibility</p>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Type className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-medium text-white text-sm">Large Text</p>
                <p className="text-xs text-slate-500 hidden sm:block">Increase text size</p>
              </div>
            </div>
            <button
              onClick={() => setLargeTextMode(!largeTextMode)}
              className={`w-11 h-6 lg:w-12 lg:h-7 rounded-full transition-colors relative ${
                largeTextMode ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 lg:w-5 lg:h-5 rounded-full bg-white transition-transform ${
                  largeTextMode ? 'left-5 lg:left-6' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-4 lg:p-5 border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <Download className="w-5 h-5 text-blue-400" />
            <p className="font-semibold text-white">Data & Privacy</p>
          </div>

          <button
            onClick={exportData}
            className="flex items-center justify-between w-full py-2 hover:bg-slate-800 rounded-xl px-2 -mx-2 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-slate-400" />
              <div className="text-left">
                <p className="font-medium text-white text-sm">Export My Data</p>
                <p className="text-xs text-slate-500 hidden sm:block">Download all your data</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500" />
          </button>

          <div className="flex items-start gap-3 mt-4 pt-4 border-t border-slate-800">
            <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500">
              Your data is stored locally on your device.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {items.map((item) => (
            <button
              key={item.label}
              className="flex items-center gap-4 w-full bg-slate-900 rounded-2xl p-4 border border-slate-800 text-left hover:bg-slate-800 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white text-sm">{item.label}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </button>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-3 bg-slate-800 hover:bg-red-500/10 text-slate-300 hover:text-red-400 rounded-xl font-medium transition-all flex items-center justify-center gap-2 mt-4"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>

        <p className="text-[10px] text-slate-600 text-center pt-4 lg:pt-6">
          Nakshatra v1.0 · Not a medical device
        </p>
      </div>
    </div>
  );
}
