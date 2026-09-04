import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieList = { name: string; value: string; options?: any }[];

/**
 * Guards the staff area. Everything outside /admin is public — parents
 * register and pay without ever signing in.
 */
/**
 * Temporary: the staff link was circulated to parents by mistake, so anyone
 * arriving at /admin is sent to the home page instead of a login screen they
 * have no business seeing.
 *
 * This is a signposting measure, not a security control — the admin area was
 * and still is protected by the Supabase session checks below. Staff get in by
 * visiting /admin/login?staff=1 once, which drops the cookie and then behaves
 * exactly as before.
 *
 * Remove this block, the constant and the cookie once the correct link has
 * been sent out.
 */
const STAFF_ENTRY_COOKIE = "staff_entry";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;

  if (!path.startsWith("/admin")) return response;

  const hasStaffEntry = request.cookies.get(STAFF_ENTRY_COOKIE)?.value === "1";
  const claimingStaffEntry = request.nextUrl.searchParams.get("staff") === "1";

  if (!hasStaffEntry && !claimingStaffEntry) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // First arrival with ?staff=1: remember it, then drop the marker from the
  // URL so it isn't copied out of the address bar into another email.
  if (claimingStaffEntry && !hasStaffEntry) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete("staff");
    const granted = NextResponse.redirect(clean);
    granted.cookies.set(STAFF_ENTRY_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return granted;
  }

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
