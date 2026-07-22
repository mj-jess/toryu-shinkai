import CssBaseline from '@mui/material/CssBaseline';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { ThemeProvider } from '@mui/material/styles';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import type { Metadata } from 'next';
import { Inter, Zen_Kaku_Gothic_New } from 'next/font/google';
import type { ReactNode } from 'react';
import { messages } from '@/messages';
import { theme } from '@/theme';

/** Body/table font — highly legible for dense data. */
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
});

/** Heading/brand font — Japanese-designed, carries the family identity. */
const zenKaku = Zen_Kaku_Gothic_New({
  weight: ['400', '500', '700'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-zen-kaku',
});

export const metadata: Metadata = {
  title: messages.appName,
  description: messages.tagline,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${zenKaku.variable}`} suppressHydrationWarning>
      <body>
        <InitColorSchemeScript attribute="class" defaultMode="dark" />
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme} defaultMode="dark">
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
