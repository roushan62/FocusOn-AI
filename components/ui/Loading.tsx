import React from "react";

interface LoadingProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function Loading({ message = "Loading…", size = "md" }: LoadingProps) {
  const sizes: Record<string, string> = { sm: "h-4 w-4", md: "h-8 w-8", lg: "h-11 w-11" };
  return (
    <div className="flex flex-col items-center justify-center py-12" role="status" aria-live="polite">
      <svg className={`animate-spin text-sky-600 ${sizes[size]}`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      {message && <p className="mt-3 text-sm text-slate-500">{message}</p>}
    </div>
  );
}

export function PageLoading() {
  return <div className="flex h-[60vh] items-center justify-center"><Loading size="lg" message="Loading page…" /></div>;
}
