import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Images } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/apiClient';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container-page flex min-h-screen items-center justify-center py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="glass-panel w-full max-w-md rounded-2xl px-6 py-8 sm:px-8"
      >
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-coral-500 text-white shadow-glass">
            <Images size={18} strokeWidth={2.5} />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-ink-900">
            Memora
          </span>
        </Link>

        <h1 className="text-center text-2xl font-bold text-ink-900">Welcome back</h1>
        <p className="mt-1 text-center text-sm text-ink-600">
          Log in to see your rooms and memories.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-ink-800">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-ink-900/10 bg-white/70 px-4 py-2.5 text-ink-900 outline-none transition-colors focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-ink-800">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-ink-900/10 bg-white/70 px-4 py-2.5 text-ink-900 outline-none transition-colors focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-coral-500/10 px-4 py-2.5 text-sm text-coral-700" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting}
            className="mt-2 w-full disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-600">
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-coral-600 hover:text-coral-700">
            Sign up
          </Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <Link to="/" className="text-ink-600 hover:text-ink-900">
            ← Back to home
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default LoginPage;