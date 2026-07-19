import React from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';
import type { BloodType, Urgency, RequestStatus } from '../../types';
import { pickLang } from '../../i18n/lang';

// ─── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', size = 'md', loading, fullWidth, icon, children, className, disabled, ...props
}) => {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';
  const variants = {
    primary:   'bg-blood text-white hover:bg-blood-dark',
    secondary: 'border-2 border-blood text-blood hover:bg-red-50',
    ghost:     'text-neutral-medium hover:bg-gray-100',
    danger:    'bg-red-100 text-red-700 hover:bg-red-200',
  };
  const sizes = {
    sm: 'px-4 py-2 text-sm min-h-[40px]',
    md: 'px-5 py-3.5 text-base min-h-[52px]',
    lg: 'px-6 py-4 text-lg min-h-[56px]',
  };
  const shadow = variant === 'primary' ? 'shadow-[0_4px_14px_rgba(192,57,43,.35)]' : '';

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], shadow, fullWidth && 'w-full', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : icon}
      {children}
    </button>
  );
};

// ─── Switch ───────────────────────────────────────────────────────────────────
interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled, loading }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled || loading}
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    className={clsx(
      'relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors duration-200',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      checked ? 'bg-blood' : 'bg-gray-200'
    )}
  >
    <span
      className={clsx(
        'inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200',
        checked ? 'translate-x-[22px] rtl:-translate-x-[22px]' : 'translate-x-1 rtl:-translate-x-1'
      )}
    >
      {loading && <Loader2 className="w-5 h-5 animate-spin text-blood p-0.5" />}
    </span>
  </button>
);

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({ variant = 'default', padding = 'md', children, className, ...props }) => {
  const variants = {
    default:  'bg-white shadow-sm',
    elevated: 'bg-white shadow-lg',
    flat:     'bg-white border border-gray-100',
  };
  const paddings = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-5' };

  return (
    <div className={clsx('rounded-2xl', variants[variant], paddings[padding], className)} {...props}>
      {children}
    </div>
  );
};

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, hint, leftIcon, rightIcon, className, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-semibold text-neutral-dark mb-1.5">{label}</label>}
    <div className="relative">
      {leftIcon && (
        <div className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400">{leftIcon}</div>
      )}
      <input
        className={clsx(
          'w-full px-4 py-3.5 rounded-2xl border-2 bg-white text-neutral-dark font-medium text-base outline-none transition-colors duration-150 placeholder:text-gray-400 placeholder:font-normal min-h-[52px]',
          error ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blood',
          leftIcon && 'ps-11',
          rightIcon && 'pe-11',
          className
        )}
        {...props}
      />
      {rightIcon && (
        <div className="absolute end-3.5 top-1/2 -translate-y-1/2 text-gray-400">{rightIcon}</div>
      )}
    </div>
    {error && <p className="text-red-500 text-xs font-medium mt-1.5">{error}</p>}
    {hint && !error && <p className="text-gray-400 text-xs mt-1.5">{hint}</p>}
  </div>
);

// ─── Blood Type Badge ─────────────────────────────────────────────────────────
interface BloodBadgeProps {
  type: BloodType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const BloodTypeBadge: React.FC<BloodBadgeProps> = ({ type, size = 'md', className }) => {
  const sizes = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-20 h-20 text-xl',
  };
  return (
    <div className={clsx(
      'inline-flex items-center justify-center rounded-full bg-blood text-white font-black flex-shrink-0',
      'shadow-[0_4px_14px_rgba(192,57,43,.35)]',
      sizes[size], className
    )}>
      {type}
    </div>
  );
};

// ─── Urgency Badge ────────────────────────────────────────────────────────────
const URGENCY_CONFIG: Record<Urgency, { label: string; labelFa: string; labelPs: string; className: string; icon: string }> = {
  critical: { label: 'Critical', labelFa: 'بحرانی',   labelPs: 'بحراني',         className: 'bg-red-100 text-red-700',    icon: '🚨' },
  urgent:   { label: 'Urgent',   labelFa: 'فوری',     labelPs: 'عاجل',           className: 'bg-orange-100 text-orange-700', icon: '⚠️' },
  planned:  { label: 'Planned',  labelFa: 'برنامه‌ریزی', labelPs: 'مخکې له وخته', className: 'bg-blue-100 text-blue-700',  icon: '📅' },
};

export const UrgencyBadge: React.FC<{ urgency: Urgency; lang?: string; className?: string }> = ({ urgency, lang = 'fa', className }) => {
  const cfg = URGENCY_CONFIG[urgency];
  const label = lang === 'en' ? cfg.label : lang === 'ps' ? cfg.labelPs : cfg.labelFa;
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold', cfg.className, className)}>
      <span>{cfg.icon}</span> {label}
    </span>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; labelFa: string; labelPs: string; className: string }> = {
  pending:     { label: 'Pending',     labelFa: 'در انتظار',          labelPs: 'په تمه',          className: 'bg-yellow-100 text-yellow-700' },
  notified:    { label: 'Notified',    labelFa: 'اطلاع داده شده',     labelPs: 'خبر شوی',         className: 'bg-blue-100 text-blue-700' },
  donor_found: { label: 'Donor Found', labelFa: 'اهداکننده یافت شد',  labelPs: 'ورکوونکی وموندل شو', className: 'bg-green-100 text-green-700' },
  fulfilled:   { label: 'Fulfilled',   labelFa: 'تکمیل شده',          labelPs: 'بشپړ شو',         className: 'bg-green-200 text-green-800' },
  cancelled:   { label: 'Cancelled',   labelFa: 'لغو شده',            labelPs: 'لغوه شو',         className: 'bg-gray-100 text-gray-500' },
  expired:     { label: 'Expired',     labelFa: 'منقضی شده',          labelPs: 'پای ته رسیدلی',   className: 'bg-red-100 text-red-500' },
};

export const StatusBadge: React.FC<{ status: string; lang?: string; className?: string }> = ({ status, lang = 'fa', className }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, labelFa: status, labelPs: status, className: 'bg-gray-100 text-gray-500' };
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold', cfg.className, className)}>
      {pickLang(lang, { en: cfg.label, fa: cfg.labelFa, ps: cfg.labelPs })}
    </span>
  );
};

// ─── Loading Spinner ──────────────────────────────────────────────────────────
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ size = 'md', className }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <Loader2 className={clsx('animate-spin text-blood', sizes[size])} />
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx('bg-gray-200 rounded-xl animate-pulse', className)} />
);

// ─── Empty State ──────────────────────────────────────────────────────────────
export const EmptyState: React.FC<{ icon: string; title: string; description?: string; action?: React.ReactNode }> = ({
  icon, title, description, action
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="text-5xl mb-4">{icon}</div>
    <h3 className="text-lg font-semibold text-neutral-dark mb-2">{title}</h3>
    {description && <p className="text-sm text-neutral-medium mb-6">{description}</p>}
    {action}
  </div>
);

// ─── Bottom Sheet Modal ───────────────────────────────────────────────────────
export const BottomSheet: React.FC<{
  isOpen: boolean; onClose: () => void; title?: string; children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        {title && (
          <div className="px-5 pb-3 border-b border-gray-100">
            <h2 className="text-lg font-bold text-neutral-dark">{title}</h2>
          </div>
        )}
        <div className="p-5 pb-safe">{children}</div>
      </div>
    </div>
  );
};

// ─── Screen Header ────────────────────────────────────────────────────────────
export const ScreenHeader: React.FC<{
  title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode;
  gradient?: boolean;
}> = ({ title, subtitle, onBack, right, gradient }) => (
  <div className={clsx(
    'px-4 py-4 flex items-center gap-3 safe-top',
    gradient && 'gradient-blood text-white'
  )}>
    {onBack && (
      <button onClick={onBack} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    )}
    <div className="flex-1 min-w-0">
      <h1 className={clsx('text-lg font-bold truncate', gradient ? 'text-white' : 'text-neutral-dark')}>{title}</h1>
      {subtitle && <p className={clsx('text-xs', gradient ? 'text-white/80' : 'text-neutral-medium')}>{subtitle}</p>}
    </div>
    {right && <div className="flex-shrink-0">{right}</div>}
  </div>
);

// ─── Step Indicator ───────────────────────────────────────────────────────────
export const StepIndicator: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <div className="flex items-center gap-2 justify-center">
    {Array.from({ length: total }, (_, i) => (
      <div key={i} className={clsx(
        'rounded-full transition-all duration-300',
        i + 1 === current ? 'w-6 h-2 bg-blood' : i + 1 < current ? 'w-2 h-2 bg-blood/50' : 'w-2 h-2 bg-gray-200'
      )} />
    ))}
  </div>
);

// ─── Countdown Timer ──────────────────────────────────────────────────────────
export const CountdownTimer: React.FC<{ endsAt: string; onExpire?: () => void; className?: string }> = ({ endsAt, onExpire, className }) => {
  const [remaining, setRemaining] = React.useState('');

  React.useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Expired'); onExpire?.(); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [endsAt, onExpire]);

  return <span className={clsx('font-mono text-sm font-semibold text-orange-600', className)}>{remaining}</span>;
};

// ─── Donation Badge (gamification) ────────────────────────────────────────────
export const DonationBadge: React.FC<{ count: number; size?: 'sm' | 'md' }> = ({ count, size = 'md' }) => {
  const tier = count >= 50 ? '🏆' : count >= 20 ? '🥇' : count >= 10 ? '🥈' : count >= 5 ? '🥉' : count >= 1 ? '🩸' : '⭕';
  return (
    <div className={clsx('inline-flex items-center gap-1.5 bg-red-50 rounded-full font-semibold',
      size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm')}>
      <span>{tier}</span>
      <span className="text-blood">{count}</span>
    </div>
  );
};
