/**
 * API configuration helpers
 */

const DEFAULT_BROWSER_PORT = '8000';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const ensureAbsoluteUrl = (value: string) =>
  value.includes('://') ? value : `http://${value}`;

const resolveFromEnv = (): string | undefined => {
  const raw = process.env.REACT_APP_API_URL?.trim();
  if (!raw) {
    return undefined;
  }

  const trimmed = trimTrailingSlash(raw);

  // Allow relative paths (e.g. "/api-proxy")
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  try {
    const parsed = new URL(ensureAbsoluteUrl(trimmed));

    if (typeof window !== 'undefined') {
      const browserHost = window.location.hostname;

      // Docker default uses http://backend:8000 which is not resolvable in the browser.
      if (browserHost && parsed.hostname === 'backend' && browserHost !== 'backend') {
        const portSegment = parsed.port ? `:${parsed.port}` : `:${DEFAULT_BROWSER_PORT}`;
        const pathname = trimTrailingSlash(parsed.pathname);
        return `${parsed.protocol}//${browserHost}${portSegment}${pathname}`;
      }
    }

    const pathname = trimTrailingSlash(parsed.pathname);
    return `${parsed.protocol}//${parsed.host}${pathname}`;
  } catch (error) {
    console.warn('Failed to parse REACT_APP_API_URL, falling back to raw value:', error);
    return trimmed;
  }
};

const resolveDefaultBase = (): string => `http://localhost:${DEFAULT_BROWSER_PORT}`;

export const API_BASE_URL = trimTrailingSlash(resolveFromEnv() || resolveDefaultBase());

const withLeadingSlash = (value: string) => (value.startsWith('/') ? value : `/${value}`);

export const buildApiUrl = (endpoint: string): string => {
  const normalizedEndpoint = withLeadingSlash(endpoint);
  if (!API_BASE_URL) {
    return normalizedEndpoint;
  }

  return `${API_BASE_URL}${normalizedEndpoint}`;
};

export const API_ENDPOINTS = {
  CHAT: '/api/llm/chat',
  CHAT_STREAM: '/api/llm/chat/stream',
  ANALYZE_IMAGE: '/api/llm/analyze-image',
  GENERATE_TOC: '/api/llm/generate-toc',
  HEALTH: '/api/llm/health',
  PROVIDERS: '/api/llm/providers'
} as const;
