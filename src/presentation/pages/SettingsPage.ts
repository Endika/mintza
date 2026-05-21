import type { UpdateConfigUseCase } from '../../application/use-cases/UpdateConfigUseCase';
import type { ValidateApiKeyUseCase } from '../../application/use-cases/ValidateApiKeyUseCase';
import type { ApiKeyProviderName } from '../../domain/meeting/ports/ApiKeyValidator';
import type {
  ApiKeys,
  AppConfig,
  QualityProfile,
} from '../../domain/meeting/ports/ConfigRepository';
import type { TemplateKind } from '../../domain/meeting/value-objects/Template';
import type { ConfigStore } from '../state/ConfigStore';
import type { Page } from '../router/Router';

export interface SettingsPageDeps {
  readonly config: ConfigStore;
  readonly updateConfig: UpdateConfigUseCase;
  readonly validateApiKey: ValidateApiKeyUseCase;
}

export class SettingsPage implements Page {
  private root: HTMLElement | null = null;

  constructor(private readonly deps: SettingsPageDeps) {}

  render(root: HTMLElement): void {
    this.root = root;
    const cfg = this.deps.config.get();
    const tr = this.deps.config.translator;
    const t = (key: Parameters<typeof tr.t>[0]): string => tr.t(key);
    root.innerHTML = `
      <main class="mx-auto max-w-2xl px-6 py-12">
        <header class="mb-8 flex items-center justify-between">
          <h1 class="text-3xl font-bold tracking-tight">${t('settings.title')}</h1>
          <a href="#/" class="btn-ghost">${t('nav.back')}</a>
        </header>

        <form id="settings-form" class="space-y-6">
          <section class="card">
            <h2 class="mb-3 text-lg font-semibold">${t('settings.api_keys')}</h2>
            <p class="mb-4 text-sm text-ink-400">${t('settings.api_keys_warning')}</p>
            <div class="space-y-3">
              ${apiKeyInput('openai', 'OpenAI (Whisper + GPT)', cfg.apiKeys.openai, true, t('settings.btn_test'))}
              ${apiKeyInput('google', 'Google (Gemini + Speech)', cfg.apiKeys.google, false, t('settings.btn_test'))}
              ${apiKeyInput('anthropic', 'Anthropic Claude', cfg.apiKeys.anthropic, false, t('settings.btn_test'))}
              ${apiKeyInput('azure', 'Azure Speech', cfg.apiKeys.azure, false, t('settings.btn_test'))}
            </div>
          </section>

          <section class="card">
            <h2 class="mb-3 text-lg font-semibold">${t('settings.qualities')}</h2>
            ${qualityFieldset('summaryQuality', t('settings.summary_quality'), cfg.summaryQuality, [
              { value: 'cheap', label: t('settings.cheap'), hint: 'Gemini → Claude → GPT' },
              { value: 'balanced', label: t('settings.balanced'), hint: 'GPT-4o-mini → Claude → Gemini' },
              { value: 'premium', label: t('settings.premium'), hint: 'GPT-4o (no fallback)' },
            ])}
            ${qualityFieldset(
              'transcriptionQuality',
              t('settings.transcription_quality'),
              cfg.transcriptionQuality,
              [
                { value: 'cheap', label: t('settings.cheap'), hint: 'Google Speech → Whisper' },
                { value: 'balanced', label: t('settings.balanced'), hint: 'Whisper → Google Speech' },
                { value: 'premium', label: t('settings.premium'), hint: 'Whisper only' },
              ],
            )}
          </section>

          <section class="card">
            <h2 class="mb-3 text-lg font-semibold">${t('settings.preferences')}</h2>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label class="block">
                <span class="text-sm font-medium">${t('settings.interface_language')}</span>
                <select name="language" class="mt-1 block w-full rounded-lg border border-ink-100 px-3 py-2">
                  <option value="en" ${cfg.language === 'en' ? 'selected' : ''}>English</option>
                  <option value="es" ${cfg.language === 'es' ? 'selected' : ''}>Español</option>
                  <option value="eu" ${cfg.language === 'eu' ? 'selected' : ''}>Euskara</option>
                </select>
              </label>
              <label class="block">
                <span class="text-sm font-medium">${t('settings.default_template')}</span>
                <select name="defaultTemplate" class="mt-1 block w-full rounded-lg border border-ink-100 px-3 py-2">
                  <option value="generic" ${cfg.defaultTemplate === 'generic' ? 'selected' : ''}>${t('template.generic')}</option>
                  <option value="work" ${cfg.defaultTemplate === 'work' ? 'selected' : ''}>${t('template.work')}</option>
                  <option value="interview" ${cfg.defaultTemplate === 'interview' ? 'selected' : ''}>${t('template.interview')}</option>
                </select>
              </label>
            </div>
          </section>

          <div class="flex justify-between">
            <button type="button" id="btn-clear" class="btn-ghost text-red-600">${t('settings.btn_clear')}</button>
            <button type="submit" class="btn-primary">${t('settings.btn_save')}</button>
          </div>
          <p id="settings-status" class="text-sm text-ink-400"></p>
        </form>
      </main>
    `;
    this.bind();
  }

  private bind(): void {
    const form = this.qs<HTMLFormElement>('#settings-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.handleSave(form);
    });
    this.qs<HTMLButtonElement>('#btn-clear').addEventListener('click', () => {
      void this.handleClear();
    });
    if (!this.root) return;
    this.root.querySelectorAll<HTMLButtonElement>('[data-test-key]').forEach((btn) => {
      btn.addEventListener('click', () => void this.handleValidate(btn));
    });
  }

  private async handleValidate(btn: HTMLButtonElement): Promise<void> {
    const provider = btn.dataset['testKey'] as ApiKeyProviderName | undefined;
    if (!provider) return;
    if (!this.root) return;
    const input = this.root.querySelector<HTMLInputElement>(`input[name="${provider}"]`);
    if (!input) return;
    const indicator = this.root.querySelector<HTMLElement>(`[data-status="${provider}"]`);
    if (!indicator) return;
    const tr = this.deps.config.translator;
    indicator.textContent = tr.t('settings.testing');
    indicator.className = 'text-xs text-ink-400';
    btn.disabled = true;
    const result = await this.deps.validateApiKey.execute({ provider, key: input.value });
    btn.disabled = false;
    if (result.ok) {
      indicator.textContent = tr.t('settings.valid');
      indicator.className = 'text-xs text-primary';
    } else {
      indicator.textContent = `✗ ${result.error.message}`;
      indicator.className = 'text-xs text-red-600';
    }
  }

  private async handleSave(form: HTMLFormElement): Promise<void> {
    const data = new FormData(form);
    const next: AppConfig = {
      ...this.deps.config.get(),
      language: (data.get('language') as 'es' | 'en' | 'eu') ?? 'en',
      defaultTemplate: (data.get('defaultTemplate') as TemplateKind) ?? 'generic',
      summaryQuality: (data.get('summaryQuality') as QualityProfile) ?? 'balanced',
      transcriptionQuality: (data.get('transcriptionQuality') as QualityProfile) ?? 'balanced',
      apiKeys: buildApiKeys(data),
    };
    await this.deps.updateConfig.execute({ config: next });
    await this.deps.config.update(next);
    if (next.language !== this.deps.config.get().language) {
      this.render(this.root ?? document.createElement('div'));
    }
    this.setStatus(this.deps.config.translator.t('settings.saved'));
  }

  private async handleClear(): Promise<void> {
    const cleared: AppConfig = { ...this.deps.config.get(), apiKeys: {} };
    await this.deps.updateConfig.execute({ config: cleared });
    await this.deps.config.update(cleared);
    this.qs<HTMLFormElement>('#settings-form').reset();
    this.setStatus(this.deps.config.translator.t('settings.cleared'));
  }

  private setStatus(message: string): void {
    this.qs<HTMLElement>('#settings-status').textContent = message;
  }

  private qs<T extends HTMLElement>(selector: string): T {
    if (!this.root) throw new Error('SettingsPage not rendered yet');
    const el = this.root.querySelector<T>(selector);
    if (!el) throw new Error(`Missing element ${selector}`);
    return el;
  }
}

const apiKeyInput = (
  name: string,
  label: string,
  value: string | undefined,
  required: boolean,
  testLabel: string,
): string => `
  <div>
    <label class="block">
      <span class="text-sm font-medium">${label}${required ? ' *' : ''}</span>
      <div class="mt-1 flex gap-2">
        <input
          type="password"
          name="${name}"
          autocomplete="off"
          value="${value ? escapeAttr(value) : ''}"
          placeholder="${value ? '••••••••••' : 'sk-...'}"
          class="flex-1 rounded-lg border border-ink-100 px-3 py-2 font-mono text-sm"
        />
        <button type="button" data-test-key="${name}" class="btn-ghost text-sm">${testLabel}</button>
      </div>
    </label>
    <p data-status="${name}" class="mt-1 text-xs text-ink-400 min-h-[1rem]"></p>
  </div>
`;

const qualityFieldset = (
  name: 'summaryQuality' | 'transcriptionQuality',
  legend: string,
  current: QualityProfile,
  options: ReadonlyArray<{ value: QualityProfile; label: string; hint: string }>,
): string => `
  <fieldset class="mb-4">
    <legend class="block text-sm font-medium mb-2">${legend}</legend>
    <div class="space-y-2">
      ${options
        .map(
          (opt) => `
        <label class="flex items-start gap-2 cursor-pointer rounded-lg border border-ink-100 px-3 py-2 hover:bg-ink-50">
          <input type="radio" name="${name}" value="${opt.value}" class="mt-1" ${opt.value === current ? 'checked' : ''} />
          <span>
            <span class="block text-sm font-medium">${opt.label}</span>
            <span class="block text-xs text-ink-400">${opt.hint}</span>
          </span>
        </label>`,
        )
        .join('')}
    </div>
  </fieldset>
`;

const buildApiKeys = (data: FormData): ApiKeys => {
  const keys: ApiKeys = {};
  for (const name of ['openai', 'google', 'azure', 'anthropic'] as const) {
    const raw = data.get(name);
    if (typeof raw === 'string' && raw.trim().length > 0) {
      Object.defineProperty(keys, name, { value: raw.trim(), enumerable: true });
    }
  }
  return keys;
};

const escapeAttr = (raw: string): string => raw.replace(/"/g, '&quot;');
