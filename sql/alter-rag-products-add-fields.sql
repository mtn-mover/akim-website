-- Neue technische Felder für rag_products Tabelle
-- Ausführen in Neon Console

ALTER TABLE rag_products
ADD COLUMN IF NOT EXISTS inertia_kgcm2 DECIMAL(10,4),           -- Massenträgheit in kgcm²
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(10,2),               -- Gewicht in kg
ADD COLUMN IF NOT EXISTS backlash_arcmin DECIMAL(10,2),         -- Verdrehspiel in Bogenminuten
ADD COLUMN IF NOT EXISTS ratio_range VARCHAR(50),               -- Übersetzungsbereich z.B. "13-87:1"
ADD COLUMN IF NOT EXISTS max_input_speed_rpm INTEGER,           -- Max. Eingangsdrehzahl in min⁻¹
ADD COLUMN IF NOT EXISTS efficiency_percent DECIMAL(5,2);       -- Wirkungsgrad in %

-- Überprüfung
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'rag_products'
ORDER BY ordinal_position;
