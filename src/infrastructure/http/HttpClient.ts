import { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';
import { httpFailureReason } from './httpFailureReason';

export interface HttpRequest {
  readonly url: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly headers?: Record<string, string>;
  readonly body?: BodyInit | null;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
}

export interface HttpResponse {
  readonly status: number;
  readonly headers: Headers;
  readonly text: () => Promise<string>;
  readonly json: <T>() => Promise<T>;
  readonly blob: () => Promise<Blob>;
}

/** Carried as the AppError cause when the server answered with an error status. */
export interface HttpFailure {
  readonly status: number;
  readonly body: string;
}

export const httpFailureOf = (error: AppError): HttpFailure | undefined => {
  const cause = error.cause;
  if (typeof cause !== 'object' || cause === null) return undefined;
  const { status, body } = cause as Partial<HttpFailure>;
  return typeof status === 'number' && typeof body === 'string' ? { status, body } : undefined;
};

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;

export class HttpClient {
  async send(request: HttpRequest): Promise<Result<HttpResponse, AppError>> {
    const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = request.maxRetries ?? DEFAULT_MAX_RETRIES;
    let lastError: AppError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const init: RequestInit = {
          method: request.method,
          signal: controller.signal,
        };
        if (request.headers) init.headers = request.headers;
        if (request.body !== undefined && request.body !== null) init.body = request.body;
        const response = await fetch(request.url, init);
        clearTimeout(timeout);

        if (response.status >= 500 && attempt < maxRetries) {
          lastError = new AppError(
            'NETWORK_ERROR',
            `Server ${response.status} on attempt ${attempt + 1}`,
            undefined,
            [],
            'unknown',
          );
          await wait(backoffMs(attempt));
          continue;
        }

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          const failure: HttpFailure = { status: response.status, body };
          const reason = httpFailureReason(failure);
          if (response.status === 401 || response.status === 403) {
            return err(
              new AppError(
                'API_KEY_INVALID',
                'Invalid or unauthorized API key',
                failure,
                [],
                reason,
              ),
            );
          }
          return err(
            new AppError(
              'NETWORK_ERROR',
              `HTTP ${response.status}: ${body.slice(0, 200)}`,
              failure,
              [],
              reason,
            ),
          );
        }

        return ok(toHttpResponse(response));
      } catch (cause) {
        clearTimeout(timeout);
        const isAbort = cause instanceof DOMException && cause.name === 'AbortError';
        lastError = new AppError(
          'NETWORK_ERROR',
          isAbort ? `Timeout after ${timeoutMs}ms` : 'Network error',
          cause,
          [],
          'network',
        );
        if (attempt < maxRetries) await wait(backoffMs(attempt));
      }
    }
    return err(
      lastError ?? new AppError('NETWORK_ERROR', 'Unknown failure', undefined, [], 'unknown'),
    );
  }
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const backoffMs = (attempt: number): number => Math.min(2 ** attempt * 500, 5_000);

const toHttpResponse = (response: Response): HttpResponse => ({
  status: response.status,
  headers: response.headers,
  text: () => response.text(),
  json: <T>() => response.json() as Promise<T>,
  blob: () => response.blob(),
});
