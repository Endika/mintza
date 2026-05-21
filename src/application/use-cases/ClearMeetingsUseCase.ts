import type { MeetingRepository } from '../../domain/meeting/ports/MeetingRepository';
import type { AppError } from '../../shared/errors/AppError';
import type { Result } from '../../shared/result/Result';

export class ClearMeetingsUseCase {
  constructor(private readonly repository: MeetingRepository) {}

  execute(): Promise<Result<void, AppError>> {
    return this.repository.clearAll();
  }
}
