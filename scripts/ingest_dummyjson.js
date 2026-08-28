require('dotenv').config({ path: __dirname + '/../.env' });
const { Pool } = require('pg');
const { GoogleGenAI } = require('@google/genai');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchProducts(url) {
    console.log(`Fetching from ${url}...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return data.products;
}

async function main() {
    console.log('Connecting to database...');
    try {
        await pool.query('TRUNCATE TABLE products');
        console.log('Cleared existing products.');

        const products = await fetchProducts('https://dummyjson.com/products?limit=100');
        
        console.log(`Fetched ${products.length} products to ingest.`);

        for (const p of products) {
            const title = p.title || p.name || '';
            const brand = p.brand || '';
            const description = p.description || '';
            
            const textToEmbed = `Product: ${title}\nBrand: ${brand}\nDescription: ${description}`;
            console.log(`Generating embedding for ${title}...`);
            
            try {
                const embeddingResult = await ai.models.embedContent({
                    model: 'gemini-embedding-2',
                    contents: textToEmbed,
                    config: { outputDimensionality: 768 }
                });
                
                const vector = embeddingResult.embeddings[0].values;
                const vectorString = `[${vector.join(',')}]`;
                
                // Convert USD to INR
                const priceInINR = Math.round(p.price * 80);
                const stock = p.stock || 0;
                const imageUrl = p.thumbnail || null;
                const rating = p.rating || null;
                const category = p.category || '';
                const warrantyInfo = p.warrantyInformation || '';
                const shippingInfo = p.shippingInformation || '';
                const reviews = p.reviews ? JSON.stringify(p.reviews) : '[]';

                await pool.query(
                    'INSERT INTO products (name, brand, category, description, price, stock, image_url, rating, warranty_information, shipping_information, reviews, embedding) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
                    [title, brand, category, description, priceInINR, stock, imageUrl, rating, warrantyInfo, shippingInfo, reviews, vectorString]
                );
                
                console.log(`✅ Successfully ingested: ${title}`);
                
                await delay(1000); // rate limiting
            } catch (err) {
                console.error(`❌ Failed to ingest ${title}:`, err.message);
            }
        }
        
        console.log('Ingestion completed successfully.');
    } catch (err) {
        console.error('Ingestion error:', err);
    } finally {
        await pool.end();
    }
}

main();
