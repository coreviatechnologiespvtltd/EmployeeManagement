-- Official check-in window: 10:00 AM start with a 15 minute grace period, so
-- 10:15 AM is still On Time and 10:16 AM is the first Late minute.
--
-- `company_settings.value` is jsonb, hence to_jsonb('10:00'::text) rather than a
-- bare literal.

UPDATE company_settings
   SET value = to_jsonb('10:00'::text)
 WHERE key = 'workday_start';

-- Re-derive every stored status that the new window changes.
--
-- Reading already recomputes the status from the check-in, so this is not
-- needed for the UI to be correct. It is here so the persisted column stops
-- disagreeing with the check-in times, which matters for anyone querying
-- attendance_records directly.
--
-- The cutoff is resolved in UTC minutes because check_in is a timestamptz and
-- the rule is defined in the server's local time; `offset_minutes` converts the
-- 10:15 AM local cutoff into the equivalent UTC minutes-of-day.
DO $$
DECLARE
  offset_minutes integer := (EXTRACT(TIMEZONE FROM now()) / 60)::integer;
  cutoff_utc     integer := MOD(615 - offset_minutes, 1440);
BEGIN
  UPDATE attendance_records
     SET status = CASE
           WHEN (EXTRACT(HOUR FROM check_in AT TIME ZONE 'UTC')::integer * 60
                 + EXTRACT(MINUTE FROM check_in AT TIME ZONE 'UTC')::integer) > cutoff_utc
             THEN 'late'
           ELSE 'present'
         END,
         updated_at = now()
   WHERE check_in IS NOT NULL
     -- Day-level statuses are admin decisions about the day, not consequences
     -- of an arrival time, so they are left untouched.
     AND status IN ('present', 'late');
END $$;