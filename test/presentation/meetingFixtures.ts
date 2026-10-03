import { Language } from '../../src/domain/language/value-objects/Language';
import { Meeting } from '../../src/domain/meeting/entities/Meeting';
import { Template } from '../../src/domain/meeting/value-objects/Template';
import { Summary } from '../../src/domain/summary/entities/Summary';
import type { SummaryKind } from '../../src/domain/summary/value-objects/SummaryKind';
import { TokenCount } from '../../src/domain/tokens/value-objects/TokenCount';

export const finishedMeeting = (params: {
  title: string;
  seconds: number;
  template?: Template;
  summaries?: Partial<Record<SummaryKind, string>>;
}): Meeting => {
  const startedAt = new Date('2026-09-30T10:00:00Z');
  const meeting = Meeting.start({
    template: params.template ?? Template.work(),
    language: Language.of('en'),
    title: params.title,
    now: startedAt,
  });
  for (const [kind, content] of Object.entries(params.summaries ?? {})) {
    meeting.setSummary(
      new Summary({
        kind: kind as SummaryKind,
        content,
        tokensIn: TokenCount.of(10),
        tokensOut: TokenCount.of(5),
        provider: 'openai',
        generatedAt: startedAt,
      }),
    );
  }
  meeting.finish(new Date(startedAt.getTime() + params.seconds * 1000));
  return meeting;
};

export const settle = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};
