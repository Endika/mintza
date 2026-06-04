export interface ScreenWakePort {
  request(): Promise<void>;
  release(): Promise<void>;
  isActive(): boolean;
  isSupported(): boolean;
}
