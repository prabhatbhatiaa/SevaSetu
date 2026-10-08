import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const VARIANTS = {
  success: { icon: CheckCircle2, className: 'text-done', duration: 4000 },
  error: { icon: CircleAlert, className: 'text-danger', duration: 6000 },
  info: { icon: Info, className: 'text-muted', duration: 4000 },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message, type) => {
      const id = ++nextId.current;
      // Keep at most four on screen.
      setToasts((current) => [...current.slice(-3), { id, message, type }]);
      setTimeout(() => dismiss(id), VARIANTS[type].duration);
    },
    [dismiss],
  );

  const toast = useMemo(
    () => ({
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'error'),
      info: (message) => show(message, 'info'),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:items-end"
      >
        {toasts.map(({ id, message, type }) => {
          const { icon: Icon, className } = VARIANTS[type];
          return (
            <div
              key={id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm animate-scale-in items-start gap-3 rounded-xl border bg-surface p-3.5 shadow-[0_16px_40px_-16px_rgb(0_0_0/0.5)]"
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${className}`} />
              <p className="flex-1 text-sm leading-snug">{message}</p>
              <button
                type="button"
                onClick={() => dismiss(id)}
                aria-label="Dismiss notification"
                className="text-subtle transition-colors hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
