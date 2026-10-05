import type { ListTemplatesUseCase } from '../../application/use-cases/ListTemplatesUseCase';
import type { ValidateApiKeyUseCase } from '../../application/use-cases/ValidateApiKeyUseCase';
import type { LanguageCode } from '../../domain/language/value-objects/Language';
import type {
  ApiKeyProviderName,
  CheckFailureReason,
} from '../../domain/meeting/ports/ApiKeyValidator';
import type {
  ApiKeys,
  AppConfig,
  QualityProfile,
} from '../../domain/meeting/ports/ConfigRepository';
import { Template, type TemplateKind } from '../../domain/meeting/value-objects/Template';
import type { AppShell } from '../components/AppShell';
import {
  ICON_ALERT,
  ICON_CHECK,
  ICON_CHEVRON,
  ICON_EXTERNAL,
  ICON_TRASH,
} from '../components/icons';
import { errorText, reasonText } from '../i18n/errorText';
import { LANGUAGE_NAMES } from '../i18n/languageName';
import { templateDisplayName } from '../i18n/templateDisplayName';
import type { TranslationKey } from '../i18n/translations';
import { LeaveGuard, type Confirm } from '../lifecycle/LeaveGuard';
import { titleFromHeading, type Page } from '../router/Router';
import type { ConfigStore } from '../state/ConfigStore';
import { escapeHtml } from '../util/escapeHtml';

export interface SettingsPageDeps {
  readonly config: ConfigStore;
  readonly validateApiKey: Pick<ValidateApiKeyUseCase, 'execute'>;
  readonly listTemplates: Pick<ListTemplatesUseCase, 'execute'>;
  readonly shell?: Pick<AppShell, 'relabel'>;
  readonly confirm?: Confirm;
}

type T = (key: TranslationKey, vars?: Record<string, string | number>) => string;

const LICENCE_URL = 'https://github.com/Endika/mintza/blob/main/LICENSE';
const OPENAI_KEYS_URL = 'https://platform.openai.com/api-keys';
const KEY_FIELDS = ['openai', 'google', 'googleSpeech', 'azure', 'anthropic'] as const;
const GOOGLE_CREDENTIALS_URL = 'https://console.cloud.google.com/apis/credentials';
const GOOGLE_BILLING_URL = 'https://console.cloud.google.com/billing';
const GOOGLE_API_LIBRARY_URL: Partial<Record<ApiKeyProviderName, string>> = {
  google: 'https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com',
  googleSpeech: 'https://console.cloud.google.com/apis/library/speech.googleapis.com',
};

export class SettingsPage implements Page {
  private root: HTMLElement | null = null;
  private baseline: AppConfig | null = null;
  private initialSpoken: LanguageCode = 'en';
  private readonly guard = new LeaveGuard();
  private readonly confirm: Confirm;

  constructor(private readonly deps: SettingsPageDeps) {
    this.confirm = deps.confirm ?? ((m) => window.confirm(m));
  }

  async render(root: HTMLElement): Promise<void> {
    this.root = root;
    const cfg = this.deps.config.get();
    this.initialSpoken = this.deps.config.spokenLanguage();
    const templates = await this.loadTemplates();
    const tr = this.deps.config.translator;
    const t: T = (key, vars) => tr.t(key, vars);
    const hasBackupKey = Boolean(
      cfg.apiKeys.google || cfg.apiKeys.googleSpeech || cfg.apiKeys.azure || cfg.apiKeys.anthropic,
    );
    const qualityOptions: ReadonlyArray<QualityOption> = [
      { value: 'cheap', label: t('settings.cheap'), hint: t('settings.hint_cheap') },
      { value: 'balanced', label: t('settings.balanced'), hint: t('settings.hint_balanced') },
      { value: 'premium', label: t('settings.premium'), hint: t('settings.hint_premium') },
    ];
    root.innerHTML = `
      <div class="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <h1 tabindex="-1" class="mb-5 text-3xl font-semibold tracking-tight sm:mb-6 sm:text-4xl">${t('settings.title')}</h1>

        <form id="settings-form" class="flex flex-col gap-5 pb-24 md:pb-0" novalidate>
          <section class="card" aria-labelledby="settings-language">
            <h2 id="settings-language" class="mb-4 text-xl font-semibold tracking-tight">${t('settings.language_title')}</h2>
            <div class="grid gap-4 sm:grid-cols-2">
              ${languageField('language', t('settings.interface_language'), cfg.language)}
              ${languageField(
                'spokenLanguage',
                t('settings.spoken_language'),
                this.deps.config.spokenLanguage(),
                t('settings.spoken_language_hint'),
              )}
            </div>
          </section>

          <section class="card" aria-labelledby="settings-keys">
            <h2 id="settings-keys" class="text-xl font-semibold tracking-tight">${t('settings.keys_title')}</h2>
            <p class="mt-2 leading-relaxed text-fg-muted">${t('settings.api_keys_warning')}</p>
            <div class="mt-5 flex flex-col gap-5">
              ${keyRow(
                'openai',
                t('settings.provider_openai'),
                t('settings.use_openai'),
                cfg.apiKeys.openai,
                t,
                {
                  required: true,
                  getKey: !cfg.apiKeys.openai,
                },
              )}
              <details class="group rounded-[var(--radius-control)] border border-line"${hasBackupKey ? ' open' : ''}>
                <summary class="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 font-semibold [&::-webkit-details-marker]:hidden">
                  <span class="shrink-0 transition-transform duration-150 group-open:rotate-90">${ICON_CHEVRON}</span>
                  <span class="min-w-0">${t('settings.backups')}</span>
                </summary>
                <div class="flex flex-col gap-5 border-t border-line px-4 pt-4 pb-5">
                  ${keyRow('google', t('settings.provider_google'), t('settings.use_google'), cfg.apiKeys.google, t, { source: t('settings.source_google') })}
                  ${keyRow('googleSpeech', t('settings.provider_google_speech'), t('settings.use_google_speech'), cfg.apiKeys.googleSpeech, t, { source: t('settings.source_google_speech') })}
                  ${keyRow('azure', t('settings.provider_azure'), t('settings.use_azure'), cfg.apiKeys.azure, t)}
                  <div class="flex flex-col gap-2">
                    <label for="azure-region" class="font-semibold">${t('settings.azure_region')}</label>
                    <input
                      id="azure-region"
                      type="text"
                      name="azureRegion"
                      value="${escapeHtml(cfg.azureRegion)}"
                      placeholder="${escapeHtml(t('settings.azure_region_placeholder'))}"
                      autocomplete="off"
                      spellcheck="false"
                      class="field min-w-0"
                    />
                  </div>
                  ${keyRow('anthropic', t('settings.provider_anthropic'), t('settings.use_anthropic'), cfg.apiKeys.anthropic, t)}
                </div>
              </details>
            </div>
            <div class="mt-5 border-t border-line pt-4">
              <button type="button" data-action="clear-keys" class="btn-ghost -ml-3 text-danger disabled:text-fg-muted">${ICON_TRASH}<span>${t('settings.btn_clear')}</span></button>
            </div>
          </section>

          <section class="card" aria-labelledby="settings-quality">
            <h2 id="settings-quality" class="text-xl font-semibold tracking-tight">${t('settings.qualities')}</h2>
            <p class="mt-2 leading-relaxed text-fg-muted">${t('settings.quality_hint')}</p>
            <div class="mt-5 flex flex-col gap-6">
              ${qualityFieldset('transcriptionQuality', t('settings.transcription_quality'), cfg.transcriptionQuality, qualityOptions)}
              ${qualityFieldset('summaryQuality', t('settings.summary_quality'), cfg.summaryQuality, qualityOptions)}
            </div>
          </section>

          <section class="card" aria-labelledby="settings-template">
            <h2 id="settings-template" class="mb-4 text-xl font-semibold tracking-tight">${t('templates.title')}</h2>
            <div class="flex flex-col gap-2">
              <label for="default-template" class="font-semibold">${t('settings.default_template')}</label>
              <p id="default-template-hint" class="text-sm text-fg-muted">${t('settings.default_template_hint')}</p>
              <select id="default-template" name="defaultTemplate" class="field min-w-0" aria-describedby="default-template-hint">
                ${templates
                  .map(
                    (tpl) =>
                      `<option value="${escapeHtml(tpl.id)}"${tpl.id === cfg.defaultTemplate ? ' selected' : ''}>${escapeHtml(templateDisplayName(tpl, tr))}</option>`,
                  )
                  .join('')}
              </select>
            </div>
            <a href="#/templates" class="btn-secondary mt-4">${t('templates.manage')}${ICON_CHEVRON}</a>
          </section>

          <section class="card" aria-labelledby="settings-about">
            <h2 id="settings-about" class="mb-2 text-xl font-semibold tracking-tight">${t('settings.about')}</h2>
            <p class="text-fg-muted tabular">${t('app.version', { version: __APP_VERSION__ })}</p>
            <p class="mt-1"><a href="${LICENCE_URL}" target="_blank" rel="noopener" class="inline-block rounded-[var(--radius-control)] py-2.5 font-semibold text-fg underline-offset-4 hover:underline">${t('settings.licence')}<span class="ml-1.5 inline-block align-[-0.2em]">${ICON_EXTERNAL}</span></a></p>
          </section>

          <div class="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface md:static md:mt-1 md:bg-transparent">
            <div class="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6 md:px-0 md:pt-5 md:pb-0">
              <div class="min-w-0 flex-1 text-sm">
                <p id="dirty-indicator" hidden class="flex items-center gap-2 font-semibold text-warning">${ICON_ALERT}<span>${t('settings.unsaved')}</span></p>
                <p id="settings-status" role="status" class="text-fg-muted empty:sr-only"></p>
              </div>
              <button type="submit" id="btn-save" class="btn-action shrink-0" disabled>${t('settings.btn_save')}</button>
            </div>
          </div>
        </form>
      </div>
    `;
    this.bind();
    this.baseline = this.proposed();
    this.refreshButtonStates();
  }

  canLeave(): boolean {
    return this.guard.confirmLeave(
      this.deps.config.translator.t('settings.leave_unsaved'),
      this.confirm,
    );
  }

  dispose(): void {
    this.guard.dispose();
  }

  private async loadTemplates(): Promise<Template[]> {
    const result = await this.deps.listTemplates.execute();
    return result.ok ? result.value : [Template.generic(), Template.work(), Template.interview()];
  }

  private bind(): void {
    const form = this.qs<HTMLFormElement>('#settings-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.handleSave();
    });
    form.addEventListener('input', () => this.refreshButtonStates());
    form.addEventListener('change', () => this.refreshButtonStates());
    this.qs<HTMLButtonElement>('[data-action="clear-keys"]').addEventListener('click', () => {
      void this.handleClear();
    });
    form.querySelectorAll<HTMLButtonElement>('[data-test-key]').forEach((btn) => {
      btn.addEventListener('click', () => void this.handleValidate(btn));
    });
  }

  private proposed(): AppConfig {
    return buildProposedConfig(
      new FormData(this.qs<HTMLFormElement>('#settings-form')),
      this.deps.config.get(),
      this.initialSpoken,
    );
  }

  private refreshButtonStates(): void {
    if (!this.root || !this.baseline) return;
    const isDirty = !configsEqual(this.baseline, this.proposed());
    this.guard.setBusy(isDirty);
    this.qs<HTMLButtonElement>('#btn-save').disabled = !isDirty;
    this.qs<HTMLElement>('#dirty-indicator').hidden = !isDirty;
    if (isDirty) this.setStatus('');
    // Clearing re-renders from the stored config, which would drop other unsaved edits.
    this.qs<HTMLButtonElement>('[data-action="clear-keys"]').disabled =
      isDirty || !hasAnyKey(this.deps.config.get().apiKeys);
  }

  private async handleValidate(btn: HTMLButtonElement): Promise<void> {
    const provider = btn.dataset['testKey'] as ApiKeyProviderName | undefined;
    if (!provider || !this.root) return;
    const input = this.root.querySelector<HTMLInputElement>(`input[name="${provider}"]`);
    const result = this.root.querySelector<HTMLElement>(`[data-status="${provider}"]`);
    if (!input || !result) return;
    const tr = this.deps.config.translator;
    const t: T = (key, vars) => tr.t(key, vars);
    const key = input.value.trim();
    if (key.length === 0) {
      result.innerHTML = checkLine(false, t('settings.key_empty'));
      return;
    }
    result.innerHTML = `<p class="text-fg-muted">${t('settings.testing')}</p>`;
    btn.disabled = true;
    const outcome = await this.deps.validateApiKey.execute({ provider, key });
    btn.disabled = false;
    if (!outcome.ok) {
      result.innerHTML = checkLine(
        false,
        t('settings.test_failed'),
        reasonText(outcome.error.reason, t),
      );
      return;
    }
    result.innerHTML = outcome.value.checks
      .map((c) =>
        c.ok
          ? checkLine(true, t('settings.check_ok', { service: c.service }))
          : checkLine(
              false,
              t('settings.check_failed', { service: c.service }),
              c.reason &&
                (c.reason === 'unknown' ? t('settings.key_rejected') : reasonText(c.reason, t)),
            ) + fixLink(provider, c.reason, t),
      )
      .join('');
  }

  private async handleSave(): Promise<void> {
    const tr = this.deps.config.translator;
    const current = this.deps.config.get();
    const next = this.proposed();
    if (configsEqual(current, next)) {
      this.setStatus(tr.t('settings.no_changes'));
      return;
    }
    const languageChanged = current.language !== next.language;
    const result = await this.deps.config.update(next);
    if (!result.ok) {
      this.setStatus(`${tr.t('settings.save_failed')} ${errorText(result.error, tr)}`);
      return;
    }
    if (languageChanged) {
      this.deps.shell?.relabel();
      if (this.root) {
        await this.render(this.root);
        titleFromHeading(this.root);
      }
    } else {
      this.initialSpoken = this.deps.config.spokenLanguage();
      this.baseline = next;
      this.refreshButtonStates();
    }
    this.setStatus(tr.t('settings.saved'));
  }

  private async handleClear(): Promise<void> {
    const tr = this.deps.config.translator;
    const current = this.deps.config.get();
    if (!hasAnyKey(current.apiKeys)) return;
    if (!this.confirm(tr.t('settings.confirm_clear'))) return;
    const result = await this.deps.config.update({ ...current, apiKeys: {} });
    if (!result.ok) {
      this.setStatus(`${tr.t('settings.clear_failed')} ${errorText(result.error, tr)}`);
      return;
    }
    if (this.root) await this.render(this.root);
    this.setStatus(tr.t('settings.cleared'));
  }

  private setStatus(message: string): void {
    this.qs<HTMLElement>('#settings-status').textContent = message;
  }

  private qs<E extends HTMLElement>(selector: string): E {
    if (!this.root) throw new Error('SettingsPage not rendered yet');
    const el = this.root.querySelector<E>(selector);
    if (!el) throw new Error(`Missing element ${selector}`);
    return el;
  }
}

const hasAnyKey = (keys: ApiKeys): boolean =>
  Object.values(keys).some((v) => typeof v === 'string' && v.length > 0);

/**
 * The spoken language keeps following the interface language until the person picks a different
 * one; only then (or once one is already stored) is it written explicitly.
 */
const buildProposedConfig = (
  data: FormData,
  current: AppConfig,
  initialSpoken: LanguageCode,
): AppConfig => {
  const azureRegionRaw = data.get('azureRegion');
  const language = (data.get('language') as LanguageCode | null) ?? current.language;
  const spoken = (data.get('spokenLanguage') as LanguageCode | null) ?? initialSpoken;
  const pinSpoken =
    current.spokenLanguage !== undefined || (spoken !== initialSpoken && spoken !== language);
  const { spokenLanguage: _spoken, ...rest } = current;
  return {
    ...rest,
    ...(pinSpoken ? { spokenLanguage: spoken } : {}),
    language,
    defaultTemplate:
      (data.get('defaultTemplate') as TemplateKind | null) ?? current.defaultTemplate,
    summaryQuality: (data.get('summaryQuality') as QualityProfile | null) ?? current.summaryQuality,
    transcriptionQuality:
      (data.get('transcriptionQuality') as QualityProfile | null) ?? current.transcriptionQuality,
    azureRegion:
      typeof azureRegionRaw === 'string' && azureRegionRaw.trim().length > 0
        ? azureRegionRaw.trim()
        : current.azureRegion,
    apiKeys: buildApiKeys(data),
  };
};

const configsEqual = (a: AppConfig, b: AppConfig): boolean =>
  a.language === b.language &&
  (a.spokenLanguage ?? a.language) === (b.spokenLanguage ?? b.language) &&
  a.defaultTemplate === b.defaultTemplate &&
  a.summaryQuality === b.summaryQuality &&
  a.transcriptionQuality === b.transcriptionQuality &&
  a.azureRegion === b.azureRegion &&
  KEY_FIELDS.every((f) => (a.apiKeys[f] ?? '') === (b.apiKeys[f] ?? ''));

const buildApiKeys = (data: FormData): ApiKeys => {
  const keys: Partial<Record<keyof ApiKeys, string>> = {};
  for (const name of KEY_FIELDS) {
    const raw = data.get(name);
    if (typeof raw === 'string' && raw.trim().length > 0) keys[name] = raw.trim();
  }
  return keys;
};

const languageField = (
  name: 'language' | 'spokenLanguage',
  label: string,
  current: LanguageCode,
  hint?: string,
): string => `
  <div class="flex min-w-0 flex-col gap-2">
    <label for="field-${name}" class="font-semibold">${label}</label>
    <select id="field-${name}" name="${name}" class="field min-w-0"${hint ? ` aria-describedby="field-${name}-hint"` : ''}>
      ${(Object.keys(LANGUAGE_NAMES) as LanguageCode[])
        .map(
          (code) =>
            `<option value="${code}"${code === current ? ' selected' : ''}>${LANGUAGE_NAMES[code]}</option>`,
        )
        .join('')}
    </select>
    ${hint ? `<p id="field-${name}-hint" class="text-sm text-fg-muted">${hint}</p>` : ''}
  </div>
`;

const keyRow = (
  name: ApiKeyProviderName,
  provider: string,
  use: string,
  value: string | undefined,
  t: T,
  options: { required?: boolean; getKey?: boolean; source?: string } = {},
): string => `
  <div class="flex min-w-0 flex-col gap-2">
    <div class="flex min-w-0 items-end gap-2">
      <label class="flex min-w-0 flex-1 flex-col gap-2">
        <span class="font-semibold">${provider}</span>
        <input
          type="password"
          name="${name}"
          autocomplete="new-password"
          data-1p-ignore
          data-lpignore="true"
          spellcheck="false"
          value="${value ? escapeHtml(value) : ''}"
          placeholder="${escapeHtml(t('settings.key_placeholder'))}"
          aria-describedby="key-${name}-use${options.source ? ` key-${name}-source` : ''} key-${name}-result"
          class="field min-w-0 w-full font-mono text-sm"
        />
      </label>
      <button type="button" data-test-key="${name}" class="btn-secondary shrink-0 px-4">${t('settings.btn_test')}</button>
    </div>
    <p id="key-${name}-use" class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">${
      options.required
        ? `<span class="rounded-full bg-raised px-2.5 py-0.5 text-xs font-semibold text-fg">${t('settings.required')}</span>`
        : ''
    }<span>${use}</span></p>
    ${options.source ? `<p id="key-${name}-source" class="text-sm text-fg-muted">${options.source}</p>` : ''}
    <div id="key-${name}-result" data-status="${name}" aria-live="polite" class="flex flex-col gap-1 text-sm empty:sr-only"></div>
    ${
      options.getKey
        ? `<a href="${OPENAI_KEYS_URL}" target="_blank" rel="noopener" class="btn-ghost -ml-3 self-start text-sm">${t('home.connect_get_key')}${ICON_EXTERNAL}</a>`
        : ''
    }
  </div>
`;

const checkLine = (ok: boolean, text: string, detail?: string): string => `
  <p class="flex items-start gap-2 ${ok ? 'text-success' : 'text-danger'}">
    <span class="shrink-0">${ok ? ICON_CHECK : ICON_ALERT}</span>
    <span class="min-w-0 break-words"><span class="font-semibold">${escapeHtml(text)}</span>${
      detail ? `<span class="text-fg-muted"> · ${escapeHtml(detail)}</span>` : ''
    }</span>
  </p>
`;

/** For Google, where the person can fix a blocked or switched-off API. */
const fixLink = (
  provider: ApiKeyProviderName,
  reason: CheckFailureReason | undefined,
  t: T,
): string => {
  const library = GOOGLE_API_LIBRARY_URL[provider];
  if (!library) return '';
  const link =
    reason === 'api_disabled'
      ? { href: library, label: t('settings.link_enable_api') }
      : reason === 'api_blocked' || reason === 'key_restricted'
        ? { href: GOOGLE_CREDENTIALS_URL, label: t('settings.link_key_restrictions') }
        : reason === 'billing_disabled'
          ? { href: GOOGLE_BILLING_URL, label: t('settings.link_billing') }
          : undefined;
  if (!link) return '';
  return `<a href="${link.href}" target="_blank" rel="noopener" class="btn-ghost -ml-3 self-start text-sm">${link.label}${ICON_EXTERNAL}</a>`;
};

interface QualityOption {
  readonly value: QualityProfile;
  readonly label: string;
  readonly hint: string;
}

const qualityFieldset = (
  name: 'summaryQuality' | 'transcriptionQuality',
  legend: string,
  current: QualityProfile,
  options: ReadonlyArray<QualityOption>,
): string => `
  <fieldset class="min-w-0">
    <legend class="mb-2 font-semibold">${legend}</legend>
    <div class="divide-y divide-line">
      ${options
        .map(
          (opt) => `
        <label class="flex min-h-11 cursor-pointer items-start gap-3 py-3">
          <input type="radio" name="${name}" value="${opt.value}" class="mt-1 size-4 shrink-0 accent-action" ${opt.value === current ? 'checked' : ''} />
          <span class="min-w-0">
            <span class="block font-semibold">${opt.label}</span>
            <span class="mt-0.5 block text-sm text-fg-muted">${opt.hint}</span>
          </span>
        </label>`,
        )
        .join('')}
    </div>
  </fieldset>
`;
