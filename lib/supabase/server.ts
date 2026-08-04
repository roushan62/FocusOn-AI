import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { DEFAULT_USER } from "./mock-db";

export async function createServerSupabase() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

  const client = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  );

  // Wrap getUser so No-Signup Open Concept works in server components as well
  return new Proxy(client, {
    get(target, prop) {
      if (prop === "auth") {
        return {
          ...target.auth,
          getUser: async () => ({
            data: { user: DEFAULT_USER },
            error: null,
          }),
        };
      }
      const val = (target as unknown as Record<string, unknown>)[prop as string];
      if (typeof val === "function") {
        return (...args: unknown[]) => (val as (...a: unknown[]) => unknown).apply(target, args);
      }
      return val;
    },
  });
}
