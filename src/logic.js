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
