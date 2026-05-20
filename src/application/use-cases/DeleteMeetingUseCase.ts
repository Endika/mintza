import type { MeetingRepository } from '../../domain/meeting/ports/MeetingRepository';
import type { MeetingId } from '../../domain/meeting/value-objects/MeetingId';
import type { AppError } from '../../shared/errors/AppError';
import type { Result } from '../../shared/result/Result';

export interface DeleteMeetingInput {
  readonly id: MeetingId;
}

export class DeleteMeetingUseCase {
  constructor(private readonly repository: MeetingRepository) {}

  execute(input: DeleteMeetingInput): Promise<Result<void, AppError>> {
    return this.repository.delete(input.id);
  }
}
