"use client";

import React, { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes: Record<string, string> = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };
  const titleId = "focuson-modal-title";

  return (
    <div
      ref={overlayRef}
      role="presentation"
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px] sm:items-center"
      onMouseDown={(event) => {
        if (event.target === overlayRef.current) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} className={`modal-panel my-auto w-full ${sizes[size]} overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl`}>
        {title && (
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <h3 id={titleId} className="text-lg font-bold tracking-tight text-slate-950">{title}</h3>
            <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1.5 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button>
          </div>
        )}
        <div className="max-h-[calc(100vh-6rem)] overflow-y-auto p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
