import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a dummy client during build/SSR if env vars not set
    supabaseClient = createClient(
      supabaseUrl || "https://placeholder.supabase.co",
      supabaseAnonKey || "placeholder",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    return supabaseClient;
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
}

// Proxy that lazily initializes the client
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabaseClient();
    const value = (client as unknown as Record<string, unknown>)[prop as string];
    if (typeof value === "function") {
      return (...args: unknown[]) => (value as (...a: unknown[]) => unknown).apply(client, args);
    }
    return value;
  },
});

export const createServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};
