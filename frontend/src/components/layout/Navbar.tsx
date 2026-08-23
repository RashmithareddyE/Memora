import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Images } from 'lucide-react';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
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
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2">
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
              <Link to="/search" className="hidden text-sm font-medium text-ink-700 hover:text-coral-600 sm:inline">
                Search
              </Link>
              <Link to="/organize" className="hidden text-sm font-medium text-ink-700 hover:text-coral-600 sm:inline">
                Organize
              </Link>
              <span className="hidden text-sm font-medium text-ink-800 sm:inline">
                {user?.name}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/signup" className="hidden text-sm font-medium text-ink-800 hover:text-coral-600 sm:inline">
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