import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { describe, it, expect } from "vitest";
import { MOTION_OUTCOMES, canShareMeeting } from "../src/logic.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(__dirname, "../manifest.json"), "utf-8"));
const page = readFileSync(join(__dirname, "../src/index.html"), "utf-8");

const item = manifest.shareable?.meeting;

/**
 * A share link is an anonymous read that skips row policies, so the declared
 * columns are the whole public surface. Adopted minutes are already the
 * official record; what stays in the app is who moved, seconded and voted.
 */
describe("shareable.meeting", () => {
  it("anchors on the meetings table by id", () => {
    expect(Object.keys(manifest.shareable)).toEqual(["meeting"]);
    expect(item.table).toBe("meetings");
    expect(item.id_column ?? "id").toBe("id");
    expect(item.title_column).toBe("title");
  });

  it("projects the meeting's date, place, attendees, minutes and adoption date", () => {
    expect(item.columns.map((c) => c.column)).toEqual(["meeting_date", "location", "attendees", "notes", "adopted_at"]);
  });

  it("feeds each motion's text and outcome, keyed on meeting_id", () => {
    expect(item.feed.table).toBe("motions");
    expect(item.feed.fk_column).toBe("meeting_id");
    expect(item.feed.columns.map((c) => c.column)).toEqual(["text", "outcome"]);
  });

  // moved_by and seconded_by hold MEMBER IDS, not names: outside the
  // household they identify nobody and only let links be correlated. Votes
  // are per-member by design, so the table never reaches the page.
  it("never reads who moved, seconded, recorded or voted", () => {
    const text = JSON.stringify(item);
    for (const col of ["moved_by", "seconded_by", "recorded_by", "voter_id", "created_by"]) {
      expect(text).not.toContain(`"${col}"`);
    }
    expect(text).not.toContain('"votes"');
    expect(item.aggregates).toBeUndefined();
  });

  it("labels outcomes exactly as the app does", () => {
    const outcome = item.feed.columns.find((c) => c.column === "outcome");
    expect(outcome.value_labels).toEqual(Object.fromEntries(MOTION_OUTCOMES.map((o) => [o.value, o.label])));
  });

  // Motions are ordered in SQL; an encrypted sort key orders by ciphertext.
  // sort_order and status are plaintext without a declaration: both are in the
  // hub's BUILTIN_APP_DB_PLAINTEXT_COLS (packages/hub/src/cloudflare/manifest-common.ts).
  it("orders motions by the plaintext sort_order, first motion first", () => {
    const BUILTIN_PLAINTEXT = ["status", "sort_order"];
    const plaintext = (c) => BUILTIN_PLAINTEXT.includes(c) || (manifest.db_plaintext_columns ?? []).includes(c);
    expect(item.feed.order_column).toBe("sort_order");
    expect(item.feed.order).toBe("oldest");
    expect(plaintext(item.feed.order_column)).toBe(true);
    expect(plaintext(item.visible_where.column)).toBe(true);
  });

  // The hub mints on any existing row; this filter only applies when the
  // page is read, which is why the UI gates Share on canShareMeeting too.
  it("shows adopted minutes only", () => {
    expect(item.visible_where).toEqual({ column: "status", values: ["adopted"] });
  });

  it("is read-only and is the item type the page mints", () => {
    expect(item.submit).toBeUndefined();
    expect(item.files).toBeUndefined();
    expect(page).toMatch(/itemType:\s*"meeting"/);
  });

  it("tells the sharer who moved, seconded and voted stays here", () => {
    const scope = page.match(/scopeHtml:\s*\(\)\s*=>\s*"([^"]+)"/)?.[1] ?? "";
    expect(scope).toMatch(/Who moved or seconded a motion and how each member voted stay here/);
  });

  it("offers Share only through the adopted-minutes gate", () => {
    expect(page).toMatch(/CAN_SHARE && canShareMeeting\(meeting\)/);
    expect(page).toContain('data-testid="meeting-share"');
  });
});

describe("canShareMeeting", () => {
  it("allows adopted minutes", () => {
    expect(canShareMeeting({ id: "m1", status: "adopted" })).toBe(true);
  });

  // A draft link would mint fine and then open to nothing until adoption.
  it("refuses drafts, unknown statuses and missing meetings", () => {
    expect(canShareMeeting({ id: "m1", status: "draft" })).toBe(false);
    expect(canShareMeeting({ id: "m1" })).toBe(false);
    expect(canShareMeeting({ id: "m1", status: "Adopted" })).toBe(false);
    expect(canShareMeeting(null)).toBe(false);
    expect(canShareMeeting(undefined)).toBe(false);
  });
});
