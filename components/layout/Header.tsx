"use client";

import React from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function Header() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-900 hidden md:block">
          Construction Copilot
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleLogout}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
