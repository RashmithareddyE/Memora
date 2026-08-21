import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Images } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/apiClient';

function SignupPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(name, email, password);
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

        <h1 className="text-center text-2xl font-bold text-ink-900">Create your account</h1>
        <p className="mt-1 text-center text-sm text-ink-600">
          Start sharing memories with the people who matter.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium text-ink-800">
              Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border border-ink-900/10 bg-white/70 px-4 py-2.5 text-ink-900 outline-none transition-colors focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20"
              placeholder="Your name"
            />
          </div>

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
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-ink-900/10 bg-white/70 px-4 py-2.5 text-ink-900 outline-none transition-colors focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20"
              placeholder="At least 8 characters"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-ink-800">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {isSubmitting ? 'Creating account…' : 'Sign up'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-coral-600 hover:text-coral-700">
            Log in
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

export default SignupPage;