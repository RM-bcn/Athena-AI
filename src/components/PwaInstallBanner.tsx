import React, {useState} from 'react';
import {Download, Share, X} from 'lucide-react';
import {useInstallPrompt} from '../pwa/useInstallPrompt';

const DISMISS_KEY = 'athena_pwa_install_dismissed';

export const PwaInstallBanner: React.FC = () => {
  const {canInstall, isStandalone, isIOS, promptInstall} = useInstallPrompt();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [installing, setInstalling] = useState(false);

  if (isStandalone || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // localStorage niet beschikbaar
    }
  };

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await promptInstall();
    } finally {
      setInstalling(false);
    }
  };

  if (!canInstall && !(isIOS)) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[55] w-[calc(100%-2rem)] max-w-md bg-white rounded-2xl border border-[#e1efff] shadow-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0080E0] to-[#005BAE] flex items-center justify-center flex-shrink-0">
        <Download className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#0b1d2d]">
          {canInstall ? 'Installeer Athena AI als app' : 'Zet Athena AI op je beginscherm'}
        </p>
        {canInstall ? (
          <>
            <p className="font-['Inter'] text-xs text-[#717783] mt-0.5">
              Werkt ook offline tijdens je reis.
            </p>
            <button
              onClick={handleInstall}
              disabled={installing}
              className="mt-2 px-4 py-2 rounded-xl bg-[#005BAE] text-white font-['Inter'] text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-60"
            >
              {installing ? 'Installeren…' : 'Installeren'}
            </button>
          </>
        ) : (
          <p className="font-['Inter'] text-xs text-[#717783] mt-0.5 flex items-center gap-1">
            Tik onderop op <Share className="w-3.5 h-3.5 inline text-[#005BAE]" /> → &lsquo;Zet op
            beginscherm&rsquo;
          </p>
        )}
      </div>
      <button
        onClick={dismiss}
        className="p-2 -m-1 text-[#717783] hover:text-[#0b1d2d] hover:bg-[#f0f4f9] rounded-lg cursor-pointer transition-colors flex-shrink-0"
        title="Sluiten"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
