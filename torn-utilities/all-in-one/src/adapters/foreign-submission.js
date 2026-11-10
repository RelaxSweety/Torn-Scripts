// Prepared client integration; enabled only by the builder's unpublished preview flag.
export function authorizeForeignSubmission(url, options = {}, { authorized, token } = {}) {
  const target = new URL(String(url), 'https://www.torn.com');
  if (target.origin !== 'https://tu-multiplayer-server-dev.tuserver.workers.dev' ||
      !/^\/api\/foreign\/(observations|feedback)$/.test(target.pathname)) return options;
  if (!authorized || !token) throw Error('TU authentication required; reopen TU to verify your session');
  const headers = typeof Headers !== 'undefined' && options.headers instanceof Headers
    ? Object.fromEntries(options.headers.entries())
    : Array.isArray(options.headers) ? Object.fromEntries(options.headers) : { ...options.headers };
  for (const name of Object.keys(headers)) if (name.toLowerCase() === 'authorization') delete headers[name];
  headers.Authorization = 'Bearer ' + token;
  return { ...options, headers };
}
