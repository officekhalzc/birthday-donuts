import Link from "next/link";
import { Nav } from "@/components/Nav";
import { SprinkleRule } from "@/components/SprinkleRule";

/**
 * Where a parent lands once the order is in.
 *
 * Nothing has been charged at this point — the office sends a payment link by
 * hand a few days later — so the wording is careful not to imply otherwise.
 */
export default function RegistrationDone() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-xl px-5 py-20 text-center">
        <SprinkleRule width={200} className="mx-auto" />
        <h1 className="mt-6 text-3xl md:text-4xl">Thank you for your order</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          We&rsquo;ll be sending you a payment link within the next few days.
        </p>
        <p className="mt-5 leading-relaxed text-muted">
          Have a great day!
        </p>
        <p className="mt-8 text-sm leading-relaxed text-muted">
          Your child&rsquo;s celebration date is already booked with the school office.
          To change a date, a quantity or a teacher&rsquo;s name, just reply to the
          confirmation email or contact the office.
        </p>
        <Link href="/" className="btn-quiet mt-8">Back to the homepage</Link>
      </main>
    </>
  );
}
