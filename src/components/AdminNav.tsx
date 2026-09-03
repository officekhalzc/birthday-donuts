import Link from "next/link";
import { getProfile } from "@/lib/supabase/server";

/** Header for the staff area. The bakery sees only what it needs. */
export async function AdminNav() {
  const profile = await getProfile();
  const isAdmin = profile?.role === "admin";

  return (
    <header className="no-print sticky top-0 z-20 border-b border-line bg-paper/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        <Link href={isAdmin ? "/admin" : "/admin/bakery"}
          className="font-display text-lg font-semibold tracking-tight">
          Birthday Mini Doughnuts
          <span className="ml-2 align-middle text-xs font-normal text-muted">
            {isAdmin ? "School office" : "Bakery"}
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1 text-sm font-medium">
          {isAdmin && (
            <>
              <Link href="/admin" className="rounded-pill px-3 py-2 hover:bg-white">Orders</Link>
              <Link href="/admin/school-year" className="rounded-pill px-3 py-2 hover:bg-white">School years</Link>
            </>
          )}
          <Link href="/admin/bakery" className="rounded-pill px-3 py-2 hover:bg-white">Bakery</Link>
          <Link href="/admin/bakery/production" className="rounded-pill px-3 py-2 hover:bg-white">Production sheet</Link>
          <form action="/auth/signout" method="post">
            <button className="rounded-pill px-3 py-2 text-muted hover:bg-white">Sign out</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
