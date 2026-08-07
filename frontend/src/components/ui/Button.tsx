import { forwardRef, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

type ButtonVariant = 'primary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  children?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-coral-500 text-white shadow-glass hover:bg-coral-600 focus-visible:outline-coral-600',
  outline:
    'bg-white/70 text-ink-900 border border-ink-900/10 hover:bg-white focus-visible:outline-ink-900',
  ghost:
    'bg-transparent text-ink-800 hover:bg-white/50 focus-visible:outline-ink-900',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-2.5 text-sm sm:text-base',
  lg: 'px-7 py-3.5 text-base sm:text-lg',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      children,
      className = '',
      ...rest
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-display font-semibold transition-colors duration-200 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...rest}
      >
        {icon}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;