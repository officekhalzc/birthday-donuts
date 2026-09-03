import Link from "next/link";

/** Public site header. The only thing a visitor can do here is register. */
export function Nav() {
  return (
    <header className="no-print sticky top-0 z-20 border-b border-line bg-paper/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight">
          Birthday Mini Doughnuts
        </Link>
        <Link href="/register" className="btn-primary !px-4 !py-2 text-sm">
          Register my child
        </Link>
      </div>
    </header>
  );
}
