"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

/** Modal com <dialog> nativo: foco preso, Esc fecha e o fundo fica inerte. No celular vira folha. */
export function Modal({
  open,
  title,
  onClose,
  wide = false,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      el.querySelector<HTMLElement>("[autofocus], input, select, textarea")?.focus();
    } else if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`modal${wide ? " wide" : ""}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {open && (
        <div className="modal-box">
          <header>
            <h2>{title}</h2>
            <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}>
              <Icon name="close" />
            </button>
          </header>
          <div className="modal-body">{children}</div>
          {footer && <footer>{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
