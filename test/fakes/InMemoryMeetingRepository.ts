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
  private failNextFindWith: AppError | null = null;
  private failSaveCall: { readonly at: number; readonly error: AppError } | null = null;
  private saveCalls = 0;

  failNextSave(error: AppError): void {
    this.failNextSaveWith = error;
  }

  failNextFind(error: AppError): void {
    this.failNextFindWith = error;
  }

  /** Fails the nth call to `save` from now on (1 is the next one). */
  failSaveAt(n: number, error: AppError): void {
    this.failSaveCall = { at: this.saveCalls + n, error };
  }

  save(meeting: Meeting): Promise<Result<void, AppError>> {
    this.saveCalls += 1;
    if (this.failSaveCall?.at === this.saveCalls)
      return Promise.resolve(err(this.failSaveCall.error));
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
    if (this.failNextFindWith) {
      const e = this.failNextFindWith;
      this.failNextFindWith = null;
      return Promise.resolve(err(e));
    }
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
      imported: m.importedAt !== undefined,
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
