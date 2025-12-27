// AKIM RAG Module - Vercel Serverless Function
// Handles embedding creation and vector search with Pinecone
//
// Environment Variables required:
// - OPENAI_API_KEY: OpenAI API key for embeddings
// - PINECONE_API_KEY: Pinecone API key
// - PINECONE_INDEX: Pinecone index name (e.g., "akim-products")

const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');

// Initialize clients
let pinecone = null;
let openai = null;

function initClients() {
  if (!pinecone) {
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
  }
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return { pinecone, openai };
}

// Create embedding for text using OpenAI
async function createEmbedding(text) {
  const { openai } = initClients();

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1536
  });

  return response.data[0].embedding;
}

// Upsert document to Pinecone
async function upsertDocument(doc) {
  const { pinecone } = initClients();
  const index = pinecone.index(process.env.PINECONE_INDEX);

  // Create searchable text from document
  const searchText = [
    doc.name,
    doc.category,
    doc.series,
    doc.description_de,
    doc.description_en,
    (doc.applications || []).join(', '),
    (doc.features || []).join(', '),
    `${doc.rated_torque_nm} Nm Nenndrehmoment`,
    `${doc.max_torque_nm} Nm Maximaldrehmoment`
  ].filter(Boolean).join(' | ');

  // Create embedding
  const embedding = await createEmbedding(searchText);

  // Upsert to Pinecone
  await index.upsert([{
    id: doc.id,
    values: embedding,
    metadata: {
      name: doc.name,
      category: doc.category,
      series: doc.series,
      rated_torque_nm: doc.rated_torque_nm,
      max_torque_nm: doc.max_torque_nm,
      description_de: doc.description_de,
      description_en: doc.description_en,
      applications: doc.applications || [],
      features: doc.features || [],
      searchText: searchText.substring(0, 1000) // Truncate for metadata limit
    }
  }]);

  return { success: true, id: doc.id };
}

// Delete document from Pinecone
async function deleteDocument(docId) {
  const { pinecone } = initClients();
  const index = pinecone.index(process.env.PINECONE_INDEX);

  await index.deleteOne(docId);

  return { success: true, id: docId };
}

// Search for similar documents
async function searchDocuments(query, topK = 5, language = 'de') {
  const { pinecone } = initClients();
  const index = pinecone.index(process.env.PINECONE_INDEX);

  // Create embedding for query
  const queryEmbedding = await createEmbedding(query);

  // Search in Pinecone
  const results = await index.query({
    vector: queryEmbedding,
    topK: topK,
    includeMetadata: true
  });

  // Format results
  return results.matches.map(match => ({
    id: match.id,
    score: match.score,
    name: match.metadata.name,
    category: match.metadata.category,
    series: match.metadata.series,
    rated_torque_nm: match.metadata.rated_torque_nm,
    max_torque_nm: match.metadata.max_torque_nm,
    description: language === 'en' ? match.metadata.description_en : match.metadata.description_de,
    applications: match.metadata.applications,
    features: match.metadata.features
  }));
}

// Get all documents from Pinecone (list IDs)
async function listDocuments() {
  const { pinecone } = initClients();
  const index = pinecone.index(process.env.PINECONE_INDEX);

  // Pinecone doesn't have a direct "list all" - we use describe_index_stats
  const stats = await index.describeIndexStats();

  return {
    totalVectors: stats.totalRecordCount,
    namespaces: stats.namespaces
  };
}

// Bulk upsert all documents from products.json
async function bulkUpsert(documents) {
  const results = [];

  for (const doc of documents) {
    try {
      await upsertDocument(doc);
      results.push({ id: doc.id, success: true });
    } catch (error) {
      results.push({ id: doc.id, success: false, error: error.message });
    }
  }

  return results;
}

// Export functions for use in other modules
module.exports = {
  createEmbedding,
  upsertDocument,
  deleteDocument,
  searchDocuments,
  listDocuments,
  bulkUpsert,
  initClients
};
