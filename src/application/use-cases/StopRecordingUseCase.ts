import type { AudioCapturePort } from '../../domain/audio/ports/AudioCapturePort';
import type { Meeting } from '../../domain/meeting/entities/Meeting';
import { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';

export interface StopRecordingInput {
  readonly meeting: Meeting;
  readonly flushPending?: () => Promise<unknown>;
}

export class StopRecordingUseCase {
  constructor(private readonly audio: AudioCapturePort) {}

  async execute(input: StopRecordingInput): Promise<Result<void, AppError>> {
    try {
      await this.audio.stop();
    } catch (cause) {
      return err(new AppError('RECORDING_NOT_SUPPORTED', 'Failed to stop recording', cause));
    }
    if (input.flushPending) {
      await input.flushPending();
    }
    input.meeting.finish();
    return ok(undefined);
  }
}
