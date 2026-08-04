"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <span className="text-xl font-bold text-white">F</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FocusOn AI</h1>
          <p className="mt-2 text-sm text-gray-600">
            AI Interior Fit-Out ERP
          </p>
        </div>

        <div className="rounded-xl border bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-gray-900">Sign In</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full">
              Sign In
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
