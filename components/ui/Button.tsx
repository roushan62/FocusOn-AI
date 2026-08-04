"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({ variant = "primary", size = "md", loading = false, children, className = "", disabled, ...props }: ButtonProps) {
  const base = "inline-flex min-h-10 items-center justify-center rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
  const variants: Record<string, string> = {
    primary: "bg-slate-950 text-white shadow-sm hover:bg-slate-800",
    secondary: "bg-sky-600 text-white shadow-sm hover:bg-sky-700",
    danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    outline: "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && (
        <svg className="-ml-1 mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}
