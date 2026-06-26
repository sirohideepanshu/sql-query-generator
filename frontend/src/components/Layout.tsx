import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  Database,
  MessageSquare,
  LayoutDashboard,
  FolderKanban,
  History,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../lib/auth';

const navItems = [
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/history', label: 'History', icon: History },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isChat = location.pathname.startsWith('/chat');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center gap-2 px-5 border-b border-slate-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <Database className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">SQL Assist</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div className="mb-2 px-2 text-sm">
            <div className="font-medium text-slate-800">{username || 'User'}</div>
            <div className="text-xs text-slate-400">Signed in</div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="h-screen min-w-0 flex-1 overflow-hidden">
        {isChat ? (
          <div className="h-full">{children}</div>
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
          </div>
        )}
      </main>
    </div>
  );
}
