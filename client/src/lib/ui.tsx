import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

/* -- Toasts -------------------------------------------------------------- */

type ToastKind = 'success' | 'error' | 'info';
interface Toast { id: number; text: string; kind: ToastKind }

const ToastCtx = createContext<(text: string, kind?: ToastKind) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

let toastId = 0;

export function ToastHost({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const show = useCallback((text: string, kind: ToastKind = 'info') => {
    const id = ++toastId;
    setItems(p => [...p, { id, text, kind }]);
    setTimeout(() => setItems(p => p.filter(t => t.id !== id)), 5000);
  }, []);

  const tone: Record<ToastKind, string> = {
    success: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    error: 'border-rose-300 bg-rose-50 text-rose-900',
    info: 'border-slate-300 bg-white text-slate-900'
  };

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {items.map(t => (
          <div key={t.id} role="status"
            className={`rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${tone[t.kind]}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* -- Primitives ---------------------------------------------------------- */

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-5 ${className}`}>{children}</div>;
}

export function H1({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{children}</h1>
      {sub && <p className="mt-1 max-w-2xl text-sm text-slate-600">{sub}</p>}
    </div>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-lg font-semibold text-slate-900">{children}</h2>;
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
};

export function Btn({ variant = 'primary', loading, children, className = '', disabled, ...rest }: BtnProps) {
  const styles = {
    primary: 'bg-blue-700 text-white hover:bg-blue-800 disabled:bg-blue-300',
    secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:text-slate-400',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }[variant];

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${styles} ${className}`}
    >
      {loading && (
        <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}

const badgeTones: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-900 ring-amber-200',
  red: 'bg-rose-50 text-rose-800 ring-rose-200',
  blue: 'bg-blue-50 text-blue-800 ring-blue-200',
  grey: 'bg-slate-100 text-slate-700 ring-slate-200'
};

export function Badge({ tone = 'grey', children }: { tone?: keyof typeof badgeTones | string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${badgeTones[tone] ?? badgeTones.grey}`}>
      {children}
    </span>
  );
}

/** Maps an NGO status to a badge a non-technical reader understands. */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    VERIFIED: ['green', 'Verified'],
    PENDING: ['amber', 'Awaiting review'],
    UNDER_REVIEW: ['blue', 'Being reviewed'],
    REQUIRES_CORRECTION: ['amber', 'Changes needed'],
    REJECTED: ['red', 'Not approved'],
    SUSPENDED: ['red', 'Suspended'],
    APPROVED: ['green', 'Approved'],
    SUCCESSFUL: ['green', 'Successful'],
    FAILED: ['red', 'Failed'],
    ACTIVE: ['green', 'Active'],
    COMPLETED: ['blue', 'Completed'],
    SUBMITTED: ['amber', 'New'],
    UNDER_INVESTIGATION: ['blue', 'Being looked into'],
    RESOLVED: ['green', 'Resolved'],
    DISMISSED: ['grey', 'Closed'],
    UNRESOLVED: ['red', 'Open'],
    INVESTIGATING: ['amber', 'Investigating'],
    CONFIRMED: ['green', 'Confirmed'],
    DISPUTED: ['red', 'Disputed'],
    MATCH: ['green', 'Location matches'],
    NEARBY: ['amber', 'Same region'],
    MISMATCH: ['red', 'Location does not match']
  };
  const [tone, label] = map[status] ?? ['grey', status.replace(/_/g, ' ').toLowerCase()];
  return <Badge tone={tone}>{label}</Badge>;
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
}

/** Score out of 100 with a plain-language band. */
export function ScoreDial({ score, label = 'Transparency score' }: { score: number; label?: string }) {
  const tone = score >= 75 ? 'text-emerald-700' : score >= 50 ? 'text-amber-700' : 'text-rose-700';
  const bar = score >= 75 ? 'bg-emerald-600' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  const word = score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 50 ? 'Moderate' : 'Low';

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        <span className={`text-sm font-bold ${tone}`}>{word}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-900">{score}</span>
        <span className="text-sm text-slate-500">/ 100</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.max(2, score)}%` }} />
      </div>
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <Card className="text-center">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-800">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';

export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) =>
  <input {...p} className={`${inputCls} ${p.className ?? ''}`} />;

export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) =>
  <textarea {...p} className={`${inputCls} ${p.className ?? ''}`} />;

export const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) =>
  <select {...p} className={`${inputCls} ${p.className ?? ''}`} />;

export function Alert({ tone = 'info', children }: { tone?: 'info' | 'success' | 'warning' | 'error'; children: React.ReactNode }) {
  const styles = {
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900'
  }[tone];
  return <div className={`rounded-lg border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div className="py-12 text-center text-sm text-slate-500">{label}</div>;
}

/* -- Stepper ------------------------------------------------------------- */

/** Progress indicator for the multi-step registration form. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <nav aria-label="Progress" className="mb-6">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                aria-current={active ? 'step' : undefined}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done ? 'bg-emerald-600 text-white'
                  : active ? 'bg-blue-700 text-white'
                  : 'bg-slate-200 text-slate-600'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`text-xs font-medium ${active ? 'text-slate-900' : 'text-slate-500'}`}>
                {label}
              </span>
              {i < steps.length - 1 && <span aria-hidden className="hidden h-px w-6 bg-slate-300 sm:block" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* -- File input ---------------------------------------------------------- */

/** File picker showing the chosen file name and enforcing type and size. */
export function FileInput({
  accept = '.jpg,.jpeg,.png,.pdf',
  maxMb = 5,
  onChange,
  required
}: {
  accept?: string;
  maxMb?: number;
  onChange: (file: File | null) => void;
  required?: boolean;
}) {
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handle = (file: File | null) => {
    setError(null);
    if (!file) { setName(null); onChange(null); return; }

    if (file.size > maxMb * 1024 * 1024) {
      setError(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${maxMb} MB.`);
      setName(null);
      onChange(null);
      return;
    }

    setName(file.name);
    onChange(file);
  };

  return (
    <div>
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 px-4 py-3 transition-colors hover:border-blue-600 hover:bg-blue-50/40">
        <span className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
          Choose file
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
          {name ?? `JPG, PNG or PDF · up to ${maxMb} MB`}
        </span>
        <input
          type="file"
          accept={accept}
          required={required && !name}
          className="sr-only"
          onChange={e => handle(e.target.files?.[0] ?? null)}
        />
      </label>
      {error && <p className="mt-1 text-xs font-medium text-rose-700">{error}</p>}
    </div>
  );
}

/* -- Modal and confirmation --------------------------------------------- */

export function Modal({
  title, onClose, children, footer
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
      <div role="dialog" aria-modal="true" aria-label={title}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Close"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/** Confirmation before something destructive. */
export function Confirm({
  title, body, confirmLabel = 'Confirm', danger, onConfirm, onCancel, busy
}: {
  title: string; body: string; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void; busy?: boolean;
}) {
  return (
    <Modal title={title} onClose={onCancel} footer={
      <>
        <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
        <Btn variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>
          {confirmLabel}
        </Btn>
      </>
    }>
      <p className="text-sm leading-relaxed text-slate-700">{body}</p>
    </Modal>
  );
}

/* -- Tabs ---------------------------------------------------------------- */

export function Tabs<T extends string>({
  tabs, current, onChange
}: {
  tabs: { id: T; label: string; badge?: number }[];
  current: T;
  onChange: (id: T) => void;
}) {
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          aria-current={current === t.id ? 'page' : undefined}
          className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            current === t.id
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}>
          {t.label}
          {t.badge ? <Badge tone="amber">{t.badge}</Badge> : null}
        </button>
      ))}
    </nav>
  );
}

/* -- Data loading hook --------------------------------------------------- */

/** Loads data on mount, exposing error and a manual reload. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    fn()
      .then(d => { if (live) { setData(d); setError(null); } })
      .catch(e => { if (live) setError(e.message ?? 'Could not load this.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, error, loading, reload: () => setNonce(n => n + 1) };
}
