import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_USER, MockQueryBuilder, workspaceDb } from "./mock-db";

export { DEFAULT_USER, DEFAULT_COMPANY_ID } from "./mock-db";

export function isUsingMockWorkspace(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== "https://placeholder.supabase.co" &&
    supabaseAnonKey !== "placeholder"
  );
}

export function resetDemoData(): void {
  workspaceDb.resetData();
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}

class MockWorkspaceClient {
  public auth = {
    getUser: async () => ({
      data: { user: DEFAULT_USER },
      error: null,
    }),
    getSession: async () => ({
      data: {
        session: {
          user: DEFAULT_USER,
          access_token: "open-workspace-access-token",
        },
      },
      error: null,
    }),
    signOut: async () => ({
      error: null,
    }),
    signInWithPassword: async () => ({
      data: { user: DEFAULT_USER },
      error: null,
    }),
    signUp: async () => ({
      data: { user: DEFAULT_USER },
      error: null,
    }),
  };

  public from(tableName: string) {
    return new MockQueryBuilder(tableName);
  }

  public storage = {
    from: () => ({
      getPublicUrl: (filePath: string) => {
        if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
          return { data: { publicUrl: filePath } };
        }
        return {
          data: {
            publicUrl:
              "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
          },
        };
      },
      upload: async (filePath: string) => ({
        data: { path: filePath },
        error: null,
      }),
    }),
  };
}

let supabaseClientInstance: unknown = null;

function getSupabaseClient() {
  if (supabaseClientInstance) return supabaseClientInstance;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (isUsingMockWorkspace()) {
    supabaseClientInstance = new MockWorkspaceClient();
    return supabaseClientInstance;
  }

  // isUsingMockWorkspace() already checked this, but the explicit guard keeps
  // TypeScript and any runtime environment with missing public vars safe.
  if (!supabaseUrl || !supabaseAnonKey) {
    supabaseClientInstance = new MockWorkspaceClient();
    return supabaseClientInstance;
  }
  const realClient = createClient(supabaseUrl, supabaseAnonKey);

  // Wrap auth so No-Signup Concept works seamlessly even with real Supabase
  supabaseClientInstance = new Proxy(realClient, {
    get(target, prop) {
      if (prop === "auth") {
        return {
          ...target.auth,
          getUser: async () => {
            const res = await target.auth.getUser();
            if (res.data?.user) return res;
            return { data: { user: DEFAULT_USER }, error: null };
          },
          getSession: async () => {
            const res = await target.auth.getSession();
            if (res.data?.session) return res;
            return {
              data: {
                session: {
                  user: DEFAULT_USER,
                  access_token: "open-workspace-access-token",
                },
              },
              error: null,
            };
          },
        };
      }
      const value = (target as unknown as Record<string, unknown>)[prop as string];
      if (typeof value === "function") {
        return (...args: unknown[]) => (value as (...a: unknown[]) => unknown).apply(target, args);
      }
      return value;
    },
  });

  return supabaseClientInstance;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabaseClient() as Record<string, unknown>;
    const value = client[prop as string];
    if (typeof value === "function") {
      return (...args: unknown[]) => (value as (...a: unknown[]) => unknown).apply(client, args);
    }
    return value;
  },
});

export const createServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || supabaseUrl === "https://placeholder.supabase.co") {
    return new MockWorkspaceClient();
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};
