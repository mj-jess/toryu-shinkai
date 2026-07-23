'use client';

import Breadcrumbs from '@mui/material/Breadcrumbs';
import MuiLink from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  /** When absent the item renders as plain text (e.g. the current page). */
  href?: string;
}

/** Standard page trail for show/edit pages — replaces "back" links. */
export function PageBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <Breadcrumbs separator="›" aria-label="breadcrumb" sx={{ mb: 2 }}>
      {items.map((item, index) =>
        item.href ? (
          <MuiLink
            key={item.label}
            component={Link}
            href={item.href}
            underline="hover"
            color="inherit"
          >
            {item.label}
          </MuiLink>
        ) : (
          <Typography
            key={item.label}
            color={index === items.length - 1 ? 'text.primary' : 'inherit'}
          >
            {item.label}
          </Typography>
        ),
      )}
    </Breadcrumbs>
  );
}
