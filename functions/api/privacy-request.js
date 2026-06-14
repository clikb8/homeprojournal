/**
 * Cloudflare Pages Function — Do Not Sell / Privacy Request handler
 * Route: POST /api/privacy-request
 *
 * This receives the Do Not Sell form submission and forwards it to wherever
 * you want privacy requests to land. Pick ONE delivery method below and set
 * the matching environment variable(s) in your Cloudflare Pages project
 * (Settings → Environment variables). The function auto-detects which is set.
 *
 * DELIVERY OPTIONS (configure one):
 *   A) FORMSPREE_ENDPOINT  — easiest. Create a form at formspree.io, paste its
 *      endpoint URL (e.g. https://formspree.io/f/xxxxxxx) as this env var.
 *   B) RESEND_API_KEY + PRIVACY_TO + PRIVACY_FROM — sends an email via Resend
 *      (resend.com). PRIVACY_FROM must be a verified domain sender.
 *
 * If NO delivery method is configured, the function still returns success to
 * the user BUT logs the request to the Cloudflare dashboard logs so nothing is
 * silently lost while you finish setup. Replace this with real delivery before
 * relying on it for compliance.
 *
 * NOTE: Honoring a privacy request is a legal obligation with deadlines that
 * vary by state. Delivering the request to an inbox is step one; you must also
 * actually fulfill it (opt-out/delete/etc.) within the required timeframe.
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // Basic CORS / same-origin acceptance
  const headers = { "Content-Type": "application/json" };

  let data;
  try {
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      data = await request.json();
    } else {
      const form = await request.formData();
      data = Object.fromEntries(form.entries());
    }
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "Could not parse request." }), { status: 400, headers });
  }

  // Minimal validation
  const fullname = (data.fullname || "").toString().trim();
  const email = (data.email || "").toString().trim();
  const state = (data.state || "").toString().trim();
  const requestType = (data.request || "").toString().trim();
  const details = (data.details || "").toString().trim();

  if (!fullname || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return new Response(JSON.stringify({ ok: false, error: "Please provide a valid name and email." }), { status: 422, headers });
  }

  // Honeypot (optional): if a hidden "company" field is filled, treat as spam.
  if ((data.company || "").toString().trim() !== "") {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  const received = new Date().toISOString();
  const payload = {
    received,
    type: "privacy_request",
    fullname,
    email,
    state,
    request_type: requestType,
    details,
    ip: request.headers.get("cf-connecting-ip") || "",
    user_agent: request.headers.get("user-agent") || "",
  };

  try {
    // ---- Option A: Formspree ----
    if (env.FORMSPREE_ENDPOINT) {
      const r = await fetch(env.FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Formspree returned " + r.status);
    }
    // ---- Option B: Resend email ----
    else if (env.RESEND_API_KEY && env.PRIVACY_TO && env.PRIVACY_FROM) {
      const subject = `Privacy Request (${requestType || "Do Not Sell"}) — ${fullname}`;
      const body =
        `A privacy request was submitted on homeprojournal.com\n\n` +
        `Received: ${received}\n` +
        `Name: ${fullname}\n` +
        `Email: ${email}\n` +
        `State: ${state}\n` +
        `Request type: ${requestType}\n` +
        `Details: ${details}\n` +
        `IP: ${payload.ip}\n`;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.PRIVACY_FROM,
          to: [env.PRIVACY_TO],
          subject,
          text: body,
        }),
      });
      if (!r.ok) throw new Error("Resend returned " + r.status);
    }
    // ---- No delivery configured: log so nothing is lost during setup ----
    else {
      console.log("PRIVACY_REQUEST_UNDELIVERED", JSON.stringify(payload));
    }
  } catch (err) {
    // Log the failure but still acknowledge to the user; you can recover from logs.
    console.log("PRIVACY_REQUEST_DELIVERY_ERROR", String(err), JSON.stringify(payload));
    return new Response(JSON.stringify({ ok: false, error: "We received your request but had trouble routing it. Please also email privacy@homeprojournal.com." }), { status: 200, headers });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

// Optional: reject non-POST methods cleanly
export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  return onRequestPost(context);
}
