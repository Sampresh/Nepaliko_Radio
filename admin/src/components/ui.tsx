import clsx from 'clsx';
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

/**
 * Minimal shadcn-style primitives, hand-written rather than generated.
 * The shadcn CLI needs an interactive init and pulls in Radix packages we do
 * not need for a five-page CRUD panel; these cover the same surface.
 */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-station text-white hover:brightness-110',
        variant === 'secondary' && 'bg-surface text-white hover:brightness-125',
        variant === 'ghost' && 'text-muted hover:text-white',
        variant === 'danger' && 'bg-red-600/90 text-white hover:bg-red-600',
        className
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        'w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-white',
        'placeholder:text-muted focus:border-station focus:outline-none',
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        'w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-white',
        'placeholder:text-muted focus:border-station focus:outline-none',
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        'w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-white',
        'focus:border-station focus:outline-none',
        className
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-white">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs text-red-400">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={clsx('rounded-xl border border-hairline bg-surface p-5', className)}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'live' | 'warn';
}) {
  return (
    <span
      className={clsx(
        'rounded-full px-2 py-0.5 text-xs font-semibold',
        tone === 'neutral' && 'bg-canvas text-muted',
        tone === 'live' && 'bg-live/15 text-live',
        tone === 'warn' && 'bg-warn/15 text-warn'
      )}>
      {children}
    </span>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="size-6 animate-spin rounded-full border-2 border-hairline border-t-station" />
    </div>
  );
}
