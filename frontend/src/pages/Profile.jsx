import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/useAuthStore';
import { User, Download, LogOut, Eye, Type, Lock, Globe, KeyRound, Fingerprint, Trash2, RefreshCw, Loader2, Check, X, Pencil, Shield, Mail, LockKeyhole, Share2, Copy, ExternalLink, Users, Link2, Info } from 'lucide-react';
import { getTestResults, getCheckIns } from '../store/db';
import LanguageSelector from '../components/LanguageSelector';
import { createPasskey, deletePasskey, hasPasskey, isPasskeySupported } from '../utils/passkey';

const generateShareCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuthStore();

  const [largeTextMode, setLargeTextMode] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [userHasPasskey, setUserHasPasskey] = useState(false);
  const [passkeyAvailable] = useState(isPasskeySupported());
  const [activeTab, setActiveTab] = useState('profile');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editType, setEditType] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editConfirmValue, setEditConfirmValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkedCaregivers, setLinkedCaregivers] = useState([]);

  const loadData = useCallback(async () => {
    const tests = await getTestResults(100);
    const checks = await getCheckIns(100);
    setTestResults(tests);
    setCheckIns(checks);
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadData();
      const saved = localStorage.getItem('nakshatra-large-text');
      if (saved === 'true') setLargeTextMode(true);
      if (user?.email) {
        setUserHasPasskey(hasPasskey(user.email));
      }
    };
    init();
  }, [user, loadData]);

  useEffect(() => {
    if (largeTextMode) {
      document.body.classList.add('large-text');
    } else {
      document.body.classList.remove('large-text');
    }
    localStorage.setItem('nakshatra-large-text', String(largeTextMode));
  }, [largeTextMode]);

  useEffect(() => {
    if (user?.email) {
      const storedUser = localStorage.getItem(`nakshatra-user-${user.email}`);
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        if (userData.shareCode) {
          setShareCode(userData.shareCode);
        } else {
          const newCode = generateShareCode();
          userData.shareCode = newCode;
          localStorage.setItem(`nakshatra-user-${user.email}`, JSON.stringify(userData));
          setShareCode(newCode);
        }
        setLinkedCaregivers(userData.linkedCaregivers || []);
      }
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const exportData = () => {
    const data = {
      name: user?.name,
      email: user?.email,
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

  const openEditModal = (type) => {
    setEditType(type);
    setEditValue('');
    setEditConfirmValue('');
    setError('');
    setSuccess(false);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!user?.email) return;
    setError('');
    
    if (editType === 'name') {
      if (!editValue.trim() || editValue.trim().length < 2) {
        setError(t('profile.errors.nameMinChars'));
        return;
      }
      setIsProcessing(true);
      await new Promise(r => setTimeout(r, 300));
      
      const storedUser = localStorage.getItem(`nakshatra-user-${user.email}`);
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        userData.name = editValue.trim();
        localStorage.setItem(`nakshatra-user-${user.email}`, JSON.stringify(userData));
      }
      
      setUser({ ...user, name: editValue.trim() });
      setSuccess(true);
    }
    
    if (editType === 'email') {
      if (!editValue.trim()) {
        setError(t('profile.errors.emailRequired'));
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editValue.trim())) {
        setError(t('profile.errors.invalidEmail'));
        return;
      }
      
      const existingUser = localStorage.getItem(`nakshatra-user-${editValue.trim()}`);
      if (existingUser) {
        setError(t('profile.errors.emailExists'));
        return;
      }
      
      setIsProcessing(true);
      await new Promise(r => setTimeout(r, 300));
      
      const oldUser = localStorage.getItem(`nakshatra-user-${user.email}`);
      const userData = oldUser ? JSON.parse(oldUser) : {};
      userData.email = editValue.trim();
      
      localStorage.removeItem(`nakshatra-user-${user.email}`);
      localStorage.setItem(`nakshatra-user-${editValue.trim()}`, JSON.stringify(userData));
      
      setUser({ ...user, email: editValue.trim() });
      setSuccess(true);
    }
    
    if (editType === 'password') {
      if (!editValue || editValue.length < 6) {
        setError(t('profile.errors.passwordMinChars'));
        return;
      }
      if (editValue !== editConfirmValue) {
        setError(t('profile.errors.passwordsMismatch'));
        return;
      }
      
      setIsProcessing(true);
      await new Promise(r => setTimeout(r, 300));
      
      const storedUser = localStorage.getItem(`nakshatra-user-${user.email}`);
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        userData.password = editValue;
        localStorage.setItem(`nakshatra-user-${user.email}`, JSON.stringify(userData));
      }
      
      setSuccess(true);
    }
    
    setIsProcessing(false);
    setTimeout(() => setShowEditModal(false), 1200);
  };

  const handleCreatePasskey = async () => {
    if (!user?.email) return;
    setError('');
    setIsProcessing(true);

    try {
      const credentialData = await createPasskey(user.email);
      
      const storedUser = localStorage.getItem(`nakshatra-user-${user.email}`);
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        userData.passkeyCredentialId = credentialData.credentialId;
        userData.passkeyPublicKey = credentialData.publicKey;
        userData.passkeyCounter = credentialData.counter;
        localStorage.setItem(`nakshatra-user-${user.email}`, JSON.stringify(userData));
      }

      setUserHasPasskey(true);
      setUser({ ...user, hasPasskey: true });
    } catch {
      setError(t('profile.errors.passkeyFailed'));
    }
    setIsProcessing(false);
  };

  const handleDeletePasskey = () => {
    if (!user?.email) return;
    deletePasskey(user.email);
    setUserHasPasskey(false);
    setUser({ ...user, hasPasskey: false });
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateCode = async () => {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 500));
    
    const newCode = generateShareCode();
    if (user?.email) {
      const storedUser = localStorage.getItem(`nakshatra-user-${user.email}`);
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        userData.shareCode = newCode;
        localStorage.setItem(`nakshatra-user-${user.email}`, JSON.stringify(userData));
        setShareCode(newCode);
      }
    }
    setIsGenerating(false);
  };

  const handleOpenCaregiverPortal = () => {
    window.open('/caregiver/login', '_blank');
  };

  const tabs = [
    { id: 'profile', label: t('profile.profileTab'), icon: User },
    { id: 'security', label: t('profile.securityTab'), icon: Shield },
    { id: 'settings', label: t('profile.settingsTab'), icon: Eye },
    { id: 'caregiver', label: t('profile.caregiverTab'), icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-950 pb-20 lg:pb-8">
      <div className="bg-slate-900 p-5 lg:p-6 border-b border-slate-800">
        <h1 className="text-lg lg:text-xl font-bold text-white">{t('profile.title')}</h1>
        <p className="text-slate-400 text-sm mt-1">{t('profile.subtitle')}</p>
      </div>

      <div className="lg:flex lg:max-w-4xl lg:mx-auto lg:mt-6">
        <div className="hidden lg:block lg:w-56 lg:shrink-0 lg:pr-6">
          <div className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 lg:p-0 space-y-3 max-w-2xl mx-auto lg:mx-0 lg:ml-auto w-full">
          {activeTab === 'profile' && (
            <>
              <div className="bg-slate-900 rounded-2xl p-4 lg:p-5 border border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-2xl lg:text-3xl font-bold text-blue-400">
                      {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg lg:text-xl font-bold text-white truncate">{user?.name || t('profile.user')}</h2>
                    <p className="text-sm text-slate-500 truncate">{user?.email}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {userHasPasskey ? t('profile.passkeyAndPassword') : t('profile.passwordOnly')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <button
                  onClick={() => openEditModal('name')}
                  className="w-full flex items-center gap-4 p-4 hover:bg-slate-800/50 transition-colors border-b border-slate-800"
                >
                  <User className="w-5 h-5 text-blue-400" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-white">{t('profile.name')}</p>
                    <p className="text-xs text-slate-500">{user?.name || t('profile.notSet')}</p>
                  </div>
                  <Pencil className="w-4 h-4 text-slate-500" />
                </button>
                
                <button
                  onClick={() => openEditModal('email')}
                  className="w-full flex items-center gap-4 p-4 hover:bg-slate-800/50 transition-colors"
                >
                  <Mail className="w-5 h-5 text-blue-400" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-white">{t('profile.email')}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <Pencil className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <button
                onClick={() => openEditModal('password')}
                className="w-full bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center gap-4 hover:bg-slate-800/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <LockKeyhole className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-white text-sm">{t('profile.changePassword')}</p>
                  <p className="text-xs text-slate-500">{t('profile.updatePassword')}</p>
                </div>
                <Pencil className="w-4 h-4 text-slate-500" />
              </button>

              {passkeyAvailable && (
                <div className="bg-slate-900 rounded-2xl p-4 lg:p-5 border border-slate-800">
                  <div className="flex items-center gap-2 mb-4">
                    <KeyRound className="w-5 h-5 text-blue-400" />
                    <p className="font-semibold text-white">{t('profile.passkey')}</p>
                  </div>

                  {userHasPasskey ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 py-2 px-3 bg-green-500/10 rounded-xl">
                        <Fingerprint className="w-5 h-5 text-green-400" />
                        <div className="flex-1">
                          <p className="font-medium text-white text-sm">{t('profile.passkeyActive')}</p>
                          <p className="text-xs text-slate-500">{t('profile.passkeyActiveDesc')}</p>
                        </div>
                        <Check className="w-5 h-5 text-green-400" />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCreatePasskey}
                          disabled={isProcessing}
                          className="flex-1 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <RefreshCw className="w-4 h-4" />
                          {t('profile.change')}
                        </button>
                        <button
                          onClick={handleDeletePasskey}
                          className="flex-1 h-10 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          {t('profile.remove')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 py-2 px-3 bg-slate-800/50 rounded-xl">
                        <KeyRound className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="font-medium text-white text-sm">{t('profile.noPasskey')}</p>
                          <p className="text-xs text-slate-500">{t('profile.noPasskeyDesc')}</p>
                        </div>
                      </div>
                      <button
                        onClick={handleCreatePasskey}
                        disabled={isProcessing}
                        className="w-full h-11 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Fingerprint className="w-4 h-4" />
                        )}
                        {t('profile.addPasskey')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'settings' && (
            <>
              <div className="bg-slate-900 rounded-2xl p-4 lg:p-5 border border-slate-800">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="w-5 h-5 text-blue-400" />
                  <p className="font-semibold text-white">{t('profile.accessibility')}</p>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Type className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-white text-sm">{t('profile.largeText')}</p>
                      <p className="text-xs text-slate-500 hidden sm:block">{t('profile.largeTextDesc')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setLargeTextMode(!largeTextMode)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      largeTextMode ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${largeTextMode ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 rounded-2xl p-4 lg:p-5 border border-slate-800">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-blue-400" />
                  <p className="font-semibold text-white">{t('profile.language')}</p>
                </div>
                <LanguageSelector variant="buttons" />
              </div>

              <div className="bg-slate-900 rounded-2xl p-4 lg:p-5 border border-slate-800">
                <div className="flex items-center gap-2 mb-4">
                  <Download className="w-5 h-5 text-blue-400" />
                  <p className="font-semibold text-white">{t('profile.data')}</p>
                </div>
                <button
                  onClick={exportData}
                  className="w-full flex items-center gap-3 py-2 hover:bg-slate-800 rounded-xl px-2 -mx-2 transition-colors"
                >
                  <Download className="w-5 h-5 text-slate-400" />
                  <div className="text-left">
                    <p className="font-medium text-white text-sm">{t('profile.exportData')}</p>
                    <p className="text-xs text-slate-500">{t('profile.exportDataDesc')}</p>
                  </div>
                </button>
                <div className="flex items-start gap-3 mt-4 pt-4 border-t border-slate-800">
                  <Lock className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600">{t('profile.dataStoredLocally')}</p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'caregiver' && (
            <>
              <div className="bg-slate-900 rounded-2xl p-4 lg:p-6 border border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">{t('settings.shareCaregiver.title')}</h2>
                    <p className="text-xs text-slate-500">{t('settings.shareCaregiver.description')}</p>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-400">{t('settings.shareCaregiver.yourShareCode')}</span>
                    <button
                      onClick={handleRegenerateCode}
                      disabled={isGenerating}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      {t('settings.shareCaregiver.regenerate')}
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-900 rounded-lg px-4 py-3 border border-slate-700">
                      <span className="text-xl font-mono font-bold text-white tracking-wider">
                        {shareCode || t('common.loading')}
                      </span>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className={`h-11 px-4 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                        copied 
                          ? 'bg-green-600 text-white' 
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          {t('settings.shareCaregiver.copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          {t('settings.shareCaregiver.copy')}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-blue-400 font-medium mb-1">{t('settings.shareCaregiver.howItWorks.title')}</p>
                      <p className="text-slate-400">
                        {t('settings.shareCaregiver.howItWorks.description')}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleOpenCaregiverPortal}
                  className="w-full mt-4 h-11 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  {t('settings.openPortal')}
                </button>
              </div>

              {linkedCaregivers.length > 0 && (
                <div className="bg-slate-900 rounded-2xl p-4 lg:p-6 border border-slate-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-white">{t('settings.linkedCaregivers.title')}</h2>
                      <p className="text-xs text-slate-500">{t('settings.linkedCaregivers.count', { count: linkedCaregivers.length })}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {linkedCaregivers.map((cg, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{cg.name || t('settings.linkedCaregivers.caregiver')}</p>
                          <p className="text-xs text-slate-500">{t('settings.linkedCaregivers.linked', { date: new Date(cg.linkedAt).toLocaleDateString() })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-slate-900 rounded-2xl p-4 lg:p-6 border border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Link2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">{t('settings.connectionStatus.title')}</h2>
                    <p className="text-xs text-slate-500">{t('settings.connectionStatus.description')}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${linkedCaregivers.length > 0 ? 'bg-green-500' : 'bg-slate-500'}`} />
                      <span className="text-sm text-white">{t('settings.connectionStatus.caregiverLinks')}</span>
                    </div>
                    <span className="text-sm text-slate-400">{t('settings.connectionStatus.active', { count: linkedCaregivers.length })}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <button
            onClick={handleLogout}
            className="w-full py-3 bg-slate-800 hover:bg-red-500/10 text-slate-300 hover:text-red-400 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            {t('profile.signOut')}
          </button>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-2 lg:hidden z-40">
        <div className="flex justify-around">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
                activeTab === tab.id ? 'text-blue-400' : 'text-slate-500'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 flex items-end lg:items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-t-2xl lg:rounded-2xl p-6 max-w-sm w-full border border-slate-800 shadow-2xl">
            {success ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="w-7 h-7 text-green-400" />
                </div>
                <h2 className="text-lg font-bold text-white">
                  {editType === 'name' && t('profile.nameUpdated')}
                  {editType === 'email' && t('profile.emailUpdated')}
                  {editType === 'password' && t('profile.passwordChanged')}
                </h2>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">
                    {editType === 'name' && t('profile.editName')}
                    {editType === 'email' && t('profile.changeEmail')}
                    {editType === 'password' && t('profile.changePassword')}
                  </h2>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                {editType === 'name' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-2 block">{t('profile.name')}</label>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder={user?.name || t('profile.namePlaceholder')}
                        className="w-full h-12 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {editType === 'email' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-2 block">{t('profile.newEmail')}</label>
                      <input
                        type="email"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder={t('profile.newEmailPlaceholder')}
                        className="w-full h-12 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {editType === 'password' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-2 block">{t('profile.newPassword')}</label>
                      <input
                        type="password"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder={t('profile.passwordPlaceholder')}
                        className="w-full h-12 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-2 block">{t('profile.confirmPassword')}</label>
                      <input
                        type="password"
                        value={editConfirmValue}
                        onChange={(e) => setEditConfirmValue(e.target.value)}
                        placeholder={t('profile.confirmPasswordPlaceholder')}
                        className="w-full h-12 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

                <button
                  onClick={handleSaveEdit}
                  disabled={isProcessing}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    t('profile.saveChanges')
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
