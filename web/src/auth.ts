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
    // The Discord id identifies who registered a KOI sale, so carry it along.
    jwt({ token, profile }) {
      if (typeof profile?.id === 'string') token.discordId = profile.id;
      return token;
    },
    session({ session, token }) {
      const discordId = token.discordId;
      if (typeof discordId === 'string') session.user.discordId = discordId;
      return session;
    },
  },
});
