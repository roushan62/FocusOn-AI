"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { isUsingMockWorkspace, resetDemoData } from "@/lib/supabase/client";

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/ai-chat": "AI Construction Copilot",
  "/projects": "Projects",
  "/clients": "Clients",
  "/boq": "Bills of Quantities",
  "/quotation": "Quotations",
  "/purchase": "Purchase Orders",
  "/vendors": "Vendors & Materials",
  "/inventory": "Inventory",
  "/site": "Site Reports",
  "/documents": "Documents",
  "/accounts": "Accounts",
  "/reports": "Reports",
  "/settings": "Company Settings",
};

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const basePath = `/${pathname.split("/")[1] || "dashboard"}`;
  const title = pageTitles[basePath] || "Workspace";

  const handleReset = () => {
    if (window.confirm("Reset this workspace to the demo interior fit-out dataset? Custom items will be removed.")) {
      resetDemoData();
    }
  };

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onMenuClick} aria-label="Open navigation" className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950 sm:text-base">{title}</p>
          <p className="hidden text-[11px] font-medium text-slate-400 sm:block">Commercial interiors · Operations workspace</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 md:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Live workspace</span>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 lg:flex">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-[10px] font-bold text-white">A</span>
          Interior fit-out
        </div>
        {isUsingMockWorkspace() && (
          <button type="button" onClick={handleReset} title="Reset local demo data" className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 sm:px-3">
            <span className="sm:hidden">↻</span>
            <span className="hidden sm:inline">Reset demo</span>
          </button>
        )}
      </div>
    </header>
  );
}
