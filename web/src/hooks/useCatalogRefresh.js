import { useEffect, useState } from 'react';

export default function useCatalogRefresh() {
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setRefreshVersion((version) => version + 1);
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  return refreshVersion;
}
