import type { AudioCapturePort } from '../../domain/audio/ports/AudioCapturePort';
import type { Language } from '../../domain/language/value-objects/Language';
import { Meeting } from '../../domain/meeting/entities/Meeting';
import type { Template } from '../../domain/meeting/value-objects/Template';
import { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';

export interface StartRecordingInput {
  readonly template: Template;
  readonly language: Language;
}

export interface StartRecordingOutput {
  readonly meeting: Meeting;
}

export class StartRecordingUseCase {
  constructor(private readonly audio: AudioCapturePort) {}

  async execute(input: StartRecordingInput): Promise<Result<StartRecordingOutput, AppError>> {
    try {
      await this.audio.start();
    } catch (cause) {
      return err(
        new AppError(
          'MIC_PERMISSION_DENIED',
          'Could not start audio capture. Check microphone permissions.',
          cause,
        ),
      );
    }
    const meeting = Meeting.start({ template: input.template, language: input.language });
    return ok({ meeting });
  }
}
