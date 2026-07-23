/**
 * Shared by the KOI page (server) and the sales view (client) — it must live
 * outside a `'use client'` module, or the server would import a client
 * reference instead of the real array.
 */
export const SALES_PERIODS = [7, 30, 90] as const;

export type SalesPeriod = (typeof SALES_PERIODS)[number];
