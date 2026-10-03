import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildAppDeps } from '../../src/bootstrap/setup';
import { AudioChunk } from '../../src/domain/audio/value-objects/AudioChunk';
import { Language } from '../../src/domain/language/value-objects/Language';
import { DEFAULT_CONFIG, type ApiKeys } from '../../src/domain/meeting/ports/ConfigRepository';
import { Meeting } from '../../src/domain/meeting/entities/Meeting';
import { Template } from '../../src/domain/meeting/value-objects/Template';
import { CONFIG_STORAGE_KEY } from '../../src/shared/constants/storageKeys';

interface Sent {
  readonly host: string;
  readonly key: string | undefined;
}

const realFetch = globalThis.fetch;
let sent: Sent[] = [];

const answer = (url: string): unknown =>
  url.includes('speech.googleapis.com')
    ? { results: [{ alternatives: [{ transcript: 'kaixo denoi' }] }] }
    : { candidates: [{ content: { parts: [{ text: '- ok' }] } }] };

const stubFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = input instanceof Request ? input.url : String(input);
  const headers = new Headers(init?.headers);
  sent.push({ host: new URL(url).host, key: headers.get('x-goog-api-key') ?? undefined });
  return Promise.resolve(
    new Response(JSON.stringify(answer(url)), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
};

const depsWith = async (apiKeys: ApiKeys): Promise<ReturnType<typeof buildAppDeps>> => {
  window.localStorage.setItem(
    CONFIG_STORAGE_KEY,
    JSON.stringify({
      ...DEFAULT_CONFIG,
      transcriptionQuality: 'cheap',
      summaryQuality: 'cheap',
      apiKeys,
    }),
  );
  const deps = buildAppDeps();
  await deps.configStore.hydrate();
  return deps;
};

const meeting = (): Meeting =>
  Meeting.start({ template: Template.generic(), language: Language.of('en') });

const chunk = (): AudioChunk =>
  new AudioChunk({
    blob: new Blob(['audio'], { type: 'audio/webm' }),
    startMs: 0,
    endMs: 1000,
    mimeType: 'audio/webm',
    peakLevel: 0.5,
  });

const keySentTo = (host: string): string | undefined => sent.find((s) => s.host === host)?.key;

/** New AI Studio keys: `AQ.` and 53 characters, unlike the 39-character `AIza…` ones. */
const AQ_KEY = `AQ.${'Ab8RN6Lz_q-W'.repeat(5)}`.slice(0, 53);

describe('Google keys reach the right client', () => {
  beforeEach(() => {
    sent = [];
    window.localStorage.clear();
    globalThis.fetch = stubFetch;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('sends the Speech key to Speech and the Gemini key to Gemini', async () => {
    const deps = await depsWith({ google: 'AIza-gemini', googleSpeech: 'AIza-speech' });
    const m = meeting();
    const transcribed = await deps.transcribeChunk.execute({ meeting: m, chunk: chunk() });
    expect(transcribed.ok).toBe(true);
    await deps.generateSummaries.execute({ meeting: m, kinds: ['bullet_points'] });

    expect(keySentTo('speech.googleapis.com')).toBe('AIza-speech');
    expect(keySentTo('generativelanguage.googleapis.com')).toBe('AIza-gemini');
  });

  it('keeps a single legacy Google key working for Speech', async () => {
    const deps = await depsWith({ google: 'AIza-legacy' });
    const transcribed = await deps.transcribeChunk.execute({ meeting: meeting(), chunk: chunk() });
    expect(transcribed.ok).toBe(true);
    expect(keySentTo('speech.googleapis.com')).toBe('AIza-legacy');
  });

  it('transcribes with Speech when only the Speech key is set', async () => {
    const deps = await depsWith({ googleSpeech: 'AIza-speech' });
    const transcribed = await deps.transcribeChunk.execute({ meeting: meeting(), chunk: chunk() });
    expect(transcribed.ok).toBe(true);
    expect(keySentTo('speech.googleapis.com')).toBe('AIza-speech');
  });

  it('sends a 53-character AQ. Gemini key exactly as stored', async () => {
    expect(AQ_KEY).toHaveLength(53);
    const deps = await depsWith({ google: AQ_KEY });
    const m = meeting();
    await deps.transcribeChunk.execute({ meeting: m, chunk: chunk() });
    await deps.generateSummaries.execute({ meeting: m, kinds: ['bullet_points'] });
    expect(keySentTo('generativelanguage.googleapis.com')).toBe(AQ_KEY);
    expect(keySentTo('speech.googleapis.com')).toBe(AQ_KEY);
  });
});
