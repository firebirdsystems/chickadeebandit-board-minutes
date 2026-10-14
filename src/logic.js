import { isAdult } from "./shared.js";
export { isAdult };

export const VOTE_VALUES = ["yea", "nay", "abstain"];

export const MOTION_OUTCOMES = [
  { value: "open",      label: "Open" },
  { value: "carried",   label: "Carried" },
  { value: "failed",    label: "Failed" },
  { value: "tabled",    label: "Tabled" },
  { value: "withdrawn", label: "Withdrawn" },
];

export function outcomeLabel(value) {
  return MOTION_OUTCOMES.find((o) => o.value === value)?.label ?? value;
}

// ── Board gate ─────────────────────────────────────────────────────────────────
// Mirrors the hub's `memberInAppGroupSetting`: privileged IFF a board group is
// configured, still exists, and the caller is in it. NO "all adults" fallback —
// meetings are write_privileged_only and motions/votes are insert_privileged_only,
// all of which the hub rejects entirely when no group is set.
// (See __tests__/helpers/privileged-gate.mjs.)
export function isBoard(member, groups, boardGroupId) {
  if (!member || !boardGroupId) return false;
  const g = (groups ?? []).find((x) => x.id === boardGroupId);
  return !!g && g.memberIds.includes(member.id);
}

// A meeting is immutable once adopted.
export function isAdopted(meeting) {
  return meeting.status === "adopted";
}

// Share offers a link only on adopted minutes. The hub mints on any existing
// row, but the public page enforces `visible_where` (status = "adopted") on
// read, so a link minted on a draft would open to nothing until adoption.
export function canShareMeeting(meeting) {
  return !!meeting && meeting.status === "adopted";
}

// A meeting is editable only while a draft AND the caller is on the board.
export function canEditMeeting(meeting, member, groups, boardGroupId) {
  return !isAdopted(meeting) && isBoard(member, groups, boardGroupId);
}

// ── Vote tallies ───────────────────────────────────────────────────────────────
// Votes are rows { id, motion_id, voter_id, vote }.

export function votesForMotion(votes, motionId) {
  return votes.filter((v) => v.motion_id === motionId);
}

export function tally(votes, motionId) {
  const t = { yea: 0, nay: 0, abstain: 0 };
  for (const v of votesForMotion(votes, motionId)) {
    if (t[v.vote] !== undefined) t[v.vote] += 1;
  }
  return t;
}

export function myVote(votes, motionId, memberId) {
  return votes.find((v) => v.motion_id === motionId && v.voter_id === memberId) ?? null;
}

// Simple-majority decision suggestion from a tally (abstentions don't count).
export function suggestedOutcome(t) {
  if (t.yea === 0 && t.nay === 0) return "open";
  return t.yea > t.nay ? "carried" : t.yea < t.nay ? "failed" : "open";
}

/**
 * Fields the in-app search matches against (see hub-sdk `searchMatch`).
 * Location, attendees and the body of the notes all count — minutes
 * are looked up by "who was there" and "what was discussed" far more
 * often than by whatever the meeting was titled.
 */
export function searchableFields(item) {
  return [item.title, item.meeting_date, item.location, item.attendees, item.notes];
}

/**
 * The line a failed write shows ("Refused, gone, or failed" in the app-template guide):
 * "try again" only when retrying can work. `thing` and `action` are the app's own nouns
 * ("motion", "update the motion"). `found` is the caller's re-read after a write that
 * changed nothing (or a 404/409): false = the row is gone, true = it is there in another
 * state. A `forUser` error keeps the message the app wrote for it. Never shows hub text.
 */
export function failureLine(e, { action, thing, found } = {}) {
  if (e?.forUser) return e.message;
  if (e?.code === "UNIQUE_CONSTRAINT" || /UNIQUE constraint failed/i.test(String(e?.message ?? ""))) return `That ${thing} already exists.`;
  if (e?.status === 403) return `You don’t have permission to ${action}.`;
  if (e?.status === 507) return "The household’s storage is full — free up space first.";
  if (found === false || (found === undefined && e?.status === 404)) return `This ${thing} has been removed.`;
  if (found === true || e?.status === 409 || e?.status === 404) return `This ${thing} was changed by someone else — check it first.`;
  return `Couldn’t ${action} — try again.`;
}

/**
 * A `WHERE id = ?` write to the minutes that changed nothing, after the re-read:
 *   reread  — false when the re-read itself failed (the outcome is unknown: "try again")
 *   found   — the row is still there
 *   adopted — its minutes are adopted now (frozen: their state moved under this write)
 * A row still there on a draft means the hub narrowed the write away from this member.
 */
export function unchangedLine({ reread, found, adopted }, words) {
  if (!reread) return failureLine(null, words);
  if (!found) return failureLine(null, { ...words, found: false });
  if (adopted) return failureLine(null, { ...words, found: true });
  return failureLine({ status: 403 }, words);
}
