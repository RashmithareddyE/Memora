import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function AccountPage() {
  const { user } = useAuth();

  return (
    <div className="container-page py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="mx-auto flex max-w-2xl flex-col gap-6"
      >
        <Link
          to="/dashboard"
          className="flex w-fit items-center gap-1.5 text-sm text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>

        <div className="glass-panel rounded-2xl px-6 py-8 sm:px-8">
          <div className="mb-8">
            <h1 className="font-display text-2xl font-bold text-ink-900">
              My Account
            </h1>

            <p className="mt-1 text-sm text-ink-600">
              View your Memora account information.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Name */}
            <div className="flex items-center gap-4 rounded-xl border border-ink-900/10 bg-white/60 px-4 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coral-500/10 text-coral-600">
                <User size={19} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  Name
                </p>

                <p className="mt-1 truncate text-sm font-medium text-ink-900">
                  {user?.name || '—'}
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-4 rounded-xl border border-ink-900/10 bg-white/60 px-4 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coral-500/10 text-coral-600">
                <Mail size={19} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  Email
                </p>

                <p className="mt-1 truncate text-sm font-medium text-ink-900">
                  {user?.email || '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default AccountPage;