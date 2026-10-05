import { AppError } from '../../shared/errors/AppError';

const isQuotaExceeded = (cause: unknown): boolean =>
  cause instanceof DOMException && cause.name === 'QuotaExceededError';

export const storageError = (message: string, cause: unknown): AppError =>
  new AppError(
    'STORAGE_FAILED',
    message,
    cause,
    [],
    isQuotaExceeded(cause) ? 'storage_full' : 'storage_unavailable',
  );
