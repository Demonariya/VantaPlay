declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
    };
  }
}
export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && typeof window.__TAURI_INTERNALS__?.invoke === "function";
}
export function invokeNative<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const internalInvoke = window.__TAURI_INTERNALS__?.invoke;
  if (!internalInvoke) return Promise.reject(new Error("This action is available in the VantaPlay desktop app only."));
  return internalInvoke<T>(command, args);
}
export {};
