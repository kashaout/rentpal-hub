/**
 * Booking time helpers
 *
 * Booking dates (`bookings.check_in` / `check_out`) are stored as DATE in Postgres
 * (no time component). To support 12-hour pre-check-in credential timing without
 * a schema change, we serialize the user-selected times into `bookings.notes` as JSON
 * under a sentinel prefix.
 *
 * Format example written into `bookings.notes`:
 *   {"checkInTime":"15:00","checkOutTime":"11:00","_userNote":"<original tenant note>"}
 *
 * Anything that's not valid JSON (or is JSON but missing the keys) is treated as
 * a plain note for backward compatibility.
 */

export interface BookingTimeNote {
  checkInTime?: string;   // "HH:mm"
  checkOutTime?: string;  // "HH:mm"
  _userNote?: string;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTime(t?: string): t is string {
  return !!t && TIME_RE.test(t);
}

/** Combine a notes string with check-in / check-out times. */
export function encodeBookingNotes(opts: {
  checkInTime?: string;
  checkOutTime?: string;
  note?: string;
}): string | null {
  const payload: BookingTimeNote = {};
  if (isValidTime(opts.checkInTime)) payload.checkInTime = opts.checkInTime;
  if (isValidTime(opts.checkOutTime)) payload.checkOutTime = opts.checkOutTime;
  if (opts.note?.trim()) payload._userNote = opts.note.trim();

  if (!payload.checkInTime && !payload.checkOutTime && !payload._userNote) return null;
  // If only a plain note exists, store it as plain text for legacy callers.
  if (!payload.checkInTime && !payload.checkOutTime) return payload._userNote ?? null;
  return JSON.stringify(payload);
}

/** Parse a stored notes string back into structured times + note. */
export function decodeBookingNotes(notes: string | null | undefined): BookingTimeNote {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed === "object") {
      return {
        checkInTime: isValidTime(parsed.checkInTime) ? parsed.checkInTime : undefined,
        checkOutTime: isValidTime(parsed.checkOutTime) ? parsed.checkOutTime : undefined,
        _userNote: typeof parsed._userNote === "string" ? parsed._userNote : undefined,
      };
    }
  } catch {
    // not JSON — treat as plain note
    return { _userNote: notes };
  }
  return {};
}

/** Build a full Date from a yyyy-MM-dd date and an HH:mm time (defaults if missing). */
export function combineDateTime(dateStr: string, timeStr?: string, fallback: string = "15:00"): Date {
  const t = isValidTime(timeStr) ? timeStr : fallback;
  return new Date(`${dateStr}T${t}:00`);
}

/** Has the booking checked-in datetime arrived? */
export function isAfterCheckIn(checkInDate: string, checkInTime?: string): boolean {
  return Date.now() >= combineDateTime(checkInDate, checkInTime, "15:00").getTime();
}

/** Has the booking checked-out datetime passed? */
export function isAfterCheckOut(checkOutDate: string, checkOutTime?: string): boolean {
  return Date.now() >= combineDateTime(checkOutDate, checkOutTime, "11:00").getTime();
}

/** Is the current time within 12 hours of (or past) the check-in datetime? */
export function isWithinCredentialWindow(checkInDate: string, checkInTime?: string): boolean {
  const checkIn = combineDateTime(checkInDate, checkInTime, "15:00").getTime();
  const twelveHoursBefore = checkIn - 12 * 60 * 60 * 1000;
  return Date.now() >= twelveHoursBefore;
}
