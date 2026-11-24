import { type ButtonHTMLAttributes, type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'secondary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        'btn',
        {
          'btn-primary': variant === 'primary',
          'btn-secondary': variant === 'secondary',
          'btn-ghost': variant === 'ghost',
          'btn-danger': variant === 'danger',
        },
        size === 'sm' && 'px-2.5 py-1 text-xs',
        size === 'lg' && 'px-5 py-3 text-base',
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Icon button                                                         */
/* ------------------------------------------------------------------ */

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: ButtonVariant;
  active?: boolean;
}

export function IconButton({ label, variant = 'ghost', active, className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={clsx(
        'btn btn-icon',
        {
          'btn-primary': variant === 'primary',
          'btn-secondary': variant === 'secondary',
          'btn-ghost': variant === 'ghost',
          'btn-danger': variant === 'danger',
          'bg-base-700 text-base-100': active && variant === 'ghost',
        },
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

interface PanelProps {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Panel({ title, actions, children, className, bodyClassName }: PanelProps) {
  return (
    <section className={clsx('panel flex flex-col min-h-0', className)}>
      {(title || actions) && (
        <header className="panel-header shrink-0">
          <h2 className="panel-title">{title}</h2>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      )}
      <div className={clsx('flex-1 min-h-0', bodyClassName ?? 'p-4')}>{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */

type BadgeTone = 'neutral' | 'accent' | 'live' | 'go' | 'signal';

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={clsx('badge', `badge-${tone}`, className)}>{children}</span>
  );
}

/* ------------------------------------------------------------------ */
/* Stat card                                                           */
/* ------------------------------------------------------------------ */

export function StatCard({
  label,
  value,
  icon,
  accent,
  hint,
  onClick,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: string;
  hint?: string;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={clsx(
        'panel p-4 flex items-center gap-4 text-left transition-colors',
        onClick && 'hover:border-base-600 hover:bg-base-800 cursor-pointer',
      )}
    >
      {icon ? (
        <div
          className="shrink-0 grid place-items-center w-11 h-11 rounded-lg"
          style={{ backgroundColor: `${accent ?? '#2563eb'}1f`, color: accent ?? '#60a5fa' }}
        >
          {icon}
        </div>
      ) : null}
      <div className="min-w-0">
        <div className="kicker">{label}</div>
        <div className="text-2xl font-semibold tabular leading-tight">{value}</div>
        {hint ? <div className="text-xs text-base-400 mt-0.5 truncate">{hint}</div> : null}
      </div>
    </Wrapper>
  );
}

/* ------------------------------------------------------------------ */
/* Field wrappers                                                      */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={clsx('block', className)}>
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-base-400">{hint}</span> : null}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const width = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  }[size];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8">
      <div
        className={clsx(
          'w-full rounded-xl bg-base-850 border border-base-700 shadow-2xl my-auto',
          width,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-center justify-between gap-4 px-5 py-4 border-b border-base-700">
          <h2 className="text-base font-semibold">{title}</h2>
          <IconButton label="Sluiten" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </header>
        <div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer ? (
          <footer className="flex items-center justify-end gap-2 px-5 py-4 border-t border-base-700">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Confirm dialog                                                      */
/* ------------------------------------------------------------------ */

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Verwijderen',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Annuleren
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-base-200">{message}</p>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {icon ? <div className="mb-3 text-base-500">{icon}</div> : null}
      <p className="text-sm font-semibold text-base-200">{title}</p>
      {description ? (
        <p className="mt-1 text-xs text-base-400 max-w-sm leading-relaxed">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

export function Loading({ label = 'Laden...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-base-400">
      <span className="w-4 h-4 rounded-full border-2 border-base-600 border-t-accent-400 animate-spin" />
      {label}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toast                                                               */
/* ------------------------------------------------------------------ */

export function Toast({
  message,
  tone = 'neutral',
  onDismiss,
}: {
  message: string;
  tone?: 'neutral' | 'go' | 'live';
  onDismiss?: () => void;
}) {
  useEffect(() => {
    if (!onDismiss) return;
    const timer = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timer);
  }, [onDismiss, message]);

  return (
    <div
      className={clsx(
        'fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-lg text-sm font-medium shadow-xl border bg-base-800',
        tone === 'go' && 'border-go-500 text-go-400',
        tone === 'live' && 'border-live-500 text-live-400',
        tone === 'neutral' && 'border-base-600 text-base-100',
      )}
      role="status"
    >
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toggle                                                              */
/* ------------------------------------------------------------------ */

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 w-full text-left py-1.5"
    >
      <span
        className={clsx(
          'relative shrink-0 w-9 h-5 rounded-full transition-colors mt-0.5',
          checked ? 'bg-accent-500' : 'bg-base-700',
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
            checked ? 'translate-x-4.5' : 'translate-x-0.5',
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description ? (
          <span className="block text-xs text-base-400 mt-0.5">{description}</span>
        ) : null}
      </span>
    </button>
  );
}
