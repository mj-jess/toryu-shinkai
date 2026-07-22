import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { DiscordIcon } from '@/components/discord-icon';
import { messages } from '@/messages';
import { loginWithDiscord } from '../actions';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect('/matriculas');

  const { error } = await searchParams;
  const errorMessage =
    error === 'AccessDenied' ? messages.login.accessDenied : error ? messages.login.error : null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3} sx={{ alignItems: 'center' }}>
            <Box component="img" src="/logo.png" alt="" sx={{ width: 140, height: 140 }} />
            <Typography variant="h4" component="h1" align="center">
              {messages.appName}
            </Typography>
            <Typography variant="body1" color="text.secondary" align="center">
              {messages.tagline}
            </Typography>
            {errorMessage ? (
              <Alert severity="error" sx={{ width: '100%' }}>
                {errorMessage}
              </Alert>
            ) : null}
            <Box component="form" action={loginWithDiscord} sx={{ width: '100%' }}>
              <Button
                type="submit"
                fullWidth
                size="large"
                variant="contained"
                startIcon={<DiscordIcon />}
                sx={{ bgcolor: '#5865f2', color: '#fff', '&:hover': { bgcolor: '#4752c4' } }}
              >
                {messages.login.button}
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" align="center">
              {messages.login.restricted}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
