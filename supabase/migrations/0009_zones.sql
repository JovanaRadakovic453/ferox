-- Zones: oblasti koje korisnik prati (Posao, Zdravlje, Lično...)
CREATE TABLE zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  icon text NOT NULL DEFAULT '📁',
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own zones" ON zones
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_zones_user ON zones(user_id, position);

-- Opciona veza zadataka sa zonom
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES zones(id) ON DELETE SET NULL;
ALTER TABLE scheduled_tasks ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES zones(id) ON DELETE SET NULL;
