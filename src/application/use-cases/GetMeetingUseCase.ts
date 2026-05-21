import type { Meeting } from '../../domain/meeting/entities/Meeting';
import type { MeetingRepository } from '../../domain/meeting/ports/MeetingRepository';
import type { MeetingId } from '../../domain/meeting/value-objects/MeetingId';
import type { AppError } from '../../shared/errors/AppError';
import type { Result } from '../../shared/result/Result';

export interface GetMeetingInput {
  readonly id: MeetingId;
}

export class GetMeetingUseCase {
  constructor(private readonly repository: MeetingRepository) {}

  execute(input: GetMeetingInput): Promise<Result<Meeting | null, AppError>> {
    return this.repository.findById(input.id);
  }
}
