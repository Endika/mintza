import type { ErrorReason } from '../../shared/errors/AppError';
import type { HttpFailure } from './HttpClient';

/** Google explains a rejected key in the body; other providers only by status. */
export const httpFailureReason = ({ status, body }: HttpFailure): ErrorReason => {
  const markers = googleErrorMarkers(body);
  if (markers.has('API_KEY_SERVICE_BLOCKED')) return 'api_blocked';
  if (markers.has('SERVICE_DISABLED') || markers.has('accessNotConfigured')) return 'api_disabled';
  if (markers.has('API_KEY_INVALID') || markers.has('UNAUTHENTICATED') || status === 401) {
    return 'invalid_key';
  }
  return 'unknown';
};

interface GoogleErrorBody {
  readonly error?: {
    readonly status?: unknown;
    readonly details?: unknown;
    readonly errors?: unknown;
  };
}

/** The reasons and status Google puts in an error body, e.g. API_KEY_SERVICE_BLOCKED. */
const googleErrorMarkers = (body: string): ReadonlySet<string> => {
  let parsed: GoogleErrorBody | null;
  try {
    parsed = JSON.parse(body) as GoogleErrorBody | null;
  } catch {
    return new Set();
  }
  const error = parsed?.error;
  const entries: unknown[] = [
    error?.status,
    ...reasonsOf(error?.details),
    ...reasonsOf(error?.errors),
  ];
  return new Set(entries.filter((e): e is string => typeof e === 'string'));
};

const reasonsOf = (list: unknown): unknown[] =>
  Array.isArray(list)
    ? list.map((item: unknown) => (item as { readonly reason?: unknown } | null)?.reason)
    : [];
