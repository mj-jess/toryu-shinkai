import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { KoiView } from '@/components/koi-view';
import { getKoiCatalog } from '@/db';
import { messages } from '@/messages';
import { requireUser } from '@/session';

export default async function KoiPage() {
  await requireUser();
  const products = await getKoiCatalog();

  return (
    <Box>
      <Typography variant="h5" component="h1" gutterBottom>
        {messages.koi.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {messages.koi.subtitle}
      </Typography>
      <KoiView products={products} />
    </Box>
  );
}
