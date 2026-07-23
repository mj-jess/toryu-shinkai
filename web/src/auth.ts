import NextAuth from 'next-auth';
import Discord from 'next-auth/providers/discord';

/**
 * Only Discord accounts in this allowlist can sign in (comma-separated IDs).
 * Kept in an env var for now; may become a table managed from the UI later.
 */
const allowedIds = (process.env.ALLOWED_DISCORD_IDS ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Discord],
  pages: { signIn: '/login' },
  callbacks: {
    signIn({ profile }) {
      return typeof profile?.id === 'string' && allowedIds.includes(profile.id);
    },
    /**
     * The Discord id identifies who registered a KOI sale. It is only known
     * while signing in, so it is stored in the token then. Never fall back to
     * `token.sub`: without a database adapter that is a generated UUID, not
     * the Discord id — sessions minted before this claim must sign in again.
     */
    jwt({ token, profile, account }) {
      const discordId = profile?.id ?? account?.providerAccountId;
      if (typeof discordId === 'string') token.discordId = discordId;
      return token;
    },
    session({ session, token }) {
      if (typeof token.discordId === 'string') session.user.discordId = token.discordId;
      return session;
    },
  },
});
