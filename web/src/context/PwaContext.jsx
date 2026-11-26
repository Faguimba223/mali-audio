import { createContext, useContext, useEffect, useState } from 'react';

const PwaContext = createContext(null);

function detectIosSafari() {
  const ua = window.navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
  return isIos && !isStandalone;
}

export function PwaProvider({ children }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(
    () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
  const [isIosInstallable, setIsIosInstallable] = useState(detectIosSafari);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [updateWaiting, setUpdateWaiting] = useState(null);
  const [isOnline, setIsOnline] = useState(() => window.navigator.onLine);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const onAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
      setIsIosInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then((registration) => {
        if (registration.waiting) {
          setUpdateWaiting(registration.waiting);
        }
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateWaiting(worker);
            }
          });
        });
      }).catch(() => {});

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') setInstallPrompt(null);
      return;
    }
    if (isIosInstallable) {
      setShowIosHelp(true);
      return;
    }
    setShowInstallHelp(true);
  };

  const applyUpdate = () => {
    if (updateWaiting) {
      updateWaiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  return (
    <PwaContext.Provider value={{
      canInstall: !isInstalled,
      isIosInstallable: isIosInstallable && !isInstalled,
      isInstalled,
      showIosHelp,
      setShowIosHelp,
      showInstallHelp,
      setShowInstallHelp,
      hasUpdate: Boolean(updateWaiting),
      isOnline,
      promptInstall,
      applyUpdate,
    }}>
      {children}
    </PwaContext.Provider>
  );
}

export function usePwa() {
  const ctx = useContext(PwaContext);
  if (!ctx) throw new Error('usePwa doit être utilisé dans PwaProvider');
  return ctx;
}
