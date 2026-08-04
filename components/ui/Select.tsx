"use client";

import React, { useId } from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, id, className = "", ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;
  return (
    <div className="space-y-1">
      {label && <label htmlFor={selectId} className="block text-sm font-semibold text-slate-700">{label}</label>}
      <select id={selectId} className={`block min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 ${error ? "border-red-500" : ""} ${className}`} {...props}>
        <option value="">Select…</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
