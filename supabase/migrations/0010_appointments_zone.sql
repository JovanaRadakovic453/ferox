-- Dodavanje zone_id u appointments tabelu
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES zones(id) ON DELETE SET NULL;
