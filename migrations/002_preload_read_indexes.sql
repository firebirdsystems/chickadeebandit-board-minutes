-- Index the manifest `preload` read, which the hub runs server-side while
-- rendering this app's document — on every launch, for every household.
--
-- Both preload reads sorted their whole table under a LIMIT. meeting_date is a
-- *_date column and sort_order a number, so both are plaintext at rest and an
-- index over them orders the real values rather than ciphertext.
CREATE INDEX IF NOT EXISTS app_board_minutes__meetings_date_idx
  ON app_board_minutes__meetings (meeting_date DESC);
CREATE INDEX IF NOT EXISTS app_board_minutes__motions_sort_idx
  ON app_board_minutes__motions (sort_order ASC);
