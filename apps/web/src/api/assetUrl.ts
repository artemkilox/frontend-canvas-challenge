import { getApiBaseUrl } from './config';

export function assetUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const origin = getApiBaseUrl();
  return path.startsWith('/') ? `${origin}${path}` : `${origin}/${path}`;
}
