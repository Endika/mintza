import type { Meeting } from '../../meeting/entities/Meeting';
import type { TranscriptionProviderName } from '../../transcription/value-objects/TranscriptionProvider';
import type { KeywordFrequency, Statistics } from '../value-objects/Statistics';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'so', 'to', 'of', 'in', 'on', 'for', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'i', 'you', 'he', 'she', 'it',
  'we', 'they', 'this', 'that', 'these', 'those', 'as', 'at', 'by', 'from', 'have',
  'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can',
  'may', 'might', 'must', 'not', 'no', 'yes', 'if', 'then', 'than', 'into',
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'pero',
  'que', 'de', 'del', 'al', 'en', 'con', 'por', 'para', 'es', 'son', 'fue',
  'fueron', 'sea', 'sido', 'haber', 'soy', 'eres', 'somos', 'sois', 'me', 'te',
  'se', 'le', 'lo', 'nos', 'os', 'su', 'sus', 'mi', 'tu', 'esto', 'eso',
  'esta', 'este', 'estos', 'estas', 'aqui', 'alli',
]);

export class StatisticsCalculator {
  calculate(meeting: Meeting): Statistics {
    const text = meeting.fullText().value;
    const durationMs = meeting.durationMs;
    const wordCount = meeting.fullText().wordCount();
    const wordsPerMinute = durationMs > 0 ? (wordCount * 60_000) / durationMs : 0;
    return {
      durationMs,
      wordCount,
      wordsPerMinute: Math.round(wordsPerMinute * 10) / 10,
      topKeywords: this.topKeywords(text, 5),
      providersUsed: this.providersUsed(meeting),
    };
  }

  private topKeywords(text: string, limit: number): readonly KeywordFrequency[] {
    const counts = new Map<string, number>();
    const tokens = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .split(/[^a-z0-9]+/);
    for (const token of tokens) {
      if (token.length < 4) continue;
      if (STOPWORDS.has(token)) continue;
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private providersUsed(meeting: Meeting): readonly TranscriptionProviderName[] {
    const set = new Set<TranscriptionProviderName>();
    for (const segment of meeting.segments) set.add(segment.provider);
    return [...set];
  }
}
