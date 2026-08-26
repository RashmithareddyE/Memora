import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Images, ChevronDown, User, LogOut } from 'lucide-react';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [accountOpen, setAccountOpen] = useState(false);

  const handleLogout = () => {
    setAccountOpen(false);
    logout();
    navigate('/');
  };

  const handleMyAccount = () => {
    setAccountOpen(false);
    navigate('/account');
  };

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="sticky top-0 z-50 w-full"
    >
      <div className="container-page">
        <nav className="glass-panel mt-4 flex items-center justify-between rounded-2xl px-5 py-3 sm:px-6">
          {/* Logo */}
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="flex items-center gap-2"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-coral-500 text-white shadow-glass">
              <Images size={18} strokeWidth={2.5} />
            </div>

            <span className="font-display text-lg font-bold tracking-tight text-ink-900">
              Memora
            </span>
          </Link>

          {/* Auth actions */}
          {isLoading ? null : isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Link
                to="/search"
                className="hidden text-sm font-medium text-ink-700 hover:text-coral-600 sm:inline"
              >
                Search
              </Link>

              <Link
                to="/organize"
                className="hidden text-sm font-medium text-ink-700 hover:text-coral-600 sm:inline"
              >
                Organize
              </Link>

              <Link
                to="/analytics"
                className="hidden text-sm font-medium text-ink-700 hover:text-coral-600 sm:inline"
              >
                Analytics
              </Link>

              {/* Account dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen((prev) => !prev)}
                  className="hidden items-center gap-1.5 text-sm font-medium text-ink-800 hover:text-coral-600 sm:flex"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                >
                  <span>{user?.name}</span>
                  <ChevronDown
                    size={15}
                    className={`transition-transform ${
                      accountOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {accountOpen && (
                  <div
                    className="absolute right-0 top-full z-50 mt-3 w-60 overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-lg"
                    role="menu"
                  >
                    {/* Account information */}
                    <div className="border-b border-ink-900/10 px-4 py-3">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {user?.name}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-ink-500">
                        {user?.email}
                      </p>
                    </div>

                    {/* My Account */}
                    <button
                      type="button"
                      onClick={handleMyAccount}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-ink-700 hover:bg-ink-900/5 hover:text-coral-600"
                      role="menuitem"
                    >
                      <User size={16} />
                      My Account
                    </button>

                    {/* Logout */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 border-t border-ink-900/10 px-4 py-3 text-left text-sm text-ink-700 hover:bg-coral-500/5 hover:text-coral-600"
                      role="menuitem"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>

              {/* Keep the existing logout button for now */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/signup"
                className="hidden text-sm font-medium text-ink-800 hover:text-coral-600 sm:inline"
              >
                Sign up
              </Link>

              <Link to="/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </motion.header>
  );
}

export default Navbar;