export type AppErrorCode =
  | 'MIC_PERMISSION_DENIED'
  | 'MIC_NOT_AVAILABLE'
  | 'RECORDING_NOT_SUPPORTED'
  | 'TRANSCRIPTION_FAILED'
  | 'SUMMARIZATION_FAILED'
  | 'STORAGE_FAILED'
  | 'CONFIG_INVALID'
  | 'API_KEY_INVALID'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface ProviderAttempt {
  readonly provider: string;
  readonly code: AppErrorCode;
  readonly message: string;
}

export class AppError extends Error {
  public readonly attempts: readonly ProviderAttempt[];

  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly cause?: unknown,
    attempts: readonly ProviderAttempt[] = [],
  ) {
    super(message);
    this.name = 'AppError';
    this.attempts = attempts;
  }
}
