import type { UpdateConfigUseCase } from '../../application/use-cases/UpdateConfigUseCase';
import type { ApiKeys, AppConfig } from '../../domain/meeting/ports/ConfigRepository';
import type { ConfigStore } from '../state/ConfigStore';
import type { Page } from '../router/Router';

export interface SettingsPageDeps {
  readonly config: ConfigStore;
  readonly updateConfig: UpdateConfigUseCase;
}

export class SettingsPage implements Page {
  private root: HTMLElement | null = null;

  constructor(private readonly deps: SettingsPageDeps) {}

  render(root: HTMLElement): void {
    this.root = root;
    const cfg = this.deps.config.get();
    root.innerHTML = `
      <main class="mx-auto max-w-2xl px-6 py-12">
        <header class="mb-8 flex items-center justify-between">
          <h1 class="text-3xl font-bold tracking-tight">Settings</h1>
          <a href="#/" class="btn-ghost">← Back</a>
        </header>

        <form id="settings-form" class="space-y-6">
          <section class="card">
            <h2 class="mb-3 text-lg font-semibold">API keys</h2>
            <p class="mb-4 text-sm text-ink-400">
              Your keys are stored only in this browser's <code>localStorage</code>.
              They never leave your device (MINTZA has no server). If you share this browser
              with anyone else, they can read the keys. Use the button below to wipe them.
            </p>
            <div class="space-y-3">
              ${apiKeyInput('openai', 'OpenAI (Whisper + GPT)', cfg.apiKeys.openai, true)}
              ${apiKeyInput('google', 'Google Speech (optional)', cfg.apiKeys.google, false)}
              ${apiKeyInput('azure', 'Azure Speech (optional)', cfg.apiKeys.azure, false)}
              ${apiKeyInput('anthropic', 'Anthropic Claude (optional)', cfg.apiKeys.anthropic, false)}
            </div>
          </section>

          <section class="card">
            <h2 class="mb-3 text-lg font-semibold">Preferences</h2>
            <label class="block">
              <span class="text-sm font-medium">Interface language</span>
              <select name="language" class="mt-1 block w-full rounded-lg border border-ink-100 px-3 py-2">
                <option value="en" ${cfg.language === 'en' ? 'selected' : ''}>English</option>
                <option value="es" ${cfg.language === 'es' ? 'selected' : ''}>Spanish</option>
                <option value="eu" ${cfg.language === 'eu' ? 'selected' : ''}>Basque</option>
              </select>
            </label>
          </section>

          <div class="flex justify-between">
            <button type="button" id="btn-clear" class="btn-ghost text-red-600">Clear keys</button>
            <button type="submit" class="btn-primary">Save</button>
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
  }

  private async handleSave(form: HTMLFormElement): Promise<void> {
    const data = new FormData(form);
    const next: AppConfig = {
      ...this.deps.config.get(),
      language: (data.get('language') as 'es' | 'en' | 'eu') ?? 'en',
      apiKeys: buildApiKeys(data),
    };
    await this.deps.updateConfig.execute({ config: next });
    await this.deps.config.update(next);
    this.setStatus('Settings saved.');
  }

  private async handleClear(): Promise<void> {
    const cleared: AppConfig = { ...this.deps.config.get(), apiKeys: {} };
    await this.deps.updateConfig.execute({ config: cleared });
    await this.deps.config.update(cleared);
    this.qs<HTMLFormElement>('#settings-form').reset();
    this.setStatus('Keys cleared from this browser.');
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
): string => `
  <label class="block">
    <span class="text-sm font-medium">${label}${required ? ' *' : ''}</span>
    <input
      type="password"
      name="${name}"
      autocomplete="off"
      value="${value ? escapeAttr(value) : ''}"
      placeholder="${value ? '••••••••••' : 'sk-...'}"
      class="mt-1 block w-full rounded-lg border border-ink-100 px-3 py-2 font-mono text-sm"
    />
  </label>
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
