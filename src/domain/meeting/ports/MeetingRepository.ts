import type { Result } from '../../../shared/result/Result';
import type { AppError } from '../../../shared/errors/AppError';
import type { Meeting } from '../entities/Meeting';
import type { MeetingId } from '../value-objects/MeetingId';

export interface MeetingListItem {
  readonly id: MeetingId;
  readonly title: string;
  readonly startedAt: Date;
  readonly durationMs: number;
  readonly templateKind: 'work' | 'interview' | 'generic';
  readonly starred: boolean;
}

export interface MeetingRepository {
  save(meeting: Meeting): Promise<Result<void, AppError>>;
  findById(id: MeetingId): Promise<Result<Meeting | null, AppError>>;
  list(): Promise<Result<MeetingListItem[], AppError>>;
  delete(id: MeetingId): Promise<Result<void, AppError>>;
}
