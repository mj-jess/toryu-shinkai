import type { NextConfig } from 'next';

/**
 * The dashboard imports the bot's schema, types and labels straight from ../src —
 * same repo, one source of truth. npm workspaces keep the lockfile at the repo
 * root, so Next treats the whole repo as the workspace root.
 */
const nextConfig: NextConfig = {
  // Inventory screenshots are posted to a server action (downsized client-side first).
  experimental: { serverActions: { bodySizeLimit: '5mb' } },
};

export default nextConfig;
