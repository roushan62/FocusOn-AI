"use client";

import React, { useId } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, className = "", ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return (
    <div className="space-y-1">
      {label && <label htmlFor={inputId} className="block text-sm font-semibold text-slate-700">{label}</label>}
      <input id={inputId} className={`block min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-500 ${error ? "border-red-500 focus:border-red-500 focus:ring-red-100" : ""} ${className}`} {...props} />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
