import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieList = { name: string; value: string; options?: any }[];

/**
 * Guards the staff area. Everything outside /admin is public — parents
 * register and pay without ever signing in.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;

  if (!path.startsWith("/admin")) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list: CookieList) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (path === "/admin/login") {
    if (user) return NextResponse.redirect(new URL("/admin", request.url));
    return response;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  // Bakery staff may only reach the two kitchen screens.
  if (profile?.role !== "admin" && !path.startsWith("/admin/bakery")) {
    return NextResponse.redirect(new URL("/admin/bakery", request.url));
  }

  return response;
}
