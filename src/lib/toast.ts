// src/lib/toast.ts — singleton, no React context needed — callable from hooks too
export type ToastType = 'success' | 'error' | 'info';
export interface ToastItem { id: string; type: ToastType; message: string; }

type Listener = (t: ToastItem[]) => void;
let _toasts: ToastItem[] = [];
let _listeners: Listener[] = [];

function _notify() { _listeners.forEach((l) => l([..._toasts])); }

function _add(message: string, type: ToastType) {
  const id = Math.random().toString(36).slice(2, 9);
  _toasts = [..._toasts, { id, type, message }];
  _notify();
  setTimeout(() => _remove(id), 3200);
}

export function _remove(id: string) {
  _toasts = _toasts.filter((t) => t.id !== id);
  _notify();
}

export function subscribe(listener: Listener): () => void {
  _listeners.push(listener);
  listener([..._toasts]);
  return () => { _listeners = _listeners.filter((l) => l !== listener); };
}

export const toast = {
  success: (message: string) => _add(message, 'success'),
  error:   (message: string) => _add(message, 'error'),
  info:    (message: string) => _add(message, 'info'),
};
