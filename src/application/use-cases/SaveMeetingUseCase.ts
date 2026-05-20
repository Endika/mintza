import type { Meeting } from '../../domain/meeting/entities/Meeting';
import type { MeetingRepository } from '../../domain/meeting/ports/MeetingRepository';
import type { AppError } from '../../shared/errors/AppError';
import type { Result } from '../../shared/result/Result';

export interface SaveMeetingInput {
  readonly meeting: Meeting;
}

export class SaveMeetingUseCase {
  constructor(private readonly repository: MeetingRepository) {}

  execute(input: SaveMeetingInput): Promise<Result<void, AppError>> {
    return this.repository.save(input.meeting);
  }
}
