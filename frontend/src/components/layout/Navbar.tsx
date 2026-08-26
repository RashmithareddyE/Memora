import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Images,
  ChevronDown,
  User,
  LogOut,
  Menu,
  X,
  Search,
  FolderOpen,
  BarChart3,
} from 'lucide-react';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountRef.current &&
        !accountRef.current.contains(event.target as Node)
      ) {
        setAccountOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile menu when the screen is resized to desktop.
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleLogout = () => {
    setAccountOpen(false);
    setMobileMenuOpen(false);
    logout();
    navigate('/');
  };

  const handleMyAccount = () => {
    setAccountOpen(false);
    setMobileMenuOpen(false);
    navigate('/account');
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="sticky top-0 z-50 w-full"
    >
      <div className="container-page">
        <nav className="glass-panel relative mt-4 flex items-center justify-between rounded-2xl px-5 py-3 sm:px-6">
          {/* Logo */}
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            onClick={closeMobileMenu}
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
            <>
              {/* Desktop navigation */}
              <div className="hidden items-center gap-4 sm:flex">
                <Link
                  to="/search"
                  className="text-sm font-medium text-ink-700 hover:text-coral-600"
                >
                  Search
                </Link>

                <Link
                  to="/organize"
                  className="text-sm font-medium text-ink-700 hover:text-coral-600"
                >
                  Organize
                </Link>

                <Link
                  to="/analytics"
                  className="text-sm font-medium text-ink-700 hover:text-coral-600"
                >
                  Analytics
                </Link>

                {/* Desktop account dropdown */}
                <div ref={accountRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 text-sm font-medium text-ink-800 hover:text-coral-600"
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
                      <div className="border-b border-ink-900/10 px-4 py-3">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {user?.name}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-ink-500">
                          {user?.email}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleMyAccount}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-ink-700 hover:bg-ink-900/5 hover:text-coral-600"
                        role="menuitem"
                      >
                        <User size={16} />
                        My Account
                      </button>

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
              </div>

              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={() =>
                  setMobileMenuOpen((prev) => !prev)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-700 hover:bg-ink-900/5 hover:text-coral-600 sm:hidden"
                aria-label={
                  mobileMenuOpen
                    ? 'Close navigation menu'
                    : 'Open navigation menu'
                }
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <X size={21} />
                ) : (
                  <Menu size={21} />
                )}
              </button>

              {/* Mobile menu */}
              <AnimatePresence>
                {mobileMenuOpen && (
                  <>
                    {/* Backdrop */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={closeMobileMenu}
                      className="fixed inset-0 top-0 z-40 bg-ink-900/20 sm:hidden"
                    />

                    {/* Drawer */}
                    <motion.div
                      initial={{ opacity: 0, x: '100%' }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: '100%' }}
                      transition={{
                        duration: 0.25,
                        ease: 'easeOut',
                      }}
                      className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-xl sm:hidden"
                    >
                      {/* User information */}
                      <div className="border-b border-ink-900/10 px-5 py-4">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {user?.name}
                        </p>

                        <p className="mt-1 truncate text-xs text-ink-500">
                          {user?.email}
                        </p>
                      </div>

                      {/* Navigation */}
                      <div className="flex flex-col p-2">
                        <Link
                          to="/search"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink-700 hover:bg-ink-900/5 hover:text-coral-600"
                        >
                          <Search size={18} />
                          Search
                        </Link>

                        <Link
                          to="/organize"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink-700 hover:bg-ink-900/5 hover:text-coral-600"
                        >
                          <FolderOpen size={18} />
                          Organize
                        </Link>

                        <Link
                          to="/analytics"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink-700 hover:bg-ink-900/5 hover:text-coral-600"
                        >
                          <BarChart3 size={18} />
                          Analytics
                        </Link>

                        <button
                          type="button"
                          onClick={handleMyAccount}
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-ink-700 hover:bg-ink-900/5 hover:text-coral-600"
                        >
                          <User size={18} />
                          My Account
                        </button>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-ink-900/10 p-2">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-ink-700 hover:bg-coral-500/5 hover:text-coral-600"
                        >
                          <LogOut size={18} />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </>
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