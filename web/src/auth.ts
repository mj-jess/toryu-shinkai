import NextAuth from 'next-auth';
import Discord from 'next-auth/providers/discord';
import { canSignIn } from '@/access';
import { upsertUserProfile } from '@/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Discord],
  pages: { signIn: '/login' },
  callbacks: {
    async signIn({ profile }) {
      if (typeof profile?.id !== 'string') return false;
      if (!(await canSignIn(profile.id))) return false;
      // Capture the Discord display name so ids show as people on the Acessos page.
      const discord = profile as { global_name?: string | null; username?: string | null };
      const name = discord.global_name || discord.username || profile.id;
      try {
        await upsertUserProfile(profile.id, name);
      } catch (error) {
        console.error('Failed to capture user profile on login:', error);
      }
      return true;
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
