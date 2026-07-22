import { describe, expect, it } from 'vitest';
import { enrollmentId, parseEnrollmentId } from './ids.js';

describe('enrollment custom IDs', () => {
  it('builds and parses an action without a passport', () => {
    expect(enrollmentId('browse')).toBe('enrollment:browse');
    expect(parseEnrollmentId('enrollment:browse')).toEqual({ action: 'browse', passport: '' });
  });

  it('builds and parses a record-scoped action', () => {
    const id = enrollmentId('edit', '631');
    expect(id).toBe('enrollment:edit:631');
    expect(parseEnrollmentId(id)).toEqual({ action: 'edit', passport: '631' });
  });

  it('keeps a passport containing separators intact', () => {
    const id = enrollmentId('deact-yes', 'AB:12');
    expect(parseEnrollmentId(id)).toEqual({ action: 'deact-yes', passport: 'AB:12' });
  });

  it('rejects IDs from other namespaces', () => {
    expect(parseEnrollmentId('other:action')).toBeNull();
    expect(parseEnrollmentId('enrollments:action')).toBeNull();
  });
});
