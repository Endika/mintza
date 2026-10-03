import { buildAppDeps, type AppDeps } from './bootstrap/setup';
import { AppShell } from './presentation/components/AppShell';
import { HomePage } from './presentation/pages/HomePage';
import type { Translator } from './presentation/i18n/Translator';
import { Router, type Page, type PageFactory } from './presentation/router/Router';

export class App {
  private readonly deps: AppDeps;

  constructor(private readonly root: HTMLElement) {
    this.deps = buildAppDeps();
  }

  get translator(): Translator {
    return this.deps.configStore.translator;
  }

  async start(): Promise<void> {
    await this.deps.configStore.hydrate();

    const shell = new AppShell(this.root, this.translator);
    const routes = new Map<string, PageFactory>([
      ['/', (): Page => this.buildHome(shell)],
      ['/settings', (): Promise<Page> => this.buildSettings(shell)],
      ['/history', (): Promise<Page> => this.buildHistory()],
      ['/meeting', (): Promise<Page> => this.buildMeetingDetail()],
      ['/templates', (): Promise<Page> => this.buildTemplates()],
    ]);

    const router = new Router(shell.main, routes, (): Page => this.buildHome(shell), {
      onNavigate: (path) => shell.setActive(path),
    });
    router.start();
  }

  private buildHome(shell: AppShell): HomePage {
    return new HomePage({
      config: this.deps.configStore,
      audio: this.deps.audio,
      screenWake: this.deps.screenWake,
      startRecording: this.deps.startRecording,
      stopRecording: this.deps.stopRecording,
      transcribeChunk: this.deps.transcribeChunk,
      generateSummaries: this.deps.generateSummaries,
      generateMindMap: this.deps.generateMindMap,
      finalizeMeeting: this.deps.finalizeMeeting,
      saveMeeting: this.deps.saveMeeting,
      listTemplates: this.deps.listTemplates,
      listMeetings: this.deps.listMeetings,
      templateRegistry: this.deps.templateRegistry,
      shell,
    });
  }

  private async buildSettings(shell: AppShell): Promise<Page> {
    const { SettingsPage } = await import('./presentation/pages/SettingsPage');
    return new SettingsPage({
      config: this.deps.configStore,
      validateApiKey: this.deps.validateApiKey,
      shell,
    });
  }

  private async buildHistory(): Promise<Page> {
    const { HistoryPage } = await import('./presentation/pages/HistoryPage');
    return new HistoryPage({
      listMeetings: this.deps.listMeetings,
      getMeeting: this.deps.getMeeting,
      saveMeeting: this.deps.saveMeeting,
      deleteMeeting: this.deps.deleteMeeting,
      clearMeetings: this.deps.clearMeetings,
      translator: this.deps.configStore.translator,
    });
  }

  private async buildMeetingDetail(): Promise<Page> {
    const { MeetingDetailPage } = await import('./presentation/pages/MeetingDetailPage');
    return new MeetingDetailPage({
      getMeeting: this.deps.getMeeting,
      deleteMeeting: this.deps.deleteMeeting,
      listTemplates: this.deps.listTemplates,
      regenerateSummaries: this.deps.regenerateSummaries,
      translator: this.deps.configStore.translator,
    });
  }

  private async buildTemplates(): Promise<Page> {
    const { TemplatesPage } = await import('./presentation/pages/TemplatesPage');
    return new TemplatesPage({
      listTemplates: this.deps.listTemplates,
      listMeetings: this.deps.listMeetings,
      saveTemplate: this.deps.saveTemplate,
      deleteTemplate: this.deps.deleteTemplate,
      translator: this.deps.configStore.translator,
    });
  }
}
