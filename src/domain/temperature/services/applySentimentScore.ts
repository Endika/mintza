import type { Meeting } from '../../meeting/entities/Meeting';
import type { SentimentScoreParser } from './SentimentScoreParser';

/** Sets the meeting's temperature from its sentiment summary, when there is one with a score. */
export const applySentimentScore = (meeting: Meeting, parser: SentimentScoreParser): void => {
  const sentiment = meeting.summaries.get('sentiment');
  if (!sentiment) return;
  const score = parser.parse(sentiment.content);
  if (score) meeting.setTemperature(score);
};
