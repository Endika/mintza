const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Phrases Whisper emits on silence/non-speech (subtitle credits, sign-offs, music tags).
const BLOCKLIST = [
  'amara org',
  'subtitulos realizados por la comunidad de amara org',
  'subtitulos por la comunidad de amara org',
  'subtitles by the amara org community',
  'gracias por ver el video',
  'gracias por ver',
  'thanks for watching',
  'musica',
  'music',
  'aplausos',
  'applause',
].map(normalize);

const matchesHallucination = (normalizedLine: string): boolean =>
  BLOCKLIST.some((b) =>
    b.includes(' ') ? normalizedLine === b || normalizedLine.includes(b) : normalizedLine === b,
  );

export class HallucinationFilter {
  clean(text: string): string {
    return text
      .split('\n')
      .filter((line) => {
        const n = normalize(line);
        if (n.length === 0) return false;
        return !matchesHallucination(n);
      })
      .join('\n')
      .trim();
  }
}
