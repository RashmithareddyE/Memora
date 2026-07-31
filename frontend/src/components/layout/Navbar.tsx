import { motion } from 'framer-motion';
import { Images } from 'lucide-react';
import Button from '@/components/ui/Button';

function Navbar() {
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
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-coral-500 text-white shadow-glass">
              <Images size={18} strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-ink-900">
              Memora
            </span>
          </div>

          {/* Login */}
          <Button variant="outline" size="sm">
            Login
          </Button>
        </nav>
      </div>
    </motion.header>
  );
}

export default Navbar;