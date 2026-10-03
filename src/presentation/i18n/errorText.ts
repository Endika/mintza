import type { ErrorReason, ProviderAttempt } from '../../shared/errors/AppError';
import type { TranslationKey } from './translations';

type Translate = (key: TranslationKey) => string;

const REASON_TEXT: Record<ErrorReason, TranslationKey> = {
  missing_key: 'error.missing_key',
  missing_region: 'error.missing_region',
  invalid_key: 'error.invalid_key',
  api_blocked: 'error.api_blocked',
  api_disabled: 'error.api_disabled',
  key_restricted: 'error.key_restricted',
  billing_disabled: 'error.billing_disabled',
  network: 'error.network',
  no_speech: 'error.no_speech',
  bad_response: 'error.bad_response',
  refused: 'error.refused',
  unknown: 'error.unknown',
};

export const reasonText = (reason: ErrorReason | undefined, t: Translate): string =>
  t(REASON_TEXT[reason ?? 'unknown']);

/** One translated line per provider that was tried; the English `message` is never shown. */
export const errorLines = (
  error: {
    readonly reason?: ErrorReason | undefined;
    readonly attempts: readonly ProviderAttempt[];
  },
  t: Translate,
): string[] =>
  error.attempts.length > 0
    ? error.attempts.map((a) => `${a.provider}: ${reasonText(a.reason, t)}`)
    : [reasonText(error.reason, t)];
