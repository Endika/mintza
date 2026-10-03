import { describe, expect, it } from 'vitest';
import { LeaveGuard } from '../../src/presentation/lifecycle/LeaveGuard';

const unload = (): Event => {
  const e = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(e);
  return e;
};

describe('LeaveGuard', () => {
  it('lets the page go when nothing is recording', () => {
    const guard = new LeaveGuard();
    expect(guard.confirmLeave('Stop?', () => false)).toBe(true);
    expect(unload().defaultPrevented).toBe(false);
  });

  it('asks before leaving while busy and blocks unload', () => {
    const guard = new LeaveGuard();
    guard.setBusy(true);
    const asked: string[] = [];
    expect(
      guard.confirmLeave('Stop and save?', (m) => {
        asked.push(m);
        return false;
      }),
    ).toBe(false);
    expect(asked).toEqual(['Stop and save?']);
    expect(unload().defaultPrevented).toBe(true);
    guard.setBusy(false);
    expect(unload().defaultPrevented).toBe(false);
  });

  it('drops the unload listener on dispose', () => {
    const guard = new LeaveGuard();
    guard.setBusy(true);
    guard.dispose();
    expect(unload().defaultPrevented).toBe(false);
  });
});
