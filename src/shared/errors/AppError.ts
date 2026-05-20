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

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
