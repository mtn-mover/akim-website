-- Tracking-Felder für inquiries Tabelle hinzufügen
-- Ausführen in Neon Console falls nicht bereits vorhanden

ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS browser_language VARCHAR(20);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS timezone VARCHAR(100);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS referrer TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS form_timestamp TIMESTAMP;

-- Überprüfung
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'inquiries'
ORDER BY ordinal_position;
