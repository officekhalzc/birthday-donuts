import Link from "next/link";
import { Nav } from "@/components/Nav";
import { SprinkleRule } from "@/components/SprinkleRule";

export default function RegistrationDone() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-xl px-5 py-20 text-center">
        <SprinkleRule width={200} className="mx-auto" />
        <h1 className="mt-6 text-3xl md:text-4xl">Registration received</h1>
        <p className="mt-4 leading-relaxed text-muted">
          Check your email — we&rsquo;ve sent a confirmation with each child&rsquo;s birthday,
          the school celebration date, and a link you can use to pay.
        </p>
        <p className="mt-4 leading-relaxed text-muted">
          There&rsquo;s nothing else to do. We&rsquo;ll remind you about a week before each
          celebration. To change anything, contact the school office.
        </p>
        <Link href="/" className="btn-quiet mt-8">Back to the homepage</Link>
      </main>
    </>
  );
}
