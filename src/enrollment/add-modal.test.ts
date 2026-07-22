import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../db/test-database.js';
import { messages } from '../messages.js';
import { handleAddModalSubmit } from './add-modal.js';
import { EnrollmentRepository } from './repository.js';
import {
  embedTitle,
  FAKE_AUDIT_LOG_URL,
  fakeAuditLog,
  fakeModalInteraction,
  replyArg,
} from './test-utils.js';

interface FormValues {
  passport: string;
  name: string;
  phone: string;
  gym: string;
  enrolledAt: string;
}

function buildFormValues(overrides: Partial<FormValues> = {}): FormValues {
  return {
    passport: '12345',
    name: 'John Doe',
    phone: '123456789',
    gym: 'both',
    enrolledAt: '22/07/2026',
    ...overrides,
  };
}

function addInteraction(values: FormValues) {
  return fakeModalInteraction({
    text: {
      passport: values.passport,
      name: values.name,
      phone: values.phone,
      enrolledAt: values.enrolledAt,
    },
    selects: { gym: [values.gym] },
  });
}

describe('handleAddModalSubmit', () => {
  let testDb: TestDatabase;
  let repository: EnrollmentRepository;
  let audit: ReturnType<typeof fakeAuditLog>;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    repository = new EnrollmentRepository(testDb.db);
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.reset();
    audit = fakeAuditLog();
  });

  it('creates an enrollment from valid input', async () => {
    const interaction = addInteraction(buildFormValues());

    await handleAddModalSubmit(interaction, repository, audit);

    expect(await repository.findByPassport('12345')).toMatchObject({
      name: 'John Doe',
      phone: '(123) 456-789',
      gym: 'both',
      enrolledAt: '2026-07-22',
      active: true,
      registeredBy: 'tester#0',
    });
    expect(replyArg(interaction).content).toBe(
      messages.addModal.savedWithLog(messages.addModal.createdTitle, FAKE_AUDIT_LOG_URL),
    );
    expect(audit.events).toMatchObject([
      { action: 'created', actor: '<@42>', enrollment: { passport: '12345' } },
    ]);
  });

  it('falls back to the full record embed when no audit log was sent', async () => {
    audit = fakeAuditLog(null);
    const interaction = addInteraction(buildFormValues());

    await handleAddModalSubmit(interaction, repository, audit);

    expect(embedTitle(replyArg(interaction))).toBe(messages.addModal.createdTitle);
  });

  it('trims passport and name', async () => {
    const interaction = addInteraction(buildFormValues({ passport: ' 12345 ', name: ' John ' }));

    await handleAddModalSubmit(interaction, repository, audit);

    expect((await repository.findByPassport('12345'))?.name).toBe('John');
  });

  it('rejects an invalid phone without saving', async () => {
    const interaction = addInteraction(buildFormValues({ phone: '123' }));

    await handleAddModalSubmit(interaction, repository, audit);

    expect(await repository.findByPassport('12345')).toBeUndefined();
    expect(replyArg(interaction).content).toBe(messages.addModal.invalidPhone);
    expect(audit.events).toEqual([]);
  });

  it('rejects an invalid date without saving', async () => {
    const interaction = addInteraction(buildFormValues({ enrolledAt: '31/02/2026' }));

    await handleAddModalSubmit(interaction, repository, audit);

    expect(await repository.findByPassport('12345')).toBeUndefined();
    expect(replyArg(interaction).content).toContain('Data inválida');
  });

  it('rejects a phone already registered to another passport', async () => {
    await handleAddModalSubmit(addInteraction(buildFormValues()), repository, audit);

    const second = addInteraction(
      buildFormValues({ passport: '99', name: 'Other Person', phone: '123456789' }),
    );
    await handleAddModalSubmit(second, repository, audit);

    expect(await repository.findByPassport('99')).toBeUndefined();
    expect(replyArg(second).content).toBe(
      messages.addModal.phoneInUse('(123) 456-789', '12345', 'John Doe'),
    );
  });

  it('warns when the passport already has an active enrollment', async () => {
    await handleAddModalSubmit(addInteraction(buildFormValues()), repository, audit);

    const second = addInteraction(buildFormValues({ name: 'Someone Else' }));
    await handleAddModalSubmit(second, repository, audit);

    expect((await repository.findByPassport('12345'))?.name).toBe('John Doe');
    expect(replyArg(second).content).toContain('já tem matrícula ativa');
  });

  it('reactivates an inactive enrollment with the new data', async () => {
    await handleAddModalSubmit(addInteraction(buildFormValues()), repository, audit);
    await repository.deactivate('12345', 'tester#0');

    const again = addInteraction(buildFormValues({ name: 'John Returns', gym: 'sandy' }));
    await handleAddModalSubmit(again, repository, audit);

    expect(await repository.findByPassport('12345')).toMatchObject({
      name: 'John Returns',
      gym: 'sandy',
      active: true,
      deactivatedBy: null,
      deactivatedAt: null,
    });
    expect(replyArg(again).content).toBe(
      messages.addModal.savedWithLog(messages.addModal.reactivatedTitle, FAKE_AUDIT_LOG_URL),
    );
    expect(audit.events.at(-1)).toMatchObject({
      action: 'reactivated',
      enrollment: { passport: '12345', name: 'John Returns' },
    });
  });
});
