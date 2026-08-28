require('dotenv').config({ path: __dirname + '/../.env' });
const { Pool } = require('pg');
const { GoogleGenAI } = require('@google/genai');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    console.log('Connecting to database...');
    try {
        // Fetch products missing embeddings
        const result = await pool.query('SELECT id, name, description FROM products WHERE embedding IS NULL');
        
        if (result.rows.length === 0) {
            console.log('No products found that need embeddings.');
            process.exit(0);
        }

        console.log(`Found ${result.rows.length} products to embed.`);

        for (const product of result.rows) {
            const textToEmbed = `Product: ${product.name}\nDescription: ${product.description}`;
            console.log(`Generating embedding for Product ID ${product.id}: ${product.name}...`);
            
            try {
                const embeddingResult = await ai.models.embedContent({
                    model: 'gemini-embedding-2',
                    contents: textToEmbed,
                    config: { outputDimensionality: 768 }
                });
                
                const vector = embeddingResult.embeddings[0].values;
                
                // Format the array into a vector string format expected by pgvector: '[v1, v2, ...]'
                const vectorString = `[${vector.join(',')}]`;
                
                await pool.query(
                    'UPDATE products SET embedding = $1 WHERE id = $2',
                    [vectorString, product.id]
                );
                
                console.log(`✅ Successfully updated Product ID ${product.id}`);
                
                // Delay to respect API rate limits
                await delay(1000);
            } catch (err) {
                console.error(`❌ Failed to embed Product ID ${product.id}:`, err.message);
            }
        }
        
        console.log('All embeddings completed successfully.');
    } catch (err) {
        console.error('Database connection error:', err);
    } finally {
        await pool.end();
    }
}

main();
