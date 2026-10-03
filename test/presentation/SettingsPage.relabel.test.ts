import { describe, expect, it } from 'vitest';
import { ListTemplatesUseCase } from '../../src/application/use-cases/ListTemplatesUseCase';
import { ValidateApiKeyUseCase } from '../../src/application/use-cases/ValidateApiKeyUseCase';
import type {
  ApiKeyValidator,
  ValidationOutcome,
} from '../../src/domain/meeting/ports/ApiKeyValidator';
import {
  DEFAULT_CONFIG,
  type AppConfig,
  type ConfigRepository,
} from '../../src/domain/meeting/ports/ConfigRepository';
import { TemplateRegistry } from '../../src/domain/meeting/services/TemplateRegistry';
import { LocalStorageTemplateRepository } from '../../src/infrastructure/persistence/LocalStorageTemplateRepository';
import type { Translator } from '../../src/presentation/i18n/Translator';
import { SettingsPage } from '../../src/presentation/pages/SettingsPage';
import { ConfigStore } from '../../src/presentation/state/ConfigStore';
import type { AppError } from '../../src/shared/errors/AppError';
import { ok, type Result } from '../../src/shared/result/Result';

class FakeConfigRepo implements ConfigRepository {
  load(): Promise<Result<AppConfig, AppError>> {
    return Promise.resolve(ok({ ...DEFAULT_CONFIG, language: 'en' }));
  }
  save(): Promise<Result<void, AppError>> {
    return Promise.resolve(ok(undefined));
  }
  clear(): Promise<Result<void, AppError>> {
    return Promise.resolve(ok(undefined));
  }
}

class AcceptingValidator implements ApiKeyValidator {
  validate(): Promise<Result<ValidationOutcome, AppError>> {
    return Promise.resolve(ok({ checks: [] }));
  }
}

class LabelRecordingShell {
  readonly labels: string[] = [];
  constructor(private readonly translator: Translator) {}
  relabel(): void {
    this.labels.push(this.translator.t('nav.record'));
  }
}

const settle = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('SettingsPage language change', () => {
  it('relabels the app shell in the newly saved language', async () => {
    const config = new ConfigStore(new FakeConfigRepo());
    await config.hydrate();
    const shell = new LabelRecordingShell(config.translator);
    const page = new SettingsPage({
      config,
      validateApiKey: new ValidateApiKeyUseCase(new AcceptingValidator()),
      listTemplates: new ListTemplatesUseCase(
        new TemplateRegistry(new LocalStorageTemplateRepository(window.localStorage)),
      ),
      shell,
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    await page.render(root);

    root.querySelector<HTMLSelectElement>('select[name="language"]')!.value = 'es';
    root
      .querySelector<HTMLFormElement>('#settings-form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();

    expect(shell.labels).toEqual(['Grabar']);
    root.remove();
  });
});
