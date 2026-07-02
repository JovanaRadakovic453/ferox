-- Menjamo remind_before iz fiksnih opcija (text) u slobodan broj sati (integer)
ALTER TABLE scheduled_tasks
  DROP CONSTRAINT IF EXISTS scheduled_tasks_remind_before_check;

ALTER TABLE scheduled_tasks
  ALTER COLUMN remind_before TYPE integer
  USING (
    CASE remind_before
      WHEN 'day_before' THEN 24
      WHEN 'morning'    THEN 8
      ELSE NULL
    END
  );

ALTER TABLE scheduled_tasks
  RENAME COLUMN remind_before TO remind_before_hours;
