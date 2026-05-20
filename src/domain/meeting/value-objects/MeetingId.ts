const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class MeetingId {
  private constructor(public readonly value: string) {}

  static generate(): MeetingId {
    return new MeetingId(crypto.randomUUID());
  }

  static restore(value: string): MeetingId {
    if (!UUID_REGEX.test(value)) {
      throw new Error(`Invalid MeetingId: ${value}`);
    }
    return new MeetingId(value);
  }

  equals(other: MeetingId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
