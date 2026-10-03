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

/** Why a provider call failed, in terms the interface can translate; `message` stays for diagnostics. */
export type ErrorReason =
  | 'missing_key'
  | 'missing_region'
  | 'invalid_key'
  | 'api_blocked'
  | 'api_disabled'
  | 'key_restricted'
  | 'billing_disabled'
  | 'network'
  | 'no_speech'
  | 'bad_response'
  | 'unknown';

export interface ProviderAttempt {
  readonly provider: string;
  readonly code: AppErrorCode;
  readonly message: string;
  readonly reason?: ErrorReason;
}

export class AppError extends Error {
  public readonly attempts: readonly ProviderAttempt[];

  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly cause?: unknown,
    attempts: readonly ProviderAttempt[] = [],
    public readonly reason?: ErrorReason,
  ) {
    super(message);
    this.name = 'AppError';
    this.attempts = attempts;
  }
}
