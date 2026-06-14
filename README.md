# Home Pro Journal — Deployment Notes

Static site for Cloudflare Pages, with one serverless function for the
Do Not Sell / privacy-request form.

## Structure
```
/                                   → homepage (index.html)
/9-overlooked-homeowner-savings-programs/  → the advertorial listicle (+ hero_web.jpg)
/privacy/    /terms/    /do-not-sell/    /contact/   → site pages
/styles.css                         → shared styles (listicle is self-contained)
/functions/api/privacy-request.js   → Cloudflare Pages Function (form handler)
```

## Deploy
1. Push this folder to a Git repo connected to Cloudflare Pages, OR drag-and-drop
   the folder in the Cloudflare Pages dashboard.
2. No build command needed — it's static. Build output directory = project root.
3. Cloudflare automatically picks up `/functions` as Pages Functions.

## Privacy form delivery (REQUIRED before collecting real requests)
The form at `/do-not-sell/` POSTs to `/api/privacy-request`. Pick ONE delivery
method and set the env var(s) in Cloudflare Pages → Settings → Environment variables:

**Option A — Formspree (easiest, no email setup)**
- `FORMSPREE_ENDPOINT` = your Formspree form URL (e.g. https://formspree.io/f/xxxxxxx)

**Option B — Resend (email to your inbox)**
- `RESEND_API_KEY` = your Resend API key
- `PRIVACY_TO` = where requests should be emailed (e.g. privacy@homeprojournal.com)
- `PRIVACY_FROM` = a verified sender on your domain (e.g. noreply@homeprojournal.com)

If neither is set, requests are written to the Pages function logs (Cloudflare
dashboard → your project → Functions → logs) so nothing is silently lost during
setup — but configure real delivery before launch.

## Still required before launch (legal / decisions — not code)
- Privacy Policy: complete the "sell/share" disclosure and other-state language. [legal review]
- Terms: decide on arbitration/class-action clause. [legal review]
- Have privacy + terms reviewed by counsel (debt/HELOC offers + senior PII).
- Listicle: replace the 9 `/cf/click/N` links if your ClickFlare routing differs,
  and confirm per-offer postbacks fire correctly (fire one test conversion each).
- Match the debt slot (No. 8) copy to your approved offer's required disclosures.

## Notes
- Fonts: Lora (Google Fonts) with Georgia fallback.
- Hero image is compressed (~325KB). Replace `hero_web.jpg` if you swap the photo.
- The listicle headline reads `?region={state}` (appended by ClickFlare) and
  falls back to "in Your State" if geo doesn't resolve.
- Exit-intent email capture is intentionally NOT included — add it after the
  front-end funnel proves out (breakeven/green) and the email backend exists.
