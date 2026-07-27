import type { Database } from '../database.js';
import { auditEvents } from '../db/schema.js';
import type { AuditEventInput } from './types.js';

/** Persists audit events. Bot/test side only — the dashboard has its own writer. */
export class AuditEventsRepository {
  constructor(private readonly db: Database) {}

  async insert(event: AuditEventInput): Promise<void> {
    await this.db.insert(auditEvents).values({
      createdAt: event.createdAt,
      actor: event.actor,
      source: event.source,
      entity: event.entity,
      action: event.action,
      entityRef: event.entityRef,
      targetName: event.targetName,
      changes: event.changes ? JSON.stringify(event.changes) : null,
    });
  }
}
