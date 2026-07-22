import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { ButtonLink } from '@/components/button-link';
import { messages } from '@/messages';

export default function NotFound() {
  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 4,
      }}
    >
      <Typography variant="h5" component="h1">
        {messages.notFound.title}
      </Typography>
      <ButtonLink href="/matriculas" variant="contained">
        {messages.notFound.back}
      </ButtonLink>
    </Box>
  );
}
