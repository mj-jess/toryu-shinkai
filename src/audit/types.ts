/**
 * Audit types shared between the bot and the dashboard. Pure module (no runtime
 * imports) so the web can import it via `@bot/audit/types`.
 */

export type AuditSource = 'bot' | 'dashboard';

/** One changed field, ready to display as `before → after`. */
export interface AuditChangeLine {
  label: string;
  before: string;
  after: string;
}

/** What both sides insert into the audit_events table. */
export interface AuditEventInput {
  /** yyyy-mm-dd hh:mm:ss in the family timezone. */
  createdAt: string;
  actor: string;
  source: AuditSource;
  /** enrollment | koi_product | koi_ingredient | koi_stock */
  entity: string;
  /** created | updated | deactivated | reactivated | renewed */
  action: string;
  /** Reference to the target (enrollment passport, KOI item id); null for stock. */
  entityRef: string | null;
  /** Snapshot of the target's name at the time — composed with the ref at render. */
  targetName: string;
  changes: AuditChangeLine[] | null;
}

/** A stored audit event with its changes already parsed from JSON. */
export interface AuditEventRecord extends AuditEventInput {
  id: number;
}
