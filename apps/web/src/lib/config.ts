/**
 * Dynamic API Base URL resolver that automatically adapts to network IP (e.g. 192.168.1.112),
 * localhost, or custom domain name so mobile phones and network devices work seamlessly.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    const hostname = window.location.hostname;

    // If NEXT_PUBLIC_API_URL is set to a remote server/domain (not localhost), use it
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl;
    }

    // Dynamic resolution based on the client browser's current hostname/IP
    const protocol = window.location.protocol || 'http:';
    return `${protocol}//${hostname}:4000/api/v1`;
  }

  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
}

export function getWsBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${hostname}:4000`;
  }
  return 'http://localhost:4000';
}

