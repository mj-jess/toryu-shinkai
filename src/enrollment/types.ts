export const GYMS = ['sandy', 'vinewood', 'both'] as const;

export type Gym = (typeof GYMS)[number];

export function isGym(value: string): value is Gym {
  return (GYMS as readonly string[]).includes(value);
}

export interface EnrollmentInput {
  passport: string;
  name: string;
  /** Optional: members may enroll without a phone (unique when present). */
  phone: string | null;
  gym: Gym;
  /** ISO date (yyyy-mm-dd). */
  enrolledAt: string;
  registeredBy: string;
}

export interface Enrollment {
  id: number;
  passport: string;
  name: string;
  /** Optional: null when the member enrolled without a phone. */
  phone: string | null;
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
  phone?: string | null;
  gym?: Gym;
  enrolledAt?: string;
}
