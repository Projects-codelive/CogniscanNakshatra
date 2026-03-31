import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/useAuthStore';
import { Loader2, BrainCircuit, KeyRound, Fingerprint, X, Check, User, Mail } from 'lucide-react';
import { createPasskey, isPasskeySupported } from '../utils/passkey';

export default function SignUp() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [isCreatingPasskey, setIsCreatingPasskey] = useState(false);
  const [passkeyCreated, setPasskeyCreated] = useState(false);
  const [passkeyEmail, setPasskeyEmail] = useState('');
  const [passkeyAvailable] = useState(isPasskeySupported());

  const handleSignUp = async () => {
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError(t('signup.errors.passwordsMismatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('signup.errors.passwordTooShort'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('signup.errors.invalidEmail'));
      return;
    }

    const existingUser = localStorage.getItem(`nakshatra-user-${email}`);
    if (existingUser) {
      setError(t('signup.errors.emailExists'));
      return;
    }

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    localStorage.setItem(`nakshatra-user-${email}`, JSON.stringify({ 
      name: name.trim(),
      email,
      password,
      createdAt: new Date().toISOString(),
    }));

    setUser({
      name: name.trim(),
      email,
      hasPasskey: false,
      createdAt: new Date().toISOString(),
    });

    setIsLoading(false);

    if (passkeyAvailable) {
      setPasskeyEmail(email);
      setShowPasskeyModal(true);
    } else {
      navigate('/');
    }
  };

  const handleCreatePasskey = async () => {
    setError('');
    setIsCreatingPasskey(true);

    try {
      const credentialData = await createPasskey(passkeyEmail);
      
      const storedUser = localStorage.getItem(`nakshatra-user-${passkeyEmail}`);
      let userData;
      if (storedUser) {
        userData = JSON.parse(storedUser);
        userData.passkeyCredentialId = credentialData.credentialId;
        userData.passkeyPublicKey = credentialData.publicKey;
        userData.passkeyCounter = credentialData.counter;
        localStorage.setItem(`nakshatra-user-${passkeyEmail}`, JSON.stringify(userData));
      } else {
        userData = {};
      }

      setPasskeyCreated(true);
      
      setUser({
        name: userData.name || passkeyEmail.split('@')[0],
        email: passkeyEmail,
        hasPasskey: true,
        createdAt: userData.createdAt || new Date().toISOString(),
      });

      setTimeout(() => {
        setShowPasskeyModal(false);
        navigate('/');
      }, 1500);
    } catch {
      setError('Failed to create passkey. You can add one later in settings.');
      setIsCreatingPasskey(false);
    }
  };

  const handleSkipPasskey = () => {
    setShowPasskeyModal(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 lg:mb-8">
          <div className="w-14 h-14 lg:w-16 lg:h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BrainCircuit className="w-7 h-7 lg:w-8 lg:h-8 text-white" />
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-white">{t('signup.title')}</h1>
          <p className="text-slate-400 mt-2 text-sm lg:text-base">
            {t('signup.subtitle')}
          </p>
        </div>

        <div className="bg-slate-900 rounded-2xl lg:rounded-3xl p-5 lg:p-6 border border-slate-800 shadow-xl">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  placeholder={t('signup.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                {t('signup.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  placeholder={t('signup.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                {t('signup.password')}
              </label>
              <input
                type="password"
                placeholder={t('signup.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                {t('signup.confirmPassword')}
              </label>
              <input
                type="password"
                placeholder={t('signup.confirmPasswordPlaceholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-12 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              onClick={handleSignUp}
              disabled={isLoading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('signup.creating')}
                </>
              ) : (
                t('signup.createAccount')
              )}
            </button>

            <div className="text-center pt-2">
              <p className="text-slate-400 text-sm">
                {t('signup.alreadyAccount')}{' '}
                <Link to="/login" className="text-blue-400 font-medium hover:underline">
                  {t('signup.signIn')}
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-600 text-center mt-6 lg:mt-8">
          {t('login.terms')}
        </p>
      </div>

      {showPasskeyModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-slate-800 shadow-2xl">
            {passkeyCreated ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Passkey Created!</h2>
                <p className="text-slate-400 text-sm">You can now login with your passkey.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <KeyRound className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Add a Passkey</h2>
                      <p className="text-xs text-slate-500">Quick & secure login</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSkipPasskey}
                    className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
                  <Fingerprint className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 text-center">
                    Set up a passkey for faster, more secure login using Face ID, Touch ID, or your device PIN.
                  </p>
                </div>

                {error && (
                  <p className="text-sm text-red-400 mb-4">{error}</p>
                )}

                <div className="space-y-3">
                  <button
                    onClick={handleCreatePasskey}
                    disabled={isCreatingPasskey}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingPasskey ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating passkey...
                      </>
                    ) : (
                      <>
                        <Fingerprint className="w-5 h-5" />
                        Create Passkey
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSkipPasskey}
                    className="w-full h-11 text-slate-400 hover:text-white rounded-xl font-medium transition-colors"
                  >
                    Skip for now
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
