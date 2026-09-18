import { useCallback, useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type PlatformType = 'ios' | 'android' | 'windows' | 'mac' | 'other';
export type BrowserType = 'chrome' | 'edge' | 'safari' | 'firefox' | 'other';

export interface PwaPlatformInfo {
  os: PlatformType;
  browser: BrowserType;
  isMobile: boolean;
}

function detectPlatform(): PwaPlatformInfo {
  if (typeof window === 'undefined') {
    return { os: 'other', browser: 'other', isMobile: false };
  }
  const ua = window.navigator.userAgent.toLowerCase();
  let os: PlatformType = 'other';
  if (/iphone|ipad|ipod/.test(ua)) os = 'ios';
  else if (/android/.test(ua)) os = 'android';
  else if (/win/.test(ua)) os = 'windows';
  else if (/mac/.test(ua)) os = 'mac';

  let browser: BrowserType = 'other';
  if (/edg\//.test(ua)) browser = 'edge';
  else if (/chrome|crios/.test(ua)) browser = 'chrome';
  else if (/safari/.test(ua) && !/chrome|crios/.test(ua)) browser = 'safari';
  else if (/firefox|fxios/.test(ua)) browser = 'firefox';

  const isMobile = os === 'ios' || os === 'android' || /mobile/.test(ua);
  return { os, browser, isMobile };
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

// Global captured prompt so early events prior to React mount are preserved
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach((fn) => fn(globalDeferredPrompt));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    promptListeners.forEach((fn) => fn(null));
  });
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [installed, setInstalled] = useState(isStandalone());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [platform] = useState<PwaPlatformInfo>(() => detectPlatform());

  useEffect(() => {
    const handlePromptChange = (prompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(prompt);
      if (isStandalone()) {
        setInstalled(true);
      }
    };
    promptListeners.add(handlePromptChange);

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setIsModalOpen(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      promptListeners.delete(handlePromptChange);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async (): Promise<boolean> => {
    const promptEvent = deferredPrompt || globalDeferredPrompt;
    if (!promptEvent) {
      return false;
    }
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalled(true);
        setIsModalOpen(false);
        setDeferredPrompt(null);
        globalDeferredPrompt = null;
        return true;
      }
    } catch (err) {
      console.error('PWA install prompt error:', err);
    }
    return false;
  }, [deferredPrompt]);

  const promptInstall = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  return {
    canInstall: !!(deferredPrompt || globalDeferredPrompt),
    installed,
    isModalOpen,
    openModal,
    closeModal,
    promptInstall,
    installApp,
    platform,
  };
}
