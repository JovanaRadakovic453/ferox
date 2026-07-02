CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  type text NOT NULL DEFAULT 'light',
  note text NOT NULL DEFAULT '',
  for_date date NOT NULL,
  done boolean NOT NULL DEFAULT false,
  remind_before text DEFAULT NULL CHECK (remind_before IN ('day_before', 'morning')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_user_date ON scheduled_tasks(user_id, for_date);

ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own scheduled tasks" ON scheduled_tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
