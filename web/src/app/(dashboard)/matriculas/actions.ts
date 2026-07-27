'use server';

import { revalidatePath } from 'next/cache';
import { formatPhoneNumber } from '@bot/enrollment/format';
import { isGym, type EnrollmentInput, type Gym } from '@bot/enrollment/types';
import {
  activateEnrollment as dbActivate,
  deactivateEnrollment as dbDeactivate,
  findEnrollment,
  findEnrollmentByPhone,
  insertEnrollment,
  reactivateEnrollment as dbReactivate,
  renewEnrollment as dbRenew,
  updateEnrollmentRecord,
} from '@/db';
import { todayIsoBR } from '@/format';
import { requireUser } from '@/session';

export interface EnrollmentFormValues {
  passport: string;
  name: string;
  phone: string;
  gym: string;
  /** ISO date (yyyy-mm-dd), from the native date input. */
  enrolledAt: string;
}

export interface EnrollmentResult {
  ok: boolean;
  passport?: string;
  reactivated?: boolean;
  error?: 'invalid' | 'phoneInUse' | 'passportInUse' | 'alreadyEnrolled' | 'notFound' | 'failed';
  /** Data of the record that blocks the write, so the UI can name it. */
  conflict?: { passport: string; name: string; phone?: string; gym?: Gym; enrolledAt?: string };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === (month ?? 1) - 1 &&
    date.getUTCDate() === day
  );
}

/** Phone is optional: blank is allowed; a filled value must be a valid 9-digit number. */
function parseOptionalPhone(raw: string): { ok: true; phone: string | null } | { ok: false } {
  if (raw.trim() === '') return { ok: true, phone: null };
  const phone = formatPhoneNumber(raw);
  return phone ? { ok: true, phone } : { ok: false };
}

/** Creates a new enrollment, reactivating an inactive passport (with the new data). */
export async function registerEnrollment(values: EnrollmentFormValues): Promise<EnrollmentResult> {
  const user = await requireUser();
  const passport = values.passport.trim();
  const name = values.name.trim();
  const gym = values.gym;
  const parsedPhone = parseOptionalPhone(values.phone);
  if (!passport || !name || !isGym(gym) || !isIsoDate(values.enrolledAt) || !parsedPhone.ok) {
    return { ok: false, error: 'invalid' };
  }
  const phone = parsedPhone.phone;

  // Phones are unique unless the number already belongs to this same passport.
  if (phone) {
    const phoneOwner = await findEnrollmentByPhone(phone);
    if (phoneOwner && phoneOwner.passport !== passport) {
      return {
        ok: false,
        error: 'phoneInUse',
        conflict: { passport: phoneOwner.passport, name: phoneOwner.name, phone },
      };
    }
  }

  const existing = await findEnrollment(passport);
  if (existing?.active) {
    return {
      ok: false,
      error: 'alreadyEnrolled',
      conflict: {
        passport: existing.passport,
        name: existing.name,
        gym: existing.gym,
        enrolledAt: existing.enrolledAt,
      },
    };
  }

  const input: EnrollmentInput = {
    passport,
    name,
    phone,
    gym,
    enrolledAt: values.enrolledAt,
    registeredBy: user.name,
  };
  try {
    if (existing) await dbReactivate(input);
    else await insertEnrollment(input);
  } catch {
    return { ok: false, error: 'failed' };
  }

  revalidatePath('/matriculas');
  revalidatePath(`/matriculas/${encodeURIComponent(passport)}`);
  return { ok: true, passport, reactivated: Boolean(existing) };
}

/** Edits an existing enrollment. The passport may be corrected (kept unique). */
export async function saveEnrollment(
  currentPassport: string,
  values: EnrollmentFormValues,
): Promise<EnrollmentResult> {
  await requireUser();
  const existing = await findEnrollment(currentPassport);
  if (!existing) return { ok: false, error: 'notFound' };

  const passport = values.passport.trim();
  const name = values.name.trim();
  const gym = values.gym;
  const parsedPhone = parseOptionalPhone(values.phone);
  if (!passport || !name || !isGym(gym) || !isIsoDate(values.enrolledAt) || !parsedPhone.ok) {
    return { ok: false, error: 'invalid' };
  }
  const phone = parsedPhone.phone;

  // The passport can be corrected, but must stay unique across all records.
  if (passport !== currentPassport) {
    const owner = await findEnrollment(passport);
    if (owner) {
      return {
        ok: false,
        error: 'passportInUse',
        conflict: { passport: owner.passport, name: owner.name },
      };
    }
  }

  if (phone) {
    const phoneOwner = await findEnrollmentByPhone(phone);
    if (phoneOwner && phoneOwner.passport !== currentPassport) {
      return {
        ok: false,
        error: 'phoneInUse',
        conflict: { passport: phoneOwner.passport, name: phoneOwner.name, phone },
      };
    }
  }

  try {
    await updateEnrollmentRecord(currentPassport, {
      passport,
      name,
      phone,
      gym,
      enrolledAt: values.enrolledAt,
    });
  } catch {
    return { ok: false, error: 'failed' };
  }

  revalidatePath('/matriculas');
  revalidatePath(`/matriculas/${encodeURIComponent(currentPassport)}`);
  revalidatePath(`/matriculas/${encodeURIComponent(passport)}`);
  return { ok: true, passport };
}

/** Marks an enrollment inactive (never deletes), recording the logged-in user. */
export async function deactivateEnrollment(passport: string): Promise<EnrollmentResult> {
  const user = await requireUser();
  const existing = await findEnrollment(passport);
  if (!existing) return { ok: false, error: 'notFound' };
  try {
    await dbDeactivate(passport, user.name);
  } catch {
    return { ok: false, error: 'failed' };
  }
  revalidatePath('/matriculas');
  revalidatePath(`/matriculas/${encodeURIComponent(passport)}`);
  return { ok: true, passport };
}

/** Reactivates an inactive enrollment, keeping its data. */
export async function reactivateEnrollment(passport: string): Promise<EnrollmentResult> {
  await requireUser();
  const existing = await findEnrollment(passport);
  if (!existing) return { ok: false, error: 'notFound' };
  try {
    await dbActivate(passport);
  } catch {
    return { ok: false, error: 'failed' };
  }
  revalidatePath('/matriculas');
  revalidatePath(`/matriculas/${encodeURIComponent(passport)}`);
  return { ok: true, passport };
}

/** Renews an enrollment by setting its date to today (family timezone). */
export async function renewEnrollment(passport: string): Promise<EnrollmentResult> {
  await requireUser();
  const existing = await findEnrollment(passport);
  if (!existing) return { ok: false, error: 'notFound' };
  try {
    await dbRenew(passport, todayIsoBR());
  } catch {
    return { ok: false, error: 'failed' };
  }
  revalidatePath('/matriculas');
  revalidatePath(`/matriculas/${encodeURIComponent(passport)}`);
  return { ok: true, passport };
}
