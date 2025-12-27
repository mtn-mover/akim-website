-- RAG Produkte Tabelle für AKIM Chatbot
-- Führe dieses SQL in der Neon-Konsole aus: https://console.neon.tech

-- Tabelle erstellen
CREATE TABLE IF NOT EXISTS rag_products (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    series VARCHAR(50),
    rated_torque_nm INTEGER,
    max_torque_nm INTEGER,
    description_de TEXT,
    description_en TEXT,
    applications TEXT[], -- Array von Anwendungen
    features TEXT[], -- Array von Features
    is_synced BOOLEAN DEFAULT FALSE, -- Wurde zu Pinecone synchronisiert?
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index für schnelle Suche
CREATE INDEX IF NOT EXISTS idx_rag_products_category ON rag_products(category);
CREATE INDEX IF NOT EXISTS idx_rag_products_series ON rag_products(series);
CREATE INDEX IF NOT EXISTS idx_rag_products_torque ON rag_products(rated_torque_nm);

-- Trigger für automatisches updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_rag_products_updated_at ON rag_products;
CREATE TRIGGER update_rag_products_updated_at
    BEFORE UPDATE ON rag_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
