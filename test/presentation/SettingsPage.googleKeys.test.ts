import { describe, expect, it } from 'vitest';
import { FakeConfigRepo } from '../fakes/FakeConfigRepo';
import type { ValidateApiKeyInput } from '../../src/application/use-cases/ValidateApiKeyUseCase';
import type {
  ApiKeyProviderName,
  ServiceCheck,
  ValidationOutcome,
} from '../../src/domain/meeting/ports/ApiKeyValidator';
import {
  DEFAULT_CONFIG,
  type ApiKeys,
  type AppConfig,
} from '../../src/domain/meeting/ports/ConfigRepository';
import { Template } from '../../src/domain/meeting/value-objects/Template';
import { SettingsPage } from '../../src/presentation/pages/SettingsPage';
import { ConfigStore } from '../../src/presentation/state/ConfigStore';
import type { AppError } from '../../src/shared/errors/AppError';
import { ok, type Result } from '../../src/shared/result/Result';

class ScriptedValidator {
  readonly asked: ValidateApiKeyInput[] = [];
  constructor(private readonly checks: Partial<Record<ApiKeyProviderName, ServiceCheck>>) {}
  execute(input: ValidateApiKeyInput): Promise<Result<ValidationOutcome, AppError>> {
    this.asked.push(input);
    const check = this.checks[input.provider];
    return Promise.resolve(ok({ checks: check ? [check] : [] }));
  }
}

const builtIns = {
  execute: (): Promise<Result<Template[], AppError>> =>
    Promise.resolve(ok([Template.generic(), Template.work(), Template.interview()])),
};

const settle = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

interface Rendered {
  readonly root: HTMLElement;
  readonly repo: FakeConfigRepo;
  readonly validator: ScriptedValidator;
}

const render = async (
  options: {
    apiKeys?: ApiKeys;
    language?: AppConfig['language'];
    checks?: Partial<Record<ApiKeyProviderName, ServiceCheck>>;
    confirm?: (message: string) => boolean;
  } = {},
): Promise<Rendered> => {
  const repo = new FakeConfigRepo({
    ...DEFAULT_CONFIG,
    language: options.language ?? 'en',
    apiKeys: options.apiKeys ?? { openai: 'sk-test' },
  });
  const config = new ConfigStore(repo);
  await config.hydrate();
  const validator = new ScriptedValidator(options.checks ?? {});
  const page = new SettingsPage({
    config,
    validateApiKey: validator,
    listTemplates: builtIns,
    ...(options.confirm ? { confirm: options.confirm } : {}),
  });
  const root = document.createElement('main');
  await page.render(root);
  return { root, repo, validator };
};

const input = (root: HTMLElement, name: string): HTMLInputElement =>
  root.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;

const describedBy = (root: HTMLElement, name: string): string =>
  (input(root, name).getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => root.querySelector(`#${id}`)?.textContent?.trim() ?? '')
    .join(' | ');

const test = async (root: HTMLElement, provider: ApiKeyProviderName): Promise<void> => {
  root.querySelector<HTMLButtonElement>(`[data-test-key="${provider}"]`)!.click();
  await settle();
};

const result = (root: HTMLElement, provider: ApiKeyProviderName): HTMLElement =>
  root.querySelector<HTMLElement>(`[data-status="${provider}"]`)!;

describe('SettingsPage Google keys', () => {
  it('shows a Gemini field and a Speech field, each with its own Test and where to get it', async () => {
    const { root } = await render();
    expect(input(root, 'google').labels?.[0]?.textContent?.trim()).toBe('Google Gemini');
    expect(input(root, 'googleSpeech').labels?.[0]?.textContent?.trim()).toBe('Google Speech');
    expect(root.querySelector('[data-test-key="google"]')).not.toBeNull();
    expect(root.querySelector('[data-test-key="googleSpeech"]')).not.toBeNull();
    expect(describedBy(root, 'google')).toContain('Google AI Studio → Get API key');
    expect(describedBy(root, 'googleSpeech')).toContain(
      'Google Cloud → Credentials → API key with Cloud Speech-to-Text',
    );
  });

  it('tests each Google key on its own and keeps their results apart', async () => {
    const { root, validator } = await render({
      apiKeys: { openai: 'sk-test', google: 'AIza-gemini', googleSpeech: 'AIza-speech' },
      checks: {
        google: { service: 'Google Gemini', ok: true },
        googleSpeech: { service: 'Google Speech', ok: false },
      },
    });

    await test(root, 'googleSpeech');
    expect(validator.asked).toEqual([{ provider: 'googleSpeech', key: 'AIza-speech' }]);
    expect(result(root, 'googleSpeech').textContent).toContain("Google Speech didn't work");
    expect(result(root, 'google').textContent?.trim()).toBe('');

    await test(root, 'google');
    expect(validator.asked.at(-1)).toEqual({ provider: 'google', key: 'AIza-gemini' });
    expect(result(root, 'google').textContent).toContain('Google Gemini works');
    expect(result(root, 'googleSpeech').textContent).toContain("Google Speech didn't work");
  });

  it('counts an edited Speech key as an unsaved change and saves it', async () => {
    const { root, repo } = await render();
    const save = root.querySelector<HTMLButtonElement>('#btn-save')!;
    expect(save.disabled).toBe(true);
    const speech = input(root, 'googleSpeech');
    speech.value = ' AIza-speech ';
    speech.dispatchEvent(new Event('input', { bubbles: true }));
    expect(save.disabled).toBe(false);
    root
      .querySelector<HTMLFormElement>('#settings-form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
    expect(repo.saved?.apiKeys).toEqual({ openai: 'sk-test', googleSpeech: 'AIza-speech' });
  });

  it('opens the backups and lets Clear keys remove a lone Speech key', async () => {
    const { root, repo } = await render({
      apiKeys: { googleSpeech: 'AIza-speech' },
      confirm: () => true,
    });
    expect(root.querySelector('details')?.open).toBe(true);
    const clear = root.querySelector<HTMLButtonElement>('[data-action="clear-keys"]')!;
    expect(clear.disabled).toBe(false);
    clear.click();
    await settle();
    expect(repo.saved?.apiKeys).toEqual({});
  });

  it('saves a 53-character AQ. Gemini key as typed and tests it as-is', async () => {
    const aqKey = `AQ.${'Ab8RN6Lz_q-W'.repeat(5)}`.slice(0, 53);
    const { root, repo, validator } = await render();
    const gemini = input(root, 'google');
    gemini.value = aqKey;
    gemini.dispatchEvent(new Event('input', { bubbles: true }));
    await test(root, 'google');
    expect(validator.asked.at(-1)).toEqual({ provider: 'google', key: aqKey });
    root
      .querySelector<HTMLFormElement>('#settings-form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
    expect(repo.saved?.apiKeys.google).toBe(aqKey);
  });
});
