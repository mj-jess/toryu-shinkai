/** Which list the user is looking at: all enrollments or the renewals (due) view. */
export type BrowseView = 'browse' | 'due';

export type DuePeriod = '2w' | '1m';

export interface BrowseState {
  view: BrowseView;
  page: number;
  /** Browse view only. */
  filter: string;
  /** Due view only. */
  period: DuePeriod;
}

const DEFAULT_STATE: BrowseState = { view: 'browse', page: 0, filter: '', period: '1m' };

/**
 * Per-user navigation state for the enrollment browser (current page and filter).
 * Kept in memory: sessions are short-lived and losing them on restart just
 * resets stale ephemeral messages back to page 1 without a filter.
 */
export class BrowseSessions {
  private readonly sessions = new Map<string, BrowseState>();

  get(userId: string): BrowseState {
    return this.sessions.get(userId) ?? { ...DEFAULT_STATE };
  }

  set(userId: string, state: BrowseState): void {
    this.sessions.set(userId, state);
  }
}
