-- Prelazimo sa sati na minute da bismo podržali preciznije podsetike (npr. 30 minuta)
ALTER TABLE scheduled_tasks
  ALTER COLUMN remind_before_hours TYPE integer
  USING (remind_before_hours * 60);

ALTER TABLE scheduled_tasks
  RENAME COLUMN remind_before_hours TO remind_before_minutes;
