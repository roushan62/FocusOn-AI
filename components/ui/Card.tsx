import React from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export function Card({
  title,
  subtitle,
  children,
  className = "",
  actions,
}: CardProps) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
