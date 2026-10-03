import type { AudioCapturePort } from '../../domain/audio/ports/AudioCapturePort';
import type { Meeting } from '../../domain/meeting/entities/Meeting';
import { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';

export const STOP_TIMEOUT_MS = 5_000;

export interface StopRecordingInput {
  readonly meeting: Meeting;
  readonly flushPending?: () => Promise<unknown>;
}

export interface StopRecordingOutput {
  /** The recorder never confirmed the stop; the meeting keeps what was transcribed until then. */
  readonly stopTimedOut: boolean;
}

export class StopRecordingUseCase {
  constructor(
    private readonly audio: AudioCapturePort,
    private readonly stopTimeoutMs: number = STOP_TIMEOUT_MS,
  ) {}

  async execute(input: StopRecordingInput): Promise<Result<StopRecordingOutput, AppError>> {
    let stopTimedOut: boolean;
    try {
      stopTimedOut = await this.stopWithin(this.stopTimeoutMs);
    } catch (cause) {
      return err(new AppError('RECORDING_NOT_SUPPORTED', 'Failed to stop recording', cause));
    }
    if (input.flushPending) {
      await input.flushPending();
    }
    input.meeting.finish();
    return ok({ stopTimedOut });
  }

  private async stopWithin(ms: number): Promise<boolean> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(true), ms);
    });
    try {
      return await Promise.race([this.audio.stop().then(() => false), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
}
