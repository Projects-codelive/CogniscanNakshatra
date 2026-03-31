import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/useAuthStore';
import { Mail, Lock, Loader2, BrainCircuit, KeyRound, Fingerprint, Shield } from 'lucide-react';
import { authenticateWithPasskey, isPasskeySupported } from '../utils/passkey';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState('password');
  const [passkeyAvailable] = useState(isPasskeySupported());

  const handlePasswordLogin = async () => {
    setError('');

    if (!email || !password) {
      setError(t('login.errors.enterCredentials'));
      return;
    }

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    const storedUser = localStorage.getItem(`nakshatra-user-${email}`);

    if (!storedUser) {
      setError(t('login.errors.noAccount'));
      setIsLoading(false);
      return;
    }

    const userData = JSON.parse(storedUser);

    if (userData.password !== password) {
      setError(t('login.errors.incorrectPassword'));
      setIsLoading(false);
      return;
    }

    setUser({
      name: userData.name || email.split('@')[0],
      email,
      hasPasskey: !!userData.passkeyCredentialId,
      createdAt: userData.createdAt || new Date().toISOString(),
    });

    setIsLoading(false);
    navigate('/');
  };

  const handlePasskeyLogin = async () => {
    setError('');

    if (!email) {
      setError('Please enter your email first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const storedUser = localStorage.getItem(`nakshatra-user-${email}`);
      if (!storedUser) {
        setError('No account found with this email');
        setIsLoading(false);
        return;
      }

      const userData = JSON.parse(storedUser);
      if (!userData.passkeyCredentialId) {
        setError('No passkey registered for this account. Please login with password first.');
        setIsLoading(false);
        return;
      }

      await authenticateWithPasskey(email);

      setUser({
        name: userData.name || email.split('@')[0],
        email,
        hasPasskey: true,
        createdAt: userData.createdAt || new Date().toISOString(),
      });

      setIsLoading(false);
      navigate('/');
    } catch (error) {
      setIsLoading(false);
      if (error.name === 'NotAllowedError') {
        setError('Authentication cancelled or failed. Please try again.');
      } else {
        setError('Passkey authentication failed. Please try again or use password login.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 lg:mb-8">
          <div className="w-14 h-14 lg:w-16 lg:h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BrainCircuit className="w-7 h-7 lg:w-8 lg:h-8 text-white" />
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-white">{t('login.title')}</h1>
          <p className="text-slate-400 mt-2 text-sm lg:text-base">
            {t('login.subtitle')}
          </p>
        </div>

        <div className="bg-slate-900 rounded-2xl lg:rounded-3xl p-5 lg:p-6 border border-slate-800 shadow-xl">
          {passkeyAvailable && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setLoginMethod('password')}
                className={`flex-1 h-11 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  loginMethod === 'password'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Lock className="w-4 h-4" />
                Password
              </button>
              <button
                onClick={() => setLoginMethod('passkey')}
                className={`flex-1 h-11 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  loginMethod === 'passkey'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Fingerprint className="w-4 h-4" />
                Passkey
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                {t('login.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {loginMethod === 'password' && (
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  {t('login.password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    placeholder={t('login.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
                    className="w-full h-12 pl-12 pr-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
            )}

            {loginMethod === 'passkey' && (
              <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                <KeyRound className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-slate-400">
                  Use your device passkey (Face ID, Touch ID, or device PIN)
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            {loginMethod === 'password' ? (
              <button
                onClick={handlePasswordLogin}
                disabled={isLoading}
                className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('login.signingIn')}
                  </>
                ) : (
                  t('login.signIn')
                )}
              </button>
            ) : (
              <button
                onClick={handlePasskeyLogin}
                disabled={isLoading}
                className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-5 h-5" />
                    Login with Passkey
                  </>
                )}
              </button>
            )}

            <div className="text-center pt-2">
              <p className="text-slate-400 text-sm">
                {t('login.noAccount')}{' '}
                <Link to="/signup" className="text-blue-400 font-medium hover:underline">
                  {t('login.signUp')}
                </Link>
              </p>
            </div>

            <div className="border-t border-slate-800 pt-4 mt-4">
              <Link 
                to="/caregiver/login" 
                className="flex items-center justify-center gap-2 w-full h-11 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-sm transition-colors"
              >
                <Shield className="w-4 h-4" />
                {t('login.loginAsCaregiver')}
              </Link>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-600 text-center mt-6 lg:mt-8">
          {t('login.terms')}
        </p>
      </div>
    </div>
  );
}
