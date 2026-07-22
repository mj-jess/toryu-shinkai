import { describe, expect, it } from 'vitest';
import { messages } from '../messages.js';
import { buildDeactivateConfirmView, buildDetailView } from './detail-view.js';
import type { Enrollment } from './types.js';

function buildEnrollment(overrides: Partial<Enrollment> = {}): Enrollment {
  return {
    id: 1,
    passport: '631',
    name: 'Ryoko Toryu',
    phone: '(666) 123-456',
    gym: 'both',
    enrolledAt: '2026-07-22',
    active: true,
    registeredBy: 'mjmylie',
    deactivatedBy: null,
    deactivatedAt: null,
    createdAt: '2026-07-22 11:43:11',
    updatedAt: '2026-07-22 11:43:11',
    ...overrides,
  };
}

function fieldValue(view: ReturnType<typeof buildDetailView>, name: string): string | undefined {
  return view.embeds[0]?.data.fields?.find((field) => field.name === name)?.value;
}

function buttonIds(view: ReturnType<typeof buildDetailView>): string[] {
  const row = view.components[0]?.toJSON() as { components: { custom_id: string }[] } | undefined;
  return row?.components.map((button) => button.custom_id) ?? [];
}

describe('buildDetailView', () => {
  it('shows every value labeled, with the passport — name header', () => {
    const view = buildDetailView(buildEnrollment());
    const labels = messages.addModal.fields;

    expect(view.embeds[0]?.data.title).toBe('631 — Ryoko Toryu');
    expect(fieldValue(view, labels.phone)).toBe('(666) 123-456');
    expect(fieldValue(view, labels.gym)).toBe('As duas');
    expect(fieldValue(view, labels.enrolledAt)).toBe('22/07/2026');
    expect(fieldValue(view, messages.detailView.statusLabel)).toBe(
      messages.detailView.statusActive,
    );
    expect(fieldValue(view, labels.registeredBy)).toBe('mjmylie');
  });

  it('offers edit, renew, deactivate, and back for an active record', () => {
    const view = buildDetailView(buildEnrollment());

    expect(buttonIds(view)).toEqual([
      'enrollment:edit:631',
      'enrollment:renew:631',
      'enrollment:deact:631',
      'enrollment:back',
    ]);
  });

  it('shows deactivation audit and offers reactivate for an inactive record', () => {
    const view = buildDetailView(
      buildEnrollment({
        active: false,
        deactivatedBy: 'admin#1',
        deactivatedAt: '2026-07-23 10:00:00',
      }),
    );

    expect(fieldValue(view, messages.detailView.statusLabel)).toBe(
      messages.detailView.statusInactive,
    );
    expect(fieldValue(view, messages.detailView.deactivatedByLabel)).toBe(
      messages.detailView.deactivationInfo('admin#1', '23/07/2026'),
    );
    expect(buttonIds(view)).toContain('enrollment:react:631');
    expect(buttonIds(view)).not.toContain('enrollment:renew:631');
  });

  it('renders a highlighted note when provided', () => {
    const view = buildDetailView(buildEnrollment(), messages.detailView.updatedNote);
    expect(view.embeds[0]?.data.description).toBe(messages.detailView.updatedNote);
  });
});

describe('buildDeactivateConfirmView', () => {
  it('asks for confirmation with confirm and cancel actions', () => {
    const view = buildDeactivateConfirmView(buildEnrollment());

    expect(view.embeds[0]?.data.description).toBe(
      messages.detailView.confirmDeactivation('Ryoko Toryu'),
    );
    expect(buttonIds(view)).toEqual(['enrollment:deact-yes:631', 'enrollment:view:631']);
  });
});
