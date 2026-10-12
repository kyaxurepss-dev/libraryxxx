import {
  forwardRef,
  useEffect,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

/* Buttons ------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-ink font-bold hover:bg-accent-hover active:translate-y-px shadow-plate',
  secondary:
    'bg-plate-raised text-paper border border-rule hover:border-rule-strong hover:bg-plate-hover active:translate-y-px',
  ghost:
    'text-paper-dim hover:text-paper hover:bg-plate-raised active:translate-y-px',
  danger:
    'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 active:translate-y-px',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs gap-1.5 rounded-control',
  md: 'h-10 px-4 text-sm gap-2 rounded-control',
  lg: 'h-12 px-6 text-sm gap-2.5 rounded-plate',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center font-display font-semibold tracking-tight transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

/* IconButton — square toolbar action, accessible name required */

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, active = false, className, children, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-control transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45',
        active
          ? 'bg-accent/15 text-accent'
          : 'text-paper-dim hover:bg-plate-raised hover:text-paper',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);
IconButton.displayName = 'IconButton';

/* Badge -------------------------------------------------------- */

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-plate-raised text-paper-dim border-rule',
  accent: 'bg-accent/12 text-accent border-accent/25',
  success: 'bg-success/12 text-success border-success/25',
  warning: 'bg-warning/12 text-warning border-warning/25',
  danger: 'bg-danger/12 text-danger border-danger/25',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-control border px-2 py-0.5 text-[11px] font-semibold tracking-wide',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* Score — color encodes the band, the number is always shown */

export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  const tone: BadgeTone = score >= 75 ? 'success' : score >= 50 ? 'warning' : 'danger';
  return (
    <Badge tone={tone} className={cn('tabular', className)}>
      {score}
    </Badge>
  );
}

/* Section heading — the editorial page header ------------------ */

export function SectionHeading({
  kicker,
  title,
  meta,
  action,
  className,
}: {
  kicker: string;
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <p className="kicker mb-2">{kicker}</p>
        <h1 className="font-display text-[clamp(1.75rem,2.6vw,2.5rem)] font-bold leading-none tracking-tight text-paper">
          {title}
        </h1>
        {meta && <div className="mt-3 flex items-center gap-3 text-sm text-paper-dim">{meta}</div>}
      </div>
      {action}
    </header>
  );
}

/* States ------------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-sheet border border-dashed border-rule px-8 py-16 text-center',
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-plate bg-plate text-paper-dim">
        {icon}
      </div>
      <h3 className="font-display text-lg font-bold text-paper">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-paper-dim">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-sheet border border-danger/25 bg-danger/5 px-8 py-14 text-center',
        className,
      )}
    >
      <h3 className="font-display text-lg font-bold text-paper">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm text-paper-dim">{description}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent',
        className,
      )}
    />
  );
}

/* Confirm dialog — replaces native confirm() ------------------- */

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'danger',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: 'danger' | 'accent';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      data-modal="true"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="animate-sheet w-full max-w-sm rounded-sheet border border-rule bg-plate-raised p-6 shadow-overlay"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="font-display text-lg font-bold text-paper">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-paper-dim">{description}</p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} autoFocus>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}