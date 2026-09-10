import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export const createClient = cache(async () => {
  const cookieStore = await cookies();

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
            // setAll called from a Server Component — session refresh handled by middleware
          }
        },
      },
    }
  );

  // Safely memoize getUser() per request within React Server Components
  const originalGetUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = cache(async (jwt?: string) => {
    return await originalGetUser(jwt);
  });

  return client;
});

