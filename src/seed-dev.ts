import { sql } from 'drizzle-orm';
import { createDatabase } from './database.js';
import { isoDaysAgo } from './enrollment/format.js';
import { EnrollmentRepository } from './enrollment/repository.js';
import type { Gym } from './enrollment/types.js';

/**
 * Resets the DEV database with a fresh batch of test enrollments, spreading
 * enrollment dates so the renewal filters and the dashboard have data to show.
 * Run with: npm run seed:dev (always reads .env.local — never production).
 */

/** Neon endpoint of the PRODUCTION branch — this script must never touch it. */
const PROD_DB_HOST = 'ep-floral-scene-acn4mv1y';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
if (url.includes(PROD_DB_HOST)) {
  throw new Error('Refusing to seed: DATABASE_URL points at the production branch');
}

interface SeedPerson {
  name: string;
  gym: Gym;
  daysAgo: number;
  inactive?: true;
}

const SEED: SeedPerson[] = [
  { name: 'Alice Santoro', gym: 'both', daysAgo: 0 },
  { name: 'Bruno Ferraz', gym: 'sandy', daysAgo: 2 },
  { name: 'Carla Mendes', gym: 'vinewood', daysAgo: 5 },
  { name: 'Diego Nakamura', gym: 'both', daysAgo: 9 },
  { name: 'Elena Vasquez', gym: 'sandy', daysAgo: 12 },
  { name: 'Fabio Torres', gym: 'vinewood', daysAgo: 16 },
  { name: 'Giovana Lima', gym: 'both', daysAgo: 20 },
  { name: 'Hugo Cardoso', gym: 'sandy', daysAgo: 25 },
  { name: 'Isabela Rocha', gym: 'vinewood', daysAgo: 33 },
  { name: 'Joao Kobayashi', gym: 'both', daysAgo: 40 },
  { name: 'Kenji Watanabe', gym: 'sandy', daysAgo: 47 },
  { name: 'Larissa Fontes', gym: 'vinewood', daysAgo: 55 },
  { name: 'Marcos Vinter', gym: 'both', daysAgo: 62 },
  { name: 'Natasha Duarte', gym: 'sandy', daysAgo: 70 },
  { name: 'Otavio Ramos', gym: 'vinewood', daysAgo: 78, inactive: true },
  { name: 'Paula Sakamoto', gym: 'both', daysAgo: 85 },
  { name: 'Rafael Ishida', gym: 'sandy', daysAgo: 95 },
  { name: 'Sofia Marino', gym: 'vinewood', daysAgo: 105, inactive: true },
  { name: 'Takeshi Mori', gym: 'both', daysAgo: 115 },
  { name: 'Ursula Braga', gym: 'sandy', daysAgo: 125 },
  { name: 'Vitor Hayashi', gym: 'vinewood', daysAgo: 135 },
  { name: 'Wanda Falcone', gym: 'both', daysAgo: 145, inactive: true },
  { name: 'Yuri Tanaka', gym: 'sandy', daysAgo: 150 },
  { name: 'Zilda Moretti', gym: 'vinewood', daysAgo: 160 },
];

const db = await createDatabase(url);
console.log('Clearing enrollments...');
await db.execute(sql`TRUNCATE TABLE enrollments RESTART IDENTITY`);

const repository = new EnrollmentRepository(db);
for (const [index, person] of SEED.entries()) {
  const passport = String(101 + index);
  const digits = String(555_000_101 + index);
  const phone = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  await repository.insert({
    passport,
    name: person.name,
    phone,
    gym: person.gym,
    enrolledAt: isoDaysAgo(person.daysAgo),
    registeredBy: 'seed',
  });
  if (person.inactive) await repository.deactivate(passport, 'seed');
}

const inactive = SEED.filter((person) => person.inactive).length;
console.log(`Seeded ${SEED.length} enrollments (${inactive} inactive).`);
process.exit(0);
