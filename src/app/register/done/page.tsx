import Link from "next/link";
import { Nav } from "@/components/Nav";
import { SprinkleRule } from "@/components/SprinkleRule";

/**
 * Where Square sends the parent back to after a successful payment.
 *
 * This page deliberately makes no claim about the money having cleared — only
 * the webhook knows that, and it may land a second or two after the redirect.
 * So the wording confirms the payment was submitted and points at the email.
 */
export default function RegistrationDone() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-xl px-5 py-20 text-center">
        <SprinkleRule width={200} className="mx-auto" />
        <h1 className="mt-6 text-3xl md:text-4xl">Thank you — you&rsquo;re registered</h1>
        <p className="mt-4 leading-relaxed text-muted">
          Your payment has gone through and each child&rsquo;s birthday is booked with the
          bakery. Check your email for a receipt listing every celebration date, plus a
          private link you can use any time to review your orders.
        </p>
        <p className="mt-4 leading-relaxed text-muted">
          There&rsquo;s nothing else to do. We&rsquo;ll remind you about a week before each
          celebration. To change a date, a quantity or a teacher&rsquo;s name, contact the
          school office.
        </p>
        <Link href="/" className="btn-quiet mt-8">Back to the homepage</Link>
      </main>
    </>
  );
}
