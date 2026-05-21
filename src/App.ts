import { buildAppDeps, type AppDeps } from './bootstrap/setup';
import { HomePage } from './presentation/pages/HomePage';
import { Router, type Page, type PageFactory } from './presentation/router/Router';

export class App {
  private readonly deps: AppDeps;

  constructor(private readonly root: HTMLElement) {
    this.deps = buildAppDeps();
  }

  async start(): Promise<void> {
    await this.deps.configStore.hydrate();

    const routes = new Map<string, PageFactory>([
      ['/', (): Page => this.buildHome()],
      ['/settings', (): Promise<Page> => this.buildSettings()],
      ['/history', (): Promise<Page> => this.buildHistory()],
    ]);

    const router = new Router(this.root, routes, (): Page => this.buildHome());
    router.start();
  }

  private buildHome(): HomePage {
    return new HomePage({
      config: this.deps.configStore,
      audio: this.deps.audio,
      startRecording: this.deps.startRecording,
      stopRecording: this.deps.stopRecording,
      transcribeChunk: this.deps.transcribeChunk,
      generateSummaries: this.deps.generateSummaries,
      generateMindMap: this.deps.generateMindMap,
      saveMeeting: this.deps.saveMeeting,
    });
  }

  private async buildSettings(): Promise<Page> {
    const { SettingsPage } = await import('./presentation/pages/SettingsPage');
    return new SettingsPage({
      config: this.deps.configStore,
      updateConfig: this.deps.updateConfig,
      validateApiKey: this.deps.validateApiKey,
    });
  }

  private async buildHistory(): Promise<Page> {
    const { HistoryPage } = await import('./presentation/pages/HistoryPage');
    return new HistoryPage({
      listMeetings: this.deps.listMeetings,
      translator: this.deps.configStore.translator,
    });
  }
}
