export interface BrowseState {
  page: number;
  filter: string;
}

const DEFAULT_STATE: BrowseState = { page: 0, filter: '' };

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
