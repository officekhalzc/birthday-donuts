import { formatLong, formatShort, money } from "../dates";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "";

function shell(heading: string, body: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html><body style="margin:0;background:#FDFBF4;padding:32px 16px;
    font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#2E2440;">
    <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;
      border-radius:18px;border:1px solid #EAE3D6;">
      <tr><td style="padding:32px;">
        <div style="height:6px;background:repeating-linear-gradient(115deg,#B0416B 0 3px,transparent 3px 13px),
          repeating-linear-gradient(65deg,#E8A33D 0 3px,transparent 3px 19px);border-radius:3px;margin-bottom:24px;"></div>
        <h1 style="font-size:22px;margin:0 0 16px;line-height:1.3;">${heading}</h1>
        <div style="font-size:15px;line-height:1.6;color:#4A4157;">${body}</div>
        ${cta ? `<p style="margin:28px 0 0;"><a href="${cta.href}"
          style="background:#E8A33D;color:#2E2440;font-weight:600;text-decoration:none;
          padding:12px 22px;border-radius:999px;display:inline-block;">${cta.label}</a></p>` : ""}
        <p style="margin:28px 0 0;font-size:13px;color:#7A7086;">
          A Nourish to Flourish program · Baked and delivered by Manna Bakehouse</p>
      </td></tr>
    </table></body></html>`;
}

type OrderInfo = {
  child_first_name: string;
  school_name: string;
  grade: string;
  teacher_name: string;
  birthday: string;
  delivery_date: string;
  donut_count: number;
  package_name: string;
  amount_cents?: number;
};

export const templates = {
  registration_confirmation(rows: OrderInfo[], payToken: string, plan: "annual" | "per_birthday") {
    const total = rows.reduce((sum, r) => sum + (r.amount_cents ?? 0), 0);
    const list = rows
      .map(
        (r) => `<p style="margin:0 0 14px;"><strong>${r.child_first_name}</strong><br/>
          Birthday ${formatShort(r.birthday)} · celebrated ${formatLong(r.delivery_date)}<br/>
          ${r.school_name} · ${r.grade} · ${r.teacher_name}<br/>
          ${r.donut_count} mini doughnuts${r.amount_cents ? ` · ${money(r.amount_cents)}` : ""}</p>`
      )
      .join("");

    return {
      subject:
        rows.length === 1
          ? `${rows[0].child_first_name} is registered for birthday mini doughnuts`
          : `${rows.length} children registered for birthday mini doughnuts`,
      html: shell(
        rows.length === 1 ? `${rows[0].child_first_name} is all set` : "You're all set",
        `<p>Thank you for registering. Here is what the school has:</p>
         ${list}
         <p><strong>Total: ${money(total)}</strong></p>
         <p>${
           plan === "annual"
             ? "You chose to pay for the year in one go. Use the button below whenever you're ready."
             : "You chose to pay before each birthday. We'll email you a payment link about a week ahead."
         }</p>
         <p>Keep this email — the button below is your private link, so you never
         need a password. If anything is wrong, reply to the school office.</p>`,
        { label: "Pay or review", href: `${SITE}/pay/${payToken}` }
      ),
    };
  },

  upcoming_reminder(o: OrderInfo, needsPayment: boolean, payToken: string) {
    return {
      subject: `${o.child_first_name}'s birthday mini doughnuts arrive ${formatLong(o.delivery_date)}`,
      html: shell(
        `Coming up: ${formatLong(o.delivery_date)}`,
        `<p>${o.donut_count} ${o.package_name.toLowerCase()} will be delivered to
         ${o.school_name} for ${o.grade} — ${o.teacher_name}.</p>
         ${needsPayment
           ? `<p><strong>Payment is still needed</strong>${o.amount_cents ? ` — ${money(o.amount_cents)}` : ""}.
              Please pay before the delivery date so we can confirm the order with the bakery.</p>`
           : `<p>Everything is paid and confirmed. Nothing for you to do.</p>`}`,
        needsPayment
          ? { label: "Pay now", href: `${SITE}/pay/${payToken}` }
          : undefined
      ),
    };
  },

  delivery_confirmation(o: OrderInfo) {
    return {
      subject: `${o.child_first_name}'s birthday mini doughnuts were delivered`,
      html: shell(
        `Delivered — happy birthday, ${o.child_first_name}!`,
        `<p>${o.donut_count} mini doughnuts arrived at ${o.school_name} this morning for
         ${o.grade} — ${o.teacher_name}. We hope the class enjoyed them.</p>`
      ),
    };
  },

  admin_weekly_summary(rows: OrderInfo[]) {
    const list = rows
      .map(
        (r) => `<tr><td style="padding:6px 12px 6px 0;">${formatShort(r.delivery_date)}</td>
          <td style="padding:6px 12px 6px 0;">${r.child_first_name}</td>
          <td style="padding:6px 12px 6px 0;">${r.school_name} ${r.grade}</td>
          <td style="padding:6px 0;text-align:right;">${r.donut_count}</td></tr>`
      )
      .join("");
    const total = rows.reduce((s, r) => s + r.donut_count, 0);
    return {
      subject: `Birthday mini doughnuts this week — ${rows.length} deliveries`,
      html: shell(
        "This week's birthday deliveries",
        rows.length
          ? `<table style="width:100%;border-collapse:collapse;font-size:14px;">${list}</table>
             <p style="margin-top:16px;"><strong>Total mini doughnuts: ${total}</strong></p>`
          : `<p>No deliveries scheduled this week.</p>`,
        { label: "Open the office dashboard", href: `${SITE}/admin` }
      ),
    };
  },

  bakery_production_summary(rows: OrderInfo[]) {
    const list = rows
      .map(
        (r) => `<tr><td style="padding:6px 12px 6px 0;">${formatShort(r.delivery_date)}</td>
          <td style="padding:6px 12px 6px 0;">${r.school_name}</td>
          <td style="padding:6px 12px 6px 0;">${r.package_name}</td>
          <td style="padding:6px 0;text-align:right;">${r.donut_count}</td></tr>`
      )
      .join("");
    const total = rows.reduce((s, r) => s + r.donut_count, 0);
    return {
      subject: `Production summary — ${total} mini doughnuts over the next 7 days`,
      html: shell(
        "Upcoming production",
        `<table style="width:100%;border-collapse:collapse;font-size:14px;">${list}</table>
         <p style="margin-top:16px;"><strong>Total mini doughnuts: ${total}</strong></p>`,
        { label: "Open the bakery dashboard", href: `${SITE}/admin/bakery` }
      ),
    };
  },
};
