export const GYMS = ['sandy', 'vinewood', 'both'] as const;

export type Gym = (typeof GYMS)[number];

export function isGym(value: string): value is Gym {
  return (GYMS as readonly string[]).includes(value);
}

export interface EnrollmentInput {
  passport: string;
  name: string;
  phone: string;
  gym: Gym;
  /** ISO date (yyyy-mm-dd). */
  enrolledAt: string;
  registeredBy: string;
}

export interface Enrollment {
  id: number;
  passport: string;
  name: string;
  phone: string;
  gym: Gym;
  /** ISO date (yyyy-mm-dd). */
  enrolledAt: string;
  active: boolean;
  registeredBy: string | null;
  deactivatedBy: string | null;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Fields that can be changed after enrollment; undefined means "keep current value". */
export interface EnrollmentUpdate {
  passport: string;
  name?: string;
  phone?: string;
  gym?: Gym;
  enrolledAt?: string;
}
