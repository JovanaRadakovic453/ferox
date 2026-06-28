-- Add optional deadline_date to scheduled_tasks
ALTER TABLE scheduled_tasks
  ADD COLUMN IF NOT EXISTS deadline_date date DEFAULT NULL;
