const ENDPOINT = import.meta.env.VITE_GOATCOUNTER_URL ?? '';

const LOCAL_HOSTS = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/;

function enabled(): boolean {
  if (!ENDPOINT) return false;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return false;
  return !LOCAL_HOSTS.test(location.hostname);
}

export function analyticsUrl(endpoint: string, path: string, isEvent: boolean, random = Math.random()): string {
  const url = new URL(endpoint);
  url.searchParams.set('p', path);
  if (isEvent) url.searchParams.set('e', 'true');
  url.searchParams.set('rnd', random.toString(36).slice(2));
  return url.toString();
}

function send(path: string, isEvent: boolean): void {
  if (!enabled()) return;
  new Image().src = analyticsUrl(ENDPOINT, path, isEvent);
}

export function countVisit(): void {
  send(location.pathname, false);
}

export function countBatch(kind: 'pdf' | 'zip' | 'csv', invoices: number): void {
  send(`${kind}-${sizeBucket(invoices)}`, true);
}

export function sizeBucket(count: number): string {
  if (count <= 1) return '1';
  if (count <= 10) return '2-10';
  if (count <= 50) return '11-50';
  if (count <= 200) return '51-200';
  return '200+';
}
