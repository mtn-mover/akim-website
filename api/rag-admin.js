// AKIM RAG Admin API - Vercel Serverless Function
// CRUD Operations for RAG documents - Datenbank-basiert
//
// Endpoints:
// GET    ?action=products     - Alle Produkte aus DB laden
// GET    ?action=stats        - Pinecone Stats
// GET    ?action=search       - RAG-Suche testen
// POST   ?action=save         - Produkt speichern (create/update)
// POST   ?action=bulk         - Alle Produkte zu Pinecone sync
// POST   ?action=import       - JSON-Produkte in DB importieren
// DELETE ?id=xxx              - Produkt löschen

const { neon } = require('@neondatabase/serverless');
const rag = require('./rag');

// Fallback: Initiale Produktdaten aus JSON (für Import)
let initialProducts = [];
try {
  initialProducts = require('../data/products.json');
} catch (e) {
  console.log('No initial products.json found');
}

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Auth deaktiviert - Seite ist nicht öffentlich verlinkt
  // Falls du später Auth willst: ADMIN_API_KEY in Vercel setzen

  // Datenbankverbindung
  const sql = neon(process.env.POSTGRES_URL);

  try {
    switch (req.method) {
      case 'GET':
        await handleGet(req, res, sql);
        break;
      case 'POST':
        await handlePost(req, res, sql);
        break;
      case 'DELETE':
        await handleDelete(req, res, sql);
        break;
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('RAG Admin API error:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET: Produkte laden, Stats, Suche
async function handleGet(req, res, sql) {
  const { action, query, topK = 5 } = req.query;

  if (action === 'stats') {
    // Pinecone Stats
    const stats = await rag.listDocuments();
    // Auch DB-Count hinzufügen
    const dbCount = await sql`SELECT COUNT(*) as count FROM rag_products`;
    const syncedCount = await sql`SELECT COUNT(*) as count FROM rag_products WHERE is_synced = true`;

    res.status(200).json({
      pinecone: stats,
      database: {
        totalProducts: parseInt(dbCount[0].count),
        syncedProducts: parseInt(syncedCount[0].count)
      }
    });
  } else if (action === 'products') {
    // Alle Produkte aus DB laden
    const products = await sql`
      SELECT * FROM rag_products
      ORDER BY category, name
    `;

    // Arrays konvertieren (PostgreSQL gibt sie als Strings zurück bei neon)
    const formattedProducts = products.map(p => ({
      ...p,
      applications: p.applications || [],
      features: p.features || []
    }));

    res.status(200).json(formattedProducts);
  } else if (action === 'search') {
    // RAG-Suche testen
    if (!query) {
      res.status(400).json({ error: 'Query parameter required' });
      return;
    }
    const results = await rag.searchDocuments(query, parseInt(topK));
    res.status(200).json(results);
  } else {
    // Default: Stats
    const stats = await rag.listDocuments();
    res.status(200).json(stats);
  }
}

// POST: Produkt speichern, Bulk-Sync, Import
async function handlePost(req, res, sql) {
  const { action } = req.query;

  if (action === 'save') {
    // Einzelnes Produkt speichern (Create oder Update)
    const product = req.body;

    if (!product || !product.id || !product.name) {
      res.status(400).json({ error: 'Product with id and name required' });
      return;
    }

    // Upsert in DB
    await sql`
      INSERT INTO rag_products (
        id, name, category, series,
        rated_torque_nm, max_torque_nm,
        description_de, description_en,
        applications, features,
        is_synced
      ) VALUES (
        ${product.id},
        ${product.name},
        ${product.category || null},
        ${product.series || null},
        ${product.rated_torque_nm || null},
        ${product.max_torque_nm || null},
        ${product.description_de || null},
        ${product.description_en || null},
        ${product.applications || []},
        ${product.features || []},
        false
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        series = EXCLUDED.series,
        rated_torque_nm = EXCLUDED.rated_torque_nm,
        max_torque_nm = EXCLUDED.max_torque_nm,
        description_de = EXCLUDED.description_de,
        description_en = EXCLUDED.description_en,
        applications = EXCLUDED.applications,
        features = EXCLUDED.features,
        is_synced = false,
        updated_at = NOW()
    `;

    res.status(200).json({ success: true, id: product.id, message: 'Product saved' });

  } else if (action === 'sync') {
    // Einzelnes Produkt zu Pinecone synchronisieren
    const { id } = req.body;

    if (!id) {
      res.status(400).json({ error: 'Product id required' });
      return;
    }

    // Produkt aus DB laden
    const products = await sql`SELECT * FROM rag_products WHERE id = ${id}`;
    if (products.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const product = products[0];

    // Zu Pinecone synchronisieren
    await rag.upsertDocument({
      id: product.id,
      name: product.name,
      category: product.category,
      series: product.series,
      rated_torque_nm: product.rated_torque_nm,
      max_torque_nm: product.max_torque_nm,
      description_de: product.description_de,
      description_en: product.description_en,
      applications: product.applications || [],
      features: product.features || []
    });

    // Als synchronisiert markieren
    await sql`UPDATE rag_products SET is_synced = true WHERE id = ${id}`;

    res.status(200).json({ success: true, id, message: 'Product synced to Pinecone' });

  } else if (action === 'bulk') {
    // Alle Produkte zu Pinecone synchronisieren
    const products = await sql`SELECT * FROM rag_products`;

    const results = [];
    for (const product of products) {
      try {
        await rag.upsertDocument({
          id: product.id,
          name: product.name,
          category: product.category,
          series: product.series,
          rated_torque_nm: product.rated_torque_nm,
          max_torque_nm: product.max_torque_nm,
          description_de: product.description_de,
          description_en: product.description_en,
          applications: product.applications || [],
          features: product.features || []
        });

        await sql`UPDATE rag_products SET is_synced = true WHERE id = ${product.id}`;
        results.push({ id: product.id, success: true });
      } catch (error) {
        results.push({ id: product.id, success: false, error: error.message });
      }
    }

    const successful = results.filter(r => r.success).length;
    res.status(200).json({
      message: `Bulk sync completed: ${successful}/${products.length} successful`,
      results
    });

  } else if (action === 'import') {
    // JSON-Produkte in DB importieren
    const { products } = req.body;
    const productsToImport = products || initialProducts;

    if (!productsToImport || productsToImport.length === 0) {
      res.status(400).json({ error: 'No products to import' });
      return;
    }

    let imported = 0;
    let errors = [];

    for (const product of productsToImport) {
      try {
        await sql`
          INSERT INTO rag_products (
            id, name, category, series,
            rated_torque_nm, max_torque_nm,
            description_de, description_en,
            applications, features,
            is_synced
          ) VALUES (
            ${product.id},
            ${product.name},
            ${product.category || null},
            ${product.series || null},
            ${product.rated_torque_nm || null},
            ${product.max_torque_nm || null},
            ${product.description_de || null},
            ${product.description_en || null},
            ${product.applications || []},
            ${product.features || []},
            false
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            series = EXCLUDED.series,
            rated_torque_nm = EXCLUDED.rated_torque_nm,
            max_torque_nm = EXCLUDED.max_torque_nm,
            description_de = EXCLUDED.description_de,
            description_en = EXCLUDED.description_en,
            applications = EXCLUDED.applications,
            features = EXCLUDED.features,
            updated_at = NOW()
        `;
        imported++;
      } catch (error) {
        errors.push({ id: product.id, error: error.message });
      }
    }

    res.status(200).json({
      message: `Import completed: ${imported}/${productsToImport.length} products`,
      errors: errors.length > 0 ? errors : undefined
    });

  } else {
    res.status(400).json({ error: 'Unknown action. Use: save, sync, bulk, or import' });
  }
}

// DELETE: Produkt löschen
async function handleDelete(req, res, sql) {
  const { id } = req.query;

  if (!id) {
    res.status(400).json({ error: 'Product id required' });
    return;
  }

  // Aus DB löschen
  await sql`DELETE FROM rag_products WHERE id = ${id}`;

  // Aus Pinecone löschen
  try {
    await rag.deleteDocument(id);
  } catch (error) {
    console.error('Pinecone delete error:', error.message);
  }

  res.status(200).json({ success: true, id, message: 'Product deleted' });
}
