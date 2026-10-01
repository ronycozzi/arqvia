/**
 * True when a service worker registration scope belongs to this app's base
 * path on this origin. Used to clean up a worker the app may have left inside
 * its own prefix without touching registrations owned by the host site
 * (scope "/" or any other path).
 */
export function isServiceWorkerScopeInside(
  scope: string,
  origin: string,
  basePath: string,
) {
  if (!basePath) return false;

  try {
    const url = new URL(scope);
    return (
      url.origin === origin &&
      (url.pathname === basePath || url.pathname.startsWith(`${basePath}/`))
    );
  } catch {
    return false;
  }
}
