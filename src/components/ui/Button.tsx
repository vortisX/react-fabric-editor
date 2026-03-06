import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'text';
  size?: 'small' | 'medium';
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'medium', icon, className, children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border';
    const variants = {
      default: 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600',
      primary: 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600 hover:border-blue-600',
      text: 'bg-transparent border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-800',
    };
    const sizes = {
      small: 'h-6 px-1.5 text-xs',
      medium: 'h-7 px-3 text-xs',
    };

    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props}>
        {icon && <span className="flex items-center text-sm">{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
