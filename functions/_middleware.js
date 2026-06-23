export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // Skip static assets — only process HTML page requests
  if (/\.(jpg|jpeg|png|gif|ico|css|js|woff2?|svg|txt|json|webp)$/i.test(url.pathname)) {
    return next();
  }

  // Skip if geo params are already in the URL (manual override or repeat visit)
  if (url.searchParams.get('city') || url.searchParams.get('region')) {
    return next();
  }

  const city   = context.request.cf?.city   || '';
  const region = context.request.cf?.region || '';

  // Nothing to inject — pass through
  if (!city && !region) {
    return next();
  }

  if (city)   url.searchParams.set('city',   city);
  if (region) url.searchParams.set('region', region);

  return Response.redirect(url.toString(), 302);
}
