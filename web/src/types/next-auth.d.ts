import type { DefaultSession } from 'next-auth';

/** The Discord id travels from the OAuth profile to the session, so anything a
 *  member registers (e.g. a KOI sale) records who did it. */
declare module 'next-auth' {
  interface Session {
    user: { discordId?: string } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    discordId?: string;
  }
}
