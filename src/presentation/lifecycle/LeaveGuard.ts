export type Confirm = (message: string) => boolean;

export class LeaveGuard {
  private isBusy = false;
  private readonly onUnload = (event: BeforeUnloadEvent): void => {
    event.preventDefault();
  };

  constructor(private readonly target: Window = window) {}

  get busy(): boolean {
    return this.isBusy;
  }

  setBusy(busy: boolean): void {
    if (busy === this.isBusy) return;
    this.isBusy = busy;
    if (busy) this.target.addEventListener('beforeunload', this.onUnload);
    else this.target.removeEventListener('beforeunload', this.onUnload);
  }

  confirmLeave(message: string, confirm: Confirm): boolean {
    return !this.isBusy || confirm(message);
  }

  dispose(): void {
    this.setBusy(false);
  }
}
