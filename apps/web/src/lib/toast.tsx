"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";

type Tone = "ok" | "error" | "info";
type Toast = { id: number; text: string; tone: Tone };
const ToastContext = createContext<((text: string, tone?: Tone) => void) | null>(null);

let next = 1;

/** Avisos rápidos no canto da tela (somem sozinhos). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setItems((all) => all.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (text: string, tone: Tone = "ok") => {
      const id = next++;
      setItems((all) => [...all, { id, text, tone }]);
      setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3500);
    },
    [dismiss],
  );
  const value = useMemo(() => push, [push]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            <Icon name={t.tone === "error" ? "alert" : "check"} size={18} />
            <span>{t.text}</span>
            <button className="icon-btn" aria-label="Fechar aviso" onClick={() => dismiss(t.id)}>
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast fora do ToastProvider");
  return ctx;
}
