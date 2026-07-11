-- One row per board meeting's minutes. Written ONLY by the configured board group
-- (owner_or_visibility + write_privileged_only). Drafts are visible to the board
-- (privileged_values 'draft'); adopted minutes are visible to everyone
-- (everyone_values 'adopted'). Once adopted, the row is frozen (frozen_when) so
-- the record is immutable. `status` is plaintext (encryption skip-list).
CREATE TABLE IF NOT EXISTS app_board_minutes__meetings (
  id           TEXT NOT NULL,
  title        TEXT NOT NULL DEFAULT '',
  meeting_date TEXT NOT NULL,
  location     TEXT NOT NULL DEFAULT '',
  attendees    TEXT NOT NULL DEFAULT '',
  notes        TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'draft',   -- draft | adopted
  created_by   TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  adopted_at   TEXT,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS app_board_minutes__meetings_status_idx
  ON app_board_minutes__meetings (status, meeting_date);

-- Structured motions belonging to a meeting. Inherit the meeting's visibility;
-- only the board may create them (insert_privileged_only), and they freeze when
-- the parent meeting is adopted (frozen_when reads meetings.status). `outcome` is
-- plaintext so it can be filtered/tallied.
CREATE TABLE IF NOT EXISTS app_board_minutes__motions (
  id           TEXT NOT NULL,
  meeting_id   TEXT NOT NULL,
  text         TEXT NOT NULL DEFAULT '',
  moved_by     TEXT NOT NULL DEFAULT '',
  seconded_by  TEXT NOT NULL DEFAULT '',
  outcome      TEXT NOT NULL DEFAULT 'open',   -- open | carried | failed | tabled | withdrawn
  sort_order   INTEGER NOT NULL DEFAULT 0,
  recorded_by  TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (meeting_id) REFERENCES app_board_minutes__meetings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS app_board_minutes__motions_meeting_idx
  ON app_board_minutes__motions (meeting_id, sort_order);

-- Recorded roll-call votes: one per board member per motion (max_per_member).
-- Each board member records their OWN vote (writer_column voter_id is forced to
-- the caller). Votes inherit the meeting's visibility and freeze on adoption.
-- `vote` is plaintext so the tally can be computed in SQL.
CREATE TABLE IF NOT EXISTS app_board_minutes__votes (
  id          TEXT NOT NULL,
  meeting_id  TEXT NOT NULL,
  motion_id   TEXT NOT NULL,
  voter_id    TEXT NOT NULL,
  vote        TEXT NOT NULL,   -- yea | nay | abstain
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS app_board_minutes__votes_motion_idx
  ON app_board_minutes__votes (motion_id, voter_id);
CREATE INDEX IF NOT EXISTS app_board_minutes__votes_meeting_idx
  ON app_board_minutes__votes (meeting_id);

-- key/value settings: board_group_id. Written only by the admin-gated
-- /api/admin-config endpoint (app_config policy).
CREATE TABLE IF NOT EXISTS app_board_minutes__settings (
  key    TEXT NOT NULL,
  value  TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (key)
);
