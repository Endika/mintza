import { TemperatureScore } from '../value-objects/TemperatureScore';

const SCORE_PATTERN = /Score:\s*(-?\d+(?:\.\d+)?)/i;

export class SentimentScoreParser {
  parse(content: string): TemperatureScore | null {
    const match = SCORE_PATTERN.exec(content);
    if (!match || match[1] === undefined) return null;
    const raw = Number(match[1]);
    if (!Number.isFinite(raw)) return null;
    return TemperatureScore.of(raw);
  }
}
