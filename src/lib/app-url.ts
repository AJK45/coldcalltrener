export function appUrl(path: '/auth/callback' | '/reset-password', origin = window.location.origin, base = import.meta.env.BASE_URL): string {
  return new URL(path.slice(1), new URL(base, origin)).href;
}
