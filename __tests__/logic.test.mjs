import { describe, it, expect } from "vitest";
import {
  outcomeLabel, isBoard, isAdopted, canEditMeeting,
  tally, myVote, votesForMotion, suggestedOutcome,
} from "../src/logic.js";
import { testPrivilegedGateContract } from "./helpers/privileged-gate.mjs";

const GROUPS = [{ id: "g-board", name: "Board", memberIds: ["m-b1", "m-b2"] }];

describe("motion outcomes", () => {
  it("labels known outcomes", () => {
    expect(outcomeLabel("carried")).toBe("Carried");
    expect(outcomeLabel("tabled")).toBe("Tabled");
  });
});

describe("meeting lifecycle", () => {
  const draft = { id: "m1", status: "draft" };
  const adopted = { id: "m2", status: "adopted" };
  it("isAdopted reflects status", () => {
    expect(isAdopted(adopted)).toBe(true);
    expect(isAdopted(draft)).toBe(false);
  });
  it("board can edit a draft but not an adopted meeting", () => {
    expect(canEditMeeting(draft, { id: "m-b1" }, GROUPS, "g-board")).toBe(true);
    expect(canEditMeeting(adopted, { id: "m-b1" }, GROUPS, "g-board")).toBe(false);
  });
  it("non-board cannot edit even a draft", () => {
    expect(canEditMeeting(draft, { id: "m-other" }, GROUPS, "g-board")).toBe(false);
  });
});

describe("vote tallies", () => {
  const votes = [
    { id: "v1", motion_id: "mo1", voter_id: "m-b1", vote: "yea" },
    { id: "v2", motion_id: "mo1", voter_id: "m-b2", vote: "nay" },
    { id: "v3", motion_id: "mo1", voter_id: "m-b3", vote: "abstain" },
    { id: "v4", motion_id: "mo2", voter_id: "m-b1", vote: "yea" },
  ];
  it("counts by outcome", () => {
    expect(tally(votes, "mo1")).toEqual({ yea: 1, nay: 1, abstain: 1 });
    expect(tally(votes, "mo2")).toEqual({ yea: 1, nay: 0, abstain: 0 });
    expect(tally(votes, "none")).toEqual({ yea: 0, nay: 0, abstain: 0 });
  });
  it("finds the caller's own vote", () => {
    expect(myVote(votes, "mo1", "m-b1").vote).toBe("yea");
    expect(myVote(votes, "mo1", "m-x")).toBeNull();
  });
  it("votesForMotion filters", () => {
    expect(votesForMotion(votes, "mo1")).toHaveLength(3);
  });
  it("suggests an outcome from a simple majority (abstentions ignored)", () => {
    expect(suggestedOutcome({ yea: 3, nay: 1, abstain: 2 })).toBe("carried");
    expect(suggestedOutcome({ yea: 1, nay: 3, abstain: 0 })).toBe("failed");
    expect(suggestedOutcome({ yea: 2, nay: 2, abstain: 0 })).toBe("open");
    expect(suggestedOutcome({ yea: 0, nay: 0, abstain: 4 })).toBe("open");
  });
});

// The board gate fronts write_privileged_only / insert_privileged_only tables —
// it must mirror the hub's group resolution with no adult fallback.
testPrivilegedGateContract("isBoard", isBoard, {
  member:   { id: "m-b1",    role: "adult" },
  outsider: { id: "m-other", role: "adult" },
  groups:   GROUPS,
  groupId:  "g-board",
});
