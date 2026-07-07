SELECT
  motion_id,
  vote,
  COUNT(*) AS count
FROM app_board_minutes__votes
GROUP BY motion_id, vote
ORDER BY motion_id ASC, vote ASC
LIMIT 500
