import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/useAuthStore';
import { 
  Share2, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink,
  Shield,
  Users,
  Link2,
  Info,
  Loader2
} from 'lucide-react';

const generateShareCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [shareCode, setShareCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkedCaregivers, setLinkedCaregivers] = useState([]);

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

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
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

  return (
    <div className="space-y-4 lg:space-y-6">
      <header className="bg-slate-900 p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-800">
        <h1 className="text-lg lg:text-xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your account and sharing preferences</p>
      </header>

      <div className="bg-slate-900 rounded-2xl p-4 lg:p-6 border border-slate-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Share with Caregiver</h2>
            <p className="text-xs text-slate-500">Let your caregiver view your progress</p>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Your Share Code</span>
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
              Regenerate
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-900 rounded-lg px-4 py-3 border border-slate-700">
              <span className="text-xl font-mono font-bold text-white tracking-wider">
                {shareCode || 'Generating...'}
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
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-blue-400 font-medium mb-1">How it works</p>
              <p className="text-slate-400">
                Share this code with your caregiver. They can use it to link your account to their dashboard and monitor your cognitive health progress.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCaregiverPortal}
          className="w-full mt-4 h-11 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Open Caregiver Portal
        </button>
      </div>

      {linkedCaregivers.length > 0 && (
        <div className="bg-slate-900 rounded-2xl p-4 lg:p-6 border border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Linked Caregivers</h2>
              <p className="text-xs text-slate-500">{linkedCaregivers.length} caregiver(s) connected</p>
            </div>
          </div>

          <div className="space-y-2">
            {linkedCaregivers.map((cg, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{cg.name || 'Caregiver'}</p>
                  <p className="text-xs text-slate-500">Linked {new Date(cg.linkedAt).toLocaleDateString()}</p>
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
            <h2 className="font-semibold text-white">Connection Status</h2>
            <p className="text-xs text-slate-500">Manage linked accounts</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${linkedCaregivers.length > 0 ? 'bg-green-500' : 'bg-slate-500'}`} />
              <span className="text-sm text-white">Caregiver Links</span>
            </div>
            <span className="text-sm text-slate-400">{linkedCaregivers.length} active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
