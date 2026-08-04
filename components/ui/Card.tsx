import React from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export function Card({ title, subtitle, children, className = "", actions }: CardProps) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            {title && <h2 className="truncate text-base font-bold tracking-tight text-slate-950">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs leading-5 text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
