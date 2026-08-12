import { isIP } from 'net';
import dns from 'dns/promises';

const BLOCKED_RANGES = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '::1/128',
  'fc00::/7'
];

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  if (!isIP(ip)) return false;
  
  // Quick direct checks for local/private IPs
  if (ip === '127.0.0.1' || ip === 'localhost' || ip === '0.0.0.0') return true;
  
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;

  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 127.0.0.0/8
  if (parts[0] === 127) return true;
  // 169.254.0.0/16 (Link local / cloud metadata)
  if (parts[0] === 169 && parts[1] === 254) return true;

  return false;
}

export function isPrivateOrLinkLocal(ip: string): boolean {
  if (ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
    return true;
  }
  return isPrivateIPv4(ip);
}

export async function validateTargetUrl(rawUrl: string): Promise<{ ok: boolean; reason?: string }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'Malformed URL provided' };
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return { ok: false, reason: 'Only http: and https: protocols are permitted' };
  }

  // If hostname is directly an IP, validate it
  if (isIP(url.hostname)) {
    if (isPrivateOrLinkLocal(url.hostname)) {
      return { ok: false, reason: `Target IP is in a private or link-local range (${url.hostname})` };
    }
    return { ok: true };
  }

  // Block obvious localhost strings
  if (url.hostname.toLowerCase() === 'localhost' || url.hostname.endsWith('.local')) {
    return { ok: false, reason: 'Localhost and internal domain targets are blocked for security' };
  }

  // Perform active DNS resolution before queuing to defeat DNS rebinding attacks
  try {
    const addresses = await dns.resolve(url.hostname);
    if (!addresses || addresses.length === 0) {
      return { ok: false, reason: `Unable to resolve host ${url.hostname}` };
    }

    for (const addr of addresses) {
      if (isPrivateOrLinkLocal(addr)) {
        return { ok: false, reason: `Target domain resolves to a private or non-routable address (${addr})` };
      }
    }
  } catch (err: any) {
    return { ok: false, reason: `DNS resolution failed for ${url.hostname}: ${err?.message || 'Host not found'}` };
  }

  return { ok: true };
}
