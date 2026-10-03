import { describe, expect, it } from 'vitest';
import type { ValidateApiKeyInput } from '../../src/application/use-cases/ValidateApiKeyUseCase';
import type { ValidationOutcome } from '../../src/domain/meeting/ports/ApiKeyValidator';
import {
  DEFAULT_CONFIG,
  type AppConfig,
  type ConfigRepository,
} from '../../src/domain/meeting/ports/ConfigRepository';
import { Template } from '../../src/domain/meeting/value-objects/Template';
import { SettingsPage } from '../../src/presentation/pages/SettingsPage';
import { ConfigStore } from '../../src/presentation/state/ConfigStore';
import type { AppError } from '../../src/shared/errors/AppError';
import { ok, type Result } from '../../src/shared/result/Result';

class FakeConfigRepo implements ConfigRepository {
  constructor(private stored: AppConfig) {}
  load(): Promise<Result<AppConfig, AppError>> {
    return Promise.resolve(ok(this.stored));
  }
  save(config: AppConfig): Promise<Result<void, AppError>> {
    this.stored = config;
    return Promise.resolve(ok(undefined));
  }
  clear(): Promise<Result<void, AppError>> {
    return Promise.resolve(ok(undefined));
  }
}

class FakeValidator {
  readonly asked: ValidateApiKeyInput[] = [];
  execute(input: ValidateApiKeyInput): Promise<Result<ValidationOutcome, AppError>> {
    this.asked.push(input);
    return Promise.resolve(ok({ checks: [{ service: 'Whisper', ok: true }] }));
  }
}

const builtIns = {
  execute: (): Promise<Result<Template[], AppError>> =>
    Promise.resolve(ok([Template.generic(), Template.work(), Template.interview()])),
};

interface Options {
  readonly confirm?: (message: string) => boolean;
}

const buildSettingsPage = async (options: Options = {}): Promise<SettingsPage> => {
  const config = new ConfigStore(
    new FakeConfigRepo({ ...DEFAULT_CONFIG, language: 'en', apiKeys: { openai: 'sk-test' } }),
  );
  await config.hydrate();
  return new SettingsPage({
    config,
    validateApiKey: new FakeValidator(),
    listTemplates: builtIns,
    ...(options.confirm ? { confirm: options.confirm } : {}),
  });
};

describe('SettingsPage', () => {
  it('labels each key field by its provider only and keeps Test outside the label', async () => {
    const page = await buildSettingsPage();
    const root = document.createElement('main');
    await page.render(root);
    const input = root.querySelector<HTMLInputElement>('input[name="openai"]')!;
    expect(input.labels?.[0]?.textContent?.trim()).toBe('OpenAI');
    expect(input.labels?.[0]?.querySelector('button')).toBeNull();
  });

  it('asks before clearing the keys', async () => {
    const asked: string[] = [];
    const page = await buildSettingsPage({
      confirm: (m) => {
        asked.push(m);
        return false;
      },
    });
    const root = document.createElement('main');
    await page.render(root);
    root.querySelector<HTMLButtonElement>('[data-action="clear-keys"]')!.click();
    expect(asked).toHaveLength(1);
    expect(root.querySelector<HTMLInputElement>('input[name="openai"]')!.value).toBe('sk-test');
  });

  it('offers interface and spoken language as two separate choices', async () => {
    const page = await buildSettingsPage();
    const root = document.createElement('main');
    await page.render(root);
    expect(root.querySelector('select[name="language"]')).not.toBeNull();
    expect(root.querySelector('select[name="spokenLanguage"]')).not.toBeNull();
  });

  it('asks before leaving with unsaved changes, and only then', async () => {
    const asked: string[] = [];
    const page = await buildSettingsPage({
      confirm: (m) => {
        asked.push(m);
        return false;
      },
    });
    const root = document.createElement('main');
    await page.render(root);
    expect(page.canLeave()).toBe(true);

    const input = root.querySelector<HTMLInputElement>('input[name="openai"]')!;
    input.value = 'sk-other';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(page.canLeave()).toBe(false);
    expect(asked).toHaveLength(1);
  });
});
