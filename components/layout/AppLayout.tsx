"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const closeOnResize = () => {
      if (window.innerWidth >= 1024) setMobileNavOpen(false);
    };
    window.addEventListener("resize", closeOnResize);
    return () => window.removeEventListener("resize", closeOnResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileNavOpen]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="min-h-screen lg:pl-64">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <main className="mx-auto w-full max-w-[1800px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
