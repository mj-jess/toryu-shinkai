'use client';

import Button, { type ButtonProps } from '@mui/material/Button';
import Link from 'next/link';

/**
 * MUI Button navigating via next/link. Server components cannot pass the Link
 * component (a function) to client components, so the pairing lives here.
 */
export function ButtonLink({ href, ...props }: ButtonProps & { href: string }) {
  return <Button component={Link} href={href} {...props} />;
}
