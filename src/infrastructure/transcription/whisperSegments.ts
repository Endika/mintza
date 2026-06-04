export interface WhisperSegment {
  readonly text: string;
  readonly no_speech_prob?: number;
  readonly avg_logprob?: number;
}

const NO_SPEECH_PROB_MAX = 0.6;
const AVG_LOGPROB_MIN = -1.0;

const isLikelyNonSpeech = (s: WhisperSegment): boolean =>
  (s.no_speech_prob ?? 0) > NO_SPEECH_PROB_MAX && (s.avg_logprob ?? 0) < AVG_LOGPROB_MIN;

export const textFromWhisperSegments = (
  segments: readonly WhisperSegment[] | undefined,
  fallbackText: string,
): string => {
  if (!segments || segments.length === 0) return fallbackText;
  return segments
    .filter((s) => !isLikelyNonSpeech(s))
    .map((s) => s.text.trim())
    .filter((t) => t.length > 0)
    .join(' ')
    .trim();
};
