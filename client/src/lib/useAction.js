import { useCallback, useState } from 'react';
import { getErrorMessage } from './api';
import { useToast } from '../context/ToastContext';

/**
 * Wraps one-off API actions (accept, decline, complete…) with a busy flag and
 * success/error toasts.
 *
 *   const { pendingKey, run } = useAction();
 *   run('accept-123', () => api.put(...), 'Offer accepted.', reload);
 */
export function useAction() {
  const toast = useToast();
  const [pendingKey, setPendingKey] = useState(null);

  const run = useCallback(
    async (key, request, successMessage, onSuccess) => {
      setPendingKey(key);
      try {
        const result = await request();
        if (successMessage) toast.success(successMessage);
        await onSuccess?.(result);
        return result;
      } catch (error) {
        toast.error(getErrorMessage(error));
        return null;
      } finally {
        setPendingKey(null);
      }
    },
    [toast],
  );

  return { pendingKey, run };
}
