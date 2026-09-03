import { NextResponse } from "next/server";
import { describeConnection, squareBaseUrl } from "@/lib/square";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A read-only check of whether this deployment can actually talk to Square.
 *
 * Visit it in a browser when checkout says "we couldn't open the payment page".
 * It reports which environment we're pointed at, which variables are present,
 * and what Square says when asked to list the account's locations — enough to
 * separate a wrong token from a wrong location id from a bad API version.
 *
 * Safe to leave in place: it returns no secrets, no location ids and no
 * customer data, and it cannot change anything.
 */
export async function GET() {
  const square = await describeConnection();

  const hints: string[] = [];

  if (!process.env.SQUARE_ACCESS_TOKEN) hints.push("SQUARE_ACCESS_TOKEN is not set.");
  if (!process.env.SQUARE_LOCATION_ID) hints.push("SQUARE_LOCATION_ID is not set.");
  if (!process.env.SQUARE_WEBHOOK_SIGNATURE_KEY) {
    hints.push("SQUARE_WEBHOOK_SIGNATURE_KEY is not set — payments will succeed but orders will never be marked paid.");
  }
  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    hints.push("NEXT_PUBLIC_SITE_URL is not set — webhook signatures cannot be verified and email links will be broken.");
  }
  if (square.httpStatus === 401) {
    hints.push("Square rejected the token. Usually this means the token belongs to the other environment — a production token while SQUARE_ENVIRONMENT is sandbox, or the reverse.");
  }
  if (square.ok && square.locationMatches === false) {
    hints.push("The token works, but SQUARE_LOCATION_ID is not one of this account's locations. Sandbox and production have completely separate location ids, so a real location id will not work with a sandbox token.");
  }

  return NextResponse.json({
    environment: process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox",
    squareApiHost: squareBaseUrl(),
    variablesPresent: {
      SQUARE_ACCESS_TOKEN: Boolean(process.env.SQUARE_ACCESS_TOKEN),
      SQUARE_LOCATION_ID: Boolean(process.env.SQUARE_LOCATION_ID),
      SQUARE_WEBHOOK_SIGNATURE_KEY: Boolean(process.env.SQUARE_WEBHOOK_SIGNATURE_KEY),
      NEXT_PUBLIC_SITE_URL: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
    },
    expectedWebhookUrl: process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/api/square/webhook`
      : null,
    square,
    hints: hints.length ? hints : ["Everything this check can see looks correct."],
  });
}
