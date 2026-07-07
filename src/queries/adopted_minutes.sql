SELECT
  id,
  title,
  meeting_date,
  location,
  attendees,
  notes,
  status,
  adopted_at
FROM app_board_minutes__meetings
WHERE status = 'adopted'
ORDER BY meeting_date DESC
LIMIT 200
