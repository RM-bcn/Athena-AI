import {useEffect, useState} from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;
}

export function useInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);

    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const updateStandalone = () =>
      setIsStandalone(standaloneQuery.matches || (window.navigator as any).standalone === true);
    updateStandalone();
    standaloneQuery.addEventListener?.('change', updateStandalone);

    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      standaloneQuery.removeEventListener?.('change', updateStandalone);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<'accepted' | 'dismissed' | null> => {
    if (!installEvent) return null;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') setInstallEvent(null);
    return choice.outcome;
  };

  return {canInstall: !!installEvent, isStandalone, isIOS, promptInstall};
}
