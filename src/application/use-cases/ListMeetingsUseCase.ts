import type {
  MeetingListItem,
  MeetingRepository,
} from '../../domain/meeting/ports/MeetingRepository';
import type { AppError } from '../../shared/errors/AppError';
import type { Result } from '../../shared/result/Result';

export class ListMeetingsUseCase {
  constructor(private readonly repository: MeetingRepository) {}

  execute(): Promise<Result<MeetingListItem[], AppError>> {
    return this.repository.list();
  }
}
