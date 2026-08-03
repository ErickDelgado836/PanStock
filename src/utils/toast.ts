export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
}

type ToastListener = (toast: ToastMessage) => void;

const listeners: ToastListener[] = [];

export function subscribeToToasts(listener: ToastListener) {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export function showToast(
  title: string,
  message: string,
  type: 'success' | 'info' | 'warning' | 'error' = 'success',
  duration = 4000
) {
  const toast: ToastMessage = {
    id: Math.random().toString(36).substring(2, 9),
    title,
    message,
    type,
    duration,
  };
  listeners.forEach((fn) => fn(toast));
}
