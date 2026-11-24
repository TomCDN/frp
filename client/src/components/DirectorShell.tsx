import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Clapperboard,
  LayoutDashboard,
  Users,
  Layers,
  Camera,
  Radio,
  Menu,
  Wifi,
  WifiOff,
} from 'lucide-react';
import clsx from 'clsx';
import { getSocket } from '../lib/socket';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/shows', label: 'Shows', icon: Clapperboard, end: false },
  { to: '/stages', label: 'Podia', icon: Layers, end: false },
  { to: '/crew', label: 'Crew', icon: Users, end: false },
  { to: '/shots', label: 'Shot library', icon: Camera, end: false },
];

export function DirectorShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) setConnected(true);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <div className="min-h-screen bg-base-950 flex flex-col">
      <header className="sticky top-0 z-40 bg-base-900/95 backdrop-blur border-b border-base-700 shrink-0">
        <div className="flex items-center gap-4 h-14 px-4">
          <button
            type="button"
            className="btn btn-ghost btn-icon lg:hidden"
            aria-label="Menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <Menu size={18} className="rotate-90" /> : <Menu size={18} />}
          </button>

          <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
            <span className="grid place-items-center w-8 h-8 rounded-md bg-accent-500 text-white font-bold text-sm">
              F
            </span>
            <span className="hidden sm:block font-semibold tracking-wider">FEY</span>
          </NavLink>

          <nav className="hidden lg:flex items-center gap-1 ml-4">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-base-750 text-base-100'
                      : 'text-base-300 hover:bg-base-800 hover:text-base-100',
                  )
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span
              className={clsx(
                'hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md',
                connected ? 'text-go-400 bg-go-500/10' : 'text-base-400 bg-base-800',
              )}
              title={connected ? 'Verbinden met de server is actief' : 'Geen verbinding met de server'}
            >
              {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
              {connected ? 'Verbonden' : 'Offline'}
            </span>

            <NavLink to="/operator" className="btn btn-secondary btn-sm">
              <Radio size={14} />
              <span className="hidden sm:inline">Operator</span>
            </NavLink>
          </div>
        </div>

        {menuOpen ? (
          <nav className="lg:hidden border-t border-base-700 bg-base-900 p-2 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium',
                    isActive ? 'bg-base-750 text-base-100' : 'text-base-300',
                  )
                }
              >
                <item.icon size={17} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        ) : null}
      </header>

      <main className="flex-1 min-h-0">
        <Outlet />
      </main>
    </div>
  );
}

/** Small helper for pages that need a consistent page header. */
export function PageHeader({
  title,
  description,
  actions,
  icon,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-3 min-w-0">
        {icon ? (
          <span className="grid place-items-center w-10 h-10 rounded-lg bg-base-750 border border-base-700 text-accent-300 shrink-0">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">{title}</h1>
          {description ? (
            <p className="text-sm text-base-400 mt-0.5">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2 flex-wrap">{actions}</div> : null}
    </div>
  );
}
