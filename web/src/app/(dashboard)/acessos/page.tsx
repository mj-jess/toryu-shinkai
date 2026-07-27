import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { AccessManager } from '@/components/access-manager';
import { coreAdminIds } from '@/access';
import { listAllowedUsers, listUserProfiles } from '@/db';
import { messages } from '@/messages';
import { requireAdmin } from '@/session';

export default async function AcessosPage() {
  const admin = await requireAdmin();
  const [members, profiles] = await Promise.all([listAllowedUsers(), listUserProfiles()]);
  const names = Object.fromEntries(profiles.map((profile) => [profile.discordId, profile.name]));

  return (
    <Box>
      <Typography variant="h5" component="h1" gutterBottom>
        {messages.access.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {messages.access.subtitle}
      </Typography>
      <AccessManager
        core={coreAdminIds()}
        members={members}
        names={names}
        currentId={admin.discordId}
        currentName={admin.name}
      />
    </Box>
  );
}
