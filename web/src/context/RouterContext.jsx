import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const RouterContext = createContext(null);

function readLocation() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const currentPath = window.location.pathname || '/';
  const pathname = base && currentPath.startsWith(base)
    ? currentPath.slice(base.length) || '/'
    : currentPath;
  return {
    pathname,
    search: window.location.search || '',
  };
}

export function RouterProvider({ children }) {
  const [location, setLocation] = useState(readLocation);

  useEffect(() => {
    const onPopState = () => setLocation(readLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    if (!to) return;
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    const target = to.startsWith('/') && base
      ? `${base}${to === '/' ? '/' : to}`
      : to;
    if (target === `${window.location.pathname}${window.location.search}`) return;
    if (replace) {
      window.history.replaceState({}, '', target);
    } else {
      window.history.pushState({}, '', target);
    }
    setLocation(readLocation());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const query = new URLSearchParams(location.search);

  return (
    <RouterContext.Provider value={{ pathname: location.pathname, search: location.search, query, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter doit être utilisé dans RouterProvider');
  return ctx;
}

export function Link({ to, children, className = '', onClick, ...rest }) {
  const { navigate } = useRouter();
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const href = to.startsWith('/') && base
    ? `${base}${to === '/' ? '/' : to}`
    : to;
  const handleClick = (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (onClick) onClick(event);
    navigate(to);
  };
  return (
    <a href={href} onClick={handleClick} className={className} {...rest}>
      {children}
    </a>
  );
}
