"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="p-8 text-center max-w-md w-full shadow-lg">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
          <span className="text-xl font-bold text-white">F</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">FocusOn AI ERP</h1>
        <p className="text-sm text-gray-600 mb-4">
          Login and signup have been removed for the best No-Signup Instant Open Workspace experience.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
          <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          Launching Instant ERP Workspace...
        </div>
      </Card>
    </div>
  );
}
