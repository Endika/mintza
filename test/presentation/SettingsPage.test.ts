import { describe, expect, it } from 'vitest';
import { FakeConfigRepo } from '../fakes/FakeConfigRepo';
import type { ValidateApiKeyInput } from '../../src/application/use-cases/ValidateApiKeyUseCase';
import type { ValidationOutcome } from '../../src/domain/meeting/ports/ApiKeyValidator';
import { DEFAULT_CONFIG, type AppConfig } from '../../src/domain/meeting/ports/ConfigRepository';
import { Template } from '../../src/domain/meeting/value-objects/Template';
import { SettingsPage } from '../../src/presentation/pages/SettingsPage';
import { ConfigStore } from '../../src/presentation/state/ConfigStore';
import type { AppError } from '../../src/shared/errors/AppError';
import { ok, type Result } from '../../src/shared/result/Result';

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
  readonly repo?: FakeConfigRepo;
}

const seeded = (extra: Partial<AppConfig> = {}): FakeConfigRepo =>
  new FakeConfigRepo({
    ...DEFAULT_CONFIG,
    language: 'en',
    apiKeys: { openai: 'sk-test' },
    ...extra,
  });

const settle = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

const choose = (root: HTMLElement, selector: string, value: string): void => {
  const el = root.querySelector<HTMLSelectElement | HTMLInputElement>(selector)!;
  if (el instanceof HTMLInputElement) el.checked = true;
  else el.value = value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
};

const save = async (root: HTMLElement): Promise<void> => {
  root
    .querySelector<HTMLFormElement>('#settings-form')!
    .dispatchEvent(new Event('submit', { cancelable: true }));
  await settle();
};

const buildSettingsPage = async (options: Options = {}): Promise<SettingsPage> => {
  const config = new ConfigStore(options.repo ?? seeded());
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

  it('lets a never-picked spoken language keep following the interface language', async () => {
    const repo = seeded();
    const page = await buildSettingsPage({ repo });
    const root = document.createElement('main');
    document.body.appendChild(root);
    await page.render(root);
    choose(root, 'select[name="language"]', 'es');
    await save(root);
    expect(repo.saved?.language).toBe('es');
    expect(repo.saved && 'spokenLanguage' in repo.saved).toBe(false);
    root.remove();
  });

  it('stores a spoken language picked apart from the interface language', async () => {
    const repo = seeded();
    const page = await buildSettingsPage({ repo });
    const root = document.createElement('main');
    document.body.appendChild(root);
    await page.render(root);
    choose(root, 'select[name="spokenLanguage"]', 'eu');
    await save(root);
    expect(repo.saved?.spokenLanguage).toBe('eu');
    root.remove();
  });

  it('keeps a spoken language that was already stored', async () => {
    const repo = seeded({ spokenLanguage: 'en' });
    const page = await buildSettingsPage({ repo });
    const root = document.createElement('main');
    document.body.appendChild(root);
    await page.render(root);
    choose(root, 'input[name="summaryQuality"][value="premium"]', 'premium');
    await save(root);
    expect(repo.saved?.summaryQuality).toBe('premium');
    expect(repo.saved?.spokenLanguage).toBe('en');
    root.remove();
  });

  it('keeps Clear keys disabled while other edits are unsaved', async () => {
    const page = await buildSettingsPage();
    const root = document.createElement('main');
    await page.render(root);
    const clear = root.querySelector<HTMLButtonElement>('[data-action="clear-keys"]')!;
    expect(clear.disabled).toBe(false);
    choose(root, 'input[name="summaryQuality"][value="premium"]', 'premium');
    expect(clear.disabled).toBe(true);
  });
});
