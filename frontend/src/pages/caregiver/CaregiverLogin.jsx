import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useCaregiverStore from '../../store/useCaregiverStore';
import { Mail, Lock, Loader2, ShieldCheck, User } from 'lucide-react';

export default function CaregiverLogin() {
  const { t } = useTranslation();
  const { setCaregiver } = useCaregiverStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));

    const storedCaregiver = localStorage.getItem(`nakshatra-caregiver-${email}`);
    if (!storedCaregiver) {
      setError('No account found with this email');
      setIsLoading(false);
      return;
    }

    const caregiverData = JSON.parse(storedCaregiver);
    if (caregiverData.password !== password) {
      setError('Incorrect password');
      setIsLoading(false);
      return;
    }

    setCaregiver({
      email,
      name: caregiverData.name,
      linkedPatients: caregiverData.linkedPatients || [],
    });

    window.location.href = '/caregiver';
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Caregiver Portal</h1>
          <p className="text-slate-400 mt-2">Monitor your loved one's health</p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
          <div className="space-y-4">
            <div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  placeholder={t('login.email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  placeholder={t('login.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full h-12 pl-12 pr-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>

            <p className="text-center text-slate-400 text-sm">
              New caregiver?{' '}
              <Link to="/caregiver/signup" className="text-emerald-400 font-medium hover:underline">
                Create account
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          <Link to="/login" className="hover:text-slate-400">Patient login</Link>
        </p>
      </div>
    </div>
  );
}
