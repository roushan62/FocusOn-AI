"use client";

import React from "react";
import { resetDemoData } from "@/lib/supabase/client";

export function Header() {
  const handleReset = () => {
    if (confirm("Reset workspace to the default Demo ERP dataset? Any custom items added will be reset.")) {
      resetDemoData();
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-gray-900 hidden md:block">
          Construction Copilot — AI Interior Fit-Out ERP
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
          <span className="font-bold">Apex Interior Fit-Outs Pvt Ltd</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>No-Signup Open Workspace</span>
        </div>

        <button
          onClick={handleReset}
          title="Reset to default demo dataset"
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Reset Demo Data
        </button>
      </div>
    </header>
  );
}
