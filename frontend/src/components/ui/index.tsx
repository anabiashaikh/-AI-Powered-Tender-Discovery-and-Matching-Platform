import * as React from 'react';
import { cn } from '../../lib/utils';

// ---- Badge ----
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        {
          default: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
          success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
          warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
          danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
          info: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
          outline: 'bg-transparent text-gray-400 border border-gray-700',
        }[variant],
        className
      )}
      {...props}
    />
  );
}

// ---- Progress ----
interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function Progress({ value, variant = 'default', className, ...props }: ProgressProps) {
  const colorMap = {
    default: 'from-indigo-500 to-violet-500',
    success: 'from-emerald-500 to-teal-500',
    warning: 'from-amber-500 to-orange-500',
    danger: 'from-red-500 to-rose-500',
  };
  return (
    <div
      className={cn('h-2 w-full rounded-full bg-gray-800 overflow-hidden', className)}
      {...props}
    >
      <div
        className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', colorMap[variant])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ---- Skeleton ----
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('skeleton rounded-lg bg-gray-800', className)}
      {...props}
    />
  );
}

// ---- Avatar ----
interface AvatarProps {
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const initial = name?.[0]?.toUpperCase() || '?';
  const sizes = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' };
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-semibold text-white',
        sizes[size],
        className
      )}
    >
      {initial}
    </div>
  );
}

// ---- Stat Card ----
interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  positive?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, change, positive, icon, className }: StatCardProps) {
  return (
    <div className={cn('stat-card glass-card p-5', className)}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {change && (
            <p className={cn('mt-1 text-xs font-medium', positive ? 'text-emerald-400' : 'text-red-400')}>
              {positive ? '↑' : '↓'} {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Spinner ----
export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('relative h-5 w-5', className)}>
      <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
    </div>
  );
}

// ---- Alert ----
interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
}

export function Alert({ variant = 'info', title, children, className, ...props }: AlertProps) {
  const styles = {
    info: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    danger: 'bg-red-500/10 border-red-500/30 text-red-300',
  };
  return (
    <div className={cn('rounded-xl border p-4', styles[variant], className)} {...props}>
      {title && <p className="font-semibold mb-1">{title}</p>}
      <div className="text-sm opacity-90">{children}</div>
    </div>
  );
}

// ---- Modal ----
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative glass-card w-full max-w-md p-6 animate-scale-in', className)}>
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-white/5 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ---- Toggle ----
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
}

export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <div className="flex-1">
        {label && <p className="text-sm font-medium text-gray-200">{label}</p>}
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors duration-200',
          checked ? 'bg-indigo-600' : 'bg-gray-700'
        )}
      >
        <div
          className={cn(
            'absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </div>
    </label>
  );
}
