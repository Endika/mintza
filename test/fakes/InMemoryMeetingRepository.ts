import type { Meeting } from '../../src/domain/meeting/entities/Meeting';
import type {
  MeetingListItem,
  MeetingRepository,
} from '../../src/domain/meeting/ports/MeetingRepository';
import type { MeetingId } from '../../src/domain/meeting/value-objects/MeetingId';
import type { AppError } from '../../src/shared/errors/AppError';
import { err, ok, type Result } from '../../src/shared/result/Result';

export class InMemoryMeetingRepository implements MeetingRepository {
  readonly saves: Meeting[] = [];
  private readonly meetings = new Map<string, Meeting>();
  private failNextSaveWith: AppError | null = null;

  failNextSave(error: AppError): void {
    this.failNextSaveWith = error;
  }

  save(meeting: Meeting): Promise<Result<void, AppError>> {
    if (this.failNextSaveWith) {
      const e = this.failNextSaveWith;
      this.failNextSaveWith = null;
      return Promise.resolve(err(e));
    }
    this.saves.push(meeting);
    this.meetings.set(meeting.id.value, meeting);
    return Promise.resolve(ok(undefined));
  }

  findById(id: MeetingId): Promise<Result<Meeting | null, AppError>> {
    return Promise.resolve(ok(this.meetings.get(id.value) ?? null));
  }

  list(): Promise<Result<MeetingListItem[], AppError>> {
    const items = Array.from(this.meetings.values()).map((m) => ({
      id: m.id,
      title: m.title,
      startedAt: m.startedAt,
      durationMs: m.durationMs,
      templateKind: m.template.kind,
      starred: m.starred,
    }));
    return Promise.resolve(ok(items));
  }

  delete(id: MeetingId): Promise<Result<void, AppError>> {
    this.meetings.delete(id.value);
    return Promise.resolve(ok(undefined));
  }

  clearAll(): Promise<Result<void, AppError>> {
    this.meetings.clear();
    return Promise.resolve(ok(undefined));
  }
}
