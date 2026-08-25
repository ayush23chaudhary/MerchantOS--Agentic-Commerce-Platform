require('dotenv').config();
const express = require('express');
const { z } = require('zod');
const { Pool } = require('pg');
const Razorpay = require('razorpay');
const { handleChat } = require('./agent');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

app.use(express.json());

// Tier 1 - The Fast Intent Router (Redis Exact Match)
const semanticRouter = (req, res, next) => {
    const { message } = req.body;
    if (!message) return next();
    
    const lower = message.toLowerCase().trim();
    if (['hi', 'hello', 'hey', 'help'].includes(lower)) {
        console.log('[TIER 1 - ROUTER] Intercepted standard greeting');
        return res.json({
            text_reply: "Hey! Welcome to MerchantOS 👋 I'm your personal shopping concierge — tell me what you're looking for, and I'll track it down. What are we hunting today?",
            ui_component: "SimpleReply",
            products: [],
            suggested_replies: ["Show me laptops", "Show me smartphones", "What do you sell?"]
        });
    }
    next();
};

// ---------------------------------------------------------
// Endpoints
// ---------------------------------------------------------

// GET /.well-known/agent-manifest.json
// Machine-readable manifest for external AI agent discovery
app.get('/.well-known/agent-manifest.json', (req, res) => {
    res.json({
        schema_version: '1.0.0',
        merchant_name: 'Razorpay Agentic Commerce',
        currency: 'INR',
        capabilities: ['search', 'recommend', 'cart', 'checkout'],
        policies: {
            max_autonomous_order: 5000,
            requires_user_consent: true
        },
        endpoints: {
            catalog: '/api/catalog',
            intent: '/api/checkout/intent'
        }
    });
});

// GET /api/audit-logs
// Telemetry endpoint returning the 15 most recent audit logs
app.get('/api/audit-logs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 15');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve audit logs.' }
        });
    }
});

// GET /api/categories
// Fetch all unique categories available in the inventory
app.get('/api/categories', async (req, res) => {
    try {
        const result = await pool.query('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != \'\' ORDER BY category ASC');
        res.json(result.rows.map(row => row.category));
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve categories.' }
        });
    }
});

// GET /api/catalog
// Semantically search a product inventory
app.get('/api/catalog', async (req, res) => {
    try {
        const query = req.query.q || '';
        const maxPrice = req.query.max_price ? parseInt(req.query.max_price, 10) : null;
        const inStock = req.query.in_stock === 'true';
        const category = req.query.category || null;
        let result;
        const params = [];
        const conditions = [];

        if (maxPrice) {
            params.push(maxPrice);
            conditions.push(`price <= $${params.length}`);
        }

        if (inStock) {
            conditions.push(`stock > 0`);
        }

        if (category) {
            params.push(category);
            conditions.push(`category ILIKE '%' || $${params.length} || '%'`);
        }

        let whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

        if (query) {
            // Generate embedding for the search query
            const embeddingResult = await ai.models.embedContent({
                model: 'gemini-embedding-2',
                contents: query,
                config: { outputDimensionality: 768 }
            });
            const vector = embeddingResult.embeddings[0].values;
            const vectorString = `[${vector.join(',')}]`;
            
            params.push(vectorString);
            const vectorParamIndex = params.length;

            const sql = `SELECT id, name, brand, category, description, price, stock, image_url, rating, warranty_information, shipping_information, reviews FROM products ${whereClause} ORDER BY embedding <=> $${vectorParamIndex} LIMIT 5`;
            result = await pool.query(sql, params);
        } else {
            const sql = `SELECT id, name, brand, category, description, price, stock, image_url, rating, warranty_information, shipping_information, reviews FROM products ${whereClause} ORDER BY id ASC LIMIT 50`;
            result = await pool.query(sql, params);
        }
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching catalog:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to retrieve catalog.'
            }
        });
    }
});

// POST /api/cart/add
// Add items to a PostgreSQL-backed active cart
const cartAddSchema = z.object({
    product_id: z.number().int().positive(),
    quantity: z.number().int().positive().default(1),
    cart_id: z.string().optional().nullable()
});

app.post('/api/cart/add', async (req, res) => {
    const client = await pool.connect();
    try {
        const parseResult = cartAddSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error });
        }

        const { product_id, quantity, cart_id } = parseResult.data;
        await client.query('BEGIN');

        // Verify product exists and get price
        const productRes = await client.query('SELECT name, price, image_url FROM products WHERE id = $1', [product_id]);
        if (productRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Product not found' });
        }
        
        const price = Number(productRes.rows[0].price);
        const amountToAdd = price * quantity;
        
        let finalCartId = cart_id;

        // Ensure cart_id is a valid UUID, otherwise discard it
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (finalCartId && !uuidRegex.test(finalCartId)) {
            finalCartId = null;
        }

        let isNewCart = false;

        if (finalCartId) {
            // Fetch existing cart_items
            const cartRes = await client.query(`SELECT cart_items FROM carts WHERE id = $1 AND status = 'ACTIVE' FOR UPDATE`, [finalCartId]);
            if (cartRes.rows.length === 0) {
                // Cart not found or not ACTIVE (e.g. already checked out). 
                // Rotate to a new cart.
                finalCartId = null;
                isNewCart = true;
            } else {
                let cartItems = cartRes.rows[0].cart_items;
                if (!Array.isArray(cartItems)) cartItems = [];
                
                let itemIndex = cartItems.findIndex(item => item.product_id === product_id);
                if (itemIndex > -1) {
                    cartItems[itemIndex].quantity += quantity;
                } else {
                    cartItems.push({ product_id, quantity });
                }

                // Update cart safely stringifying the array
                await client.query(
                    `UPDATE carts 
                     SET cart_items = $1::jsonb, 
                         total_amount = total_amount + $2, 
                         updated_at = CURRENT_TIMESTAMP 
                     WHERE id = $3`,
                    [JSON.stringify(cartItems), amountToAdd, finalCartId]
                );
                console.log('[CART UPDATE SUCCESS]');
            }
        } else {
            isNewCart = true;
        }

        if (isNewCart) {
            // Create new cart
            const cartItems = [{ product_id, quantity }];
            const insertRes = await client.query(
                `INSERT INTO carts (cart_items, total_amount, status) VALUES ($1::jsonb, $2, 'ACTIVE') RETURNING id`,
                [JSON.stringify(cartItems), amountToAdd]
            );
            finalCartId = insertRes.rows[0].id;
            console.log('[CART INSERT SUCCESS]');
            console.dir(cartItems, { depth: null, colors: true });
        }

        // Return enriched cart items (for the new generative UI)
        const enrichedRes = await client.query(`
            SELECT 
                ci.product_id, 
                ci.quantity, 
                p.name, 
                p.price, 
                p.image_url 
            FROM carts c, 
                 jsonb_to_recordset(c.cart_items) AS ci(product_id int, quantity int)
            JOIN products p ON p.id = ci.product_id
            WHERE c.id = $1
        `, [finalCartId]);

        const cartDataRes = await client.query('SELECT total_amount FROM carts WHERE id = $1', [finalCartId]);

        await client.query('COMMIT');
        res.json({ cart_id: finalCartId, status: 'success', cart_data: enrichedRes.rows, total_amount: Number(cartDataRes.rows[0].total_amount) });
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('[CART DB ERROR]', error);
        res.status(500).json({ error: 'Failed to add to cart' });
    } finally {
        client.release();
    }
});

// POST /api/cart/remove
// Remove items from a PostgreSQL-backed active cart
const cartRemoveSchema = z.object({
    product_id: z.number().int().positive(),
    cart_id: z.string().uuid()
});

app.post('/api/cart/remove', async (req, res) => {
    const client = await pool.connect();
    try {
        const parseResult = cartRemoveSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error });
        }

        const { product_id, cart_id } = parseResult.data;
        await client.query('BEGIN');

        // Verify product exists and get price
        const productRes = await client.query('SELECT name, price FROM products WHERE id = $1', [product_id]);
        if (productRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Product not found' });
        }
        
        const price = Number(productRes.rows[0].price);

        const cartRes = await client.query(`SELECT cart_items FROM carts WHERE id = $1 AND status = 'ACTIVE' FOR UPDATE`, [cart_id]);
        if (cartRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Cart not found or not active' });
        }

        let cartItems = cartRes.rows[0].cart_items;
        if (!Array.isArray(cartItems)) cartItems = [];
        
        const itemIndex = cartItems.findIndex(item => item.product_id === product_id);
        if (itemIndex > -1) {
            const quantityRemoved = cartItems[itemIndex].quantity;
            const amountToRemove = price * quantityRemoved;
            
            cartItems.splice(itemIndex, 1);

            await client.query(
                `UPDATE carts 
                 SET cart_items = $1::jsonb, 
                     total_amount = GREATEST(0, total_amount - $2), 
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $3`,
                [JSON.stringify(cartItems), amountToRemove, cart_id]
            );
            console.log('[CART REMOVE SUCCESS]');
        }

        // Return enriched cart items (for the new generative UI)
        const enrichedRes = await client.query(`
            SELECT 
                ci.product_id, 
                ci.quantity, 
                p.name, 
                p.price, 
                p.image_url 
            FROM carts c, 
                 jsonb_to_recordset(c.cart_items) AS ci(product_id int, quantity int)
            JOIN products p ON p.id = ci.product_id
            WHERE c.id = $1
        `, [cart_id]);

        const cartDataRes = await client.query('SELECT total_amount FROM carts WHERE id = $1', [cart_id]);

        await client.query('COMMIT');
        res.json({ cart_id: cart_id, status: 'success', cart_data: enrichedRes.rows, total_amount: Number(cartDataRes.rows[0].total_amount) });
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('[CART DB ERROR]', error);
        res.status(500).json({ error: 'Failed to remove from cart' });
    } finally {
        client.release();
    }
});

// GET /api/cart/:cart_id
app.get('/api/cart/:cart_id', async (req, res) => {
    try {
        const cartRes = await pool.query('SELECT cart_items, status FROM carts WHERE id = $1', [req.params.cart_id]);
        if (cartRes.rows.length === 0 || cartRes.rows[0].status !== 'ACTIVE') {
            return res.json({ cart_data: [] });
        }
        
        const enrichedRes = await pool.query(`
            SELECT 
                ci.product_id, 
                ci.quantity, 
                p.name, 
                p.price, 
                p.image_url 
            FROM carts c, 
                 jsonb_to_recordset(c.cart_items) AS ci(product_id int, quantity int)
            JOIN products p ON p.id = ci.product_id
            WHERE c.id = $1
        `, [req.params.cart_id]);

        res.json({
            ...cartRes.rows[0],
            cart_data: enrichedRes.rows
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
});

// GET /api/cart/upsell
// AI-Powered Cart-based Upsell Engine
app.get('/api/cart/upsell', async (req, res) => {
    const cartId = req.query.cart_id;
    if (!cartId) return res.status(400).json({ error: 'cart_id required' });

    try {
        const enrichedRes = await pool.query(`
            SELECT p.id, p.name, p.category, p.price, ci.quantity
            FROM carts c, jsonb_to_recordset(c.cart_items) AS ci(product_id int, quantity int)
            JOIN products p ON p.id = ci.product_id
            WHERE c.id = $1
        `, [cartId]);

        if (enrichedRes.rows.length === 0) {
            return res.json({ recommended_product: null });
        }

        const cartDescription = enrichedRes.rows.map(r => `${r.quantity}x ${r.name} (${r.category}) - ₹${r.price}`).join(', ');

        const prompt = `Analyze this cart: [${cartDescription}]. Recommend ONE specific product from our catalog that is a highly relevant cross-sell accessory, ensuring it fits within a 2000 INR budget. Return JSON: { "recommended_product_id": <number>, "reasoning": "<string>" }. If you cannot find a good match, return { "recommended_product_id": null, "reasoning": "No relevant accessory found" }.`;

        const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        let rawText = aiResponse.text.trim();
        const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
            rawText = match[1];
        }
        const result = JSON.parse(rawText);

        if (!result.recommended_product_id) {
            return res.json({ recommended_product: null });
        }

        const productRes = await pool.query('SELECT * FROM products WHERE id = $1', [result.recommended_product_id]);
        if (productRes.rows.length === 0) {
            return res.json({ recommended_product: null });
        }

        res.json({
            recommended_product: productRes.rows[0],
            reasoning: result.reasoning
        });
    } catch (error) {
        console.error('[UPSELL ENGINE ERROR]', error);
        res.status(500).json({ error: 'Failed to generate upsell' });
    }
});

// POST /api/checkout/intent
// Cart State Machine with Deterministic Validation & Idempotent Razorpay Calls
const intentSchema = z.object({
    cart_id: z.string().uuid(),
    user_mandate: z.number().optional()
});

app.post('/api/checkout/intent', async (req, res) => {
    const client = await pool.connect();
    try {
        // Step 1: Schema Validation
        const parseResult = intentSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_PAYLOAD',
                    message: 'Payload does not match required schema.',
                    details: parseResult.error.issues
                }
            });
        }

        const { cart_id, user_mandate } = parseResult.data;
        const mandateLimit = user_mandate ?? 5000;

        // Begin transaction — entire pipeline is atomic
        await client.query('BEGIN');

        // Lock the cart for update
        const cartRes = await client.query('SELECT * FROM carts WHERE id = $1 AND status = $2 FOR UPDATE', [cart_id, 'ACTIVE']);
        if (cartRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: { code: 'INVALID_CART', message: 'Cart is either not found or no longer active.' }
            });
        }
        
        const cart = cartRes.rows[0];
        const cart_items = cart.cart_items || [];
        if (cart_items.length === 0) {
             await client.query('ROLLBACK');
             return res.status(400).json({ error: { code: 'EMPTY_CART', message: 'Cart is empty.' } });
        }

        const product_ids = cart_items.map(item => item.product_id);

        // Step 2: Product Lookup (with row-level lock to prevent concurrent stock changes)
        const dbRes = await client.query(
            'SELECT id, name, price, stock FROM products WHERE id = ANY($1::int[]) FOR SHARE',
            [product_ids]
        );
        
        const products = dbRes.rows;
        const productsById = products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

        // Step 3: Deterministic Total recalculation to be safe
        let totalAmount = 0;
        let outOfStock = [];
        
        for (const item of cart_items) {
            const p = productsById[item.product_id];
            if (!p) continue;
            totalAmount += Number(p.price) * item.quantity;
            if (p.stock < item.quantity) {
                outOfStock.push(p);
            }
        }

        // Step 5: Policy Checks
        // 5a: Stock Validation — requested quantity must not exceed available stock
        if (outOfStock.length > 0) {
            const reason = `Stock violation: ${outOfStock.map(p => p.name).join(', ')} out of stock.`;
            await client.query(
                `UPDATE carts SET status = 'ABANDONED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
                [cart_id]
            );
            await client.query(
                `INSERT INTO audit_logs (agent_intent_json, validation_status, error_reason, policy_result, cart_id)
                 VALUES ($1, $2, $3, $4, $5)`,
                [req.body, 'REJECTED', reason, 'STOCK_VIOLATION', cart_id]
            );
            await client.query('COMMIT');
            return res.status(403).json({
                error: { code: 'STOCK_VIOLATION', message: reason },
                cart_id: cart_id,
                cart_status: 'ABANDONED'
            });
        }

        // 5b: Mandate Check — total must not exceed the user's spending limit
        if (totalAmount > mandateLimit) {
            const reason = `Mandate violation: Total ₹${totalAmount} exceeds maximum allowed budget of ₹${mandateLimit}.`;
            await client.query(
                `UPDATE carts SET status = 'ABANDONED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
                [cart_id]
            );
            await client.query(
                `INSERT INTO audit_logs (agent_intent_json, validation_status, error_reason, policy_result, cart_id)
                 VALUES ($1, $2, $3, $4, $5)`,
                [req.body, 'REJECTED', reason, 'MANDATE_VIOLATION', cart_id]
            );
            await client.query('COMMIT');
            return res.status(403).json({
                error: { code: 'MANDATE_VIOLATION', message: reason },
                cart_id: cart_id,
                cart_status: 'ABANDONED'
            });
        }

        // Step 6: Authorization — all checks passed
        const idempotencyKey = `${cart_id}_${Date.now()}`;
        await client.query(
            `UPDATE carts SET status = 'AUTHORIZED', idempotency_key = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [idempotencyKey, cart_id]
        );

        // Step 7: Razorpay Execution
        const receiptId = `rcpt_${cart_id.split('-')[0]}`;
        const order = await razorpay.orders.create({
            amount: totalAmount * 100, // convert to paise
            currency: 'INR',
            receipt: receiptId,
            notes: {
                cart_id: cart_id,
                idempotency_key: idempotencyKey
            }
        });

        // Step 8: Completion — wait for webhook or payment to complete, for now we mark it COMPLETED directly after order creation (simulate auto-complete for MVP if no webhook, but we have a webhook now so we leave it AUTHORIZED). Actually, for test flows let's leave it AUTHORIZED, the webhook or frontend should complete it.
        // But for our demo flow, Razorpay modal pays it, we can keep the old behavior of COMPLETED for now to avoid breaking existing UI, but the prompt implies we should maintain state. Let's just update the Razorpay order ID here.
        await client.query(
            `UPDATE carts SET razorpay_order_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [order.id, cart_id]
        );

        // Step 9: Audit Log — record successful transaction
        await client.query(
            `INSERT INTO audit_logs (agent_intent_json, validation_status, error_reason, idempotency_key, policy_result, cart_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [req.body, 'APPROVED', `Order Created: ${order.id}`, idempotencyKey, 'PASS', cart_id]
        );

        await client.query('COMMIT');

        // Step 10: Response
        res.json({
            ...order,
            cart_id: cart_id,
            cart_status: 'AUTHORIZED',
            idempotency_key: idempotencyKey
        });

    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('[CHECKOUT] Pipeline error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Internal server error processing checkout intent.'
            }
        });
    } finally {
        client.release();
    }
});
// ---------------------------------------------------------
// Merchant B2B APIs
// ---------------------------------------------------------

// GET /api/merchant/insights
// Aggregate cart data for the merchant dashboard
app.get('/api/merchant/insights', async (req, res) => {
    try {
        // Revenue today — sum of COMPLETED carts created today
        const revenueRes = await pool.query(
            `SELECT COALESCE(SUM(total_amount), 0) AS revenue_today,
                    COUNT(*) AS total_completed
             FROM carts
             WHERE status = 'COMPLETED' AND created_at >= CURRENT_DATE`
        );

        // Abandoned revenue — sum of all ABANDONED carts
        const abandonedRes = await pool.query(
            `SELECT COALESCE(SUM(total_amount), 0) AS abandoned_revenue,
                    COUNT(*) AS total_abandoned
             FROM carts
             WHERE status = 'ABANDONED'`
        );

        // Recent abandoned carts with product details
        const abandonedCartsRes = await pool.query(
            `SELECT c.id, c.status, c.cart_items, c.total_amount, c.created_at, c.updated_at,
                    al.policy_result,
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', p.id,
                                'name', p.name,
                                'price', p.price,
                                'image_url', p.image_url,
                                'category', p.category,
                                'brand', p.brand
                            )
                        )
                        FROM jsonb_to_recordset(c.cart_items) AS ci(product_id int)
                        JOIN products p ON p.id = ci.product_id
                    ) AS products
             FROM carts c
             LEFT JOIN audit_logs al ON al.cart_id = c.id
             WHERE c.status = 'ABANDONED'
             ORDER BY c.updated_at DESC
             LIMIT 20`
        );

        res.json({
            revenue_today: Number(revenueRes.rows[0].revenue_today),
            total_completed: Number(revenueRes.rows[0].total_completed),
            abandoned_revenue: Number(abandonedRes.rows[0].abandoned_revenue),
            total_abandoned: Number(abandonedRes.rows[0].total_abandoned),
            abandoned_carts: abandonedCartsRes.rows,
        });
    } catch (error) {
        console.error('[MERCHANT] Insights error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch merchant insights.' }
        });
    }
});

// POST /api/merchant/campaign/generate
// AI Revenue Recovery Agent — generates personalized SMS campaigns for abandoned carts
const campaignSchema = z.object({
    cart_id: z.string().uuid()
});

app.post('/api/merchant/campaign/generate', async (req, res) => {
    try {
        // Validate input
        const parseResult = campaignSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: { code: 'INVALID_PAYLOAD', message: 'A valid cart_id (UUID) is required.' }
            });
        }

        const { cart_id } = parseResult.data;

        // Fetch the abandoned cart
        const cartRes = await pool.query(
            'SELECT * FROM carts WHERE id = $1 AND status = $2',
            [cart_id, 'ABANDONED']
        );
        if (cartRes.rows.length === 0) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'Abandoned cart not found.' }
            });
        }
        const cart = cartRes.rows[0];

        // Fetch associated product details
        const productsRes = await pool.query(
            'SELECT id, name, brand, category, price, image_url FROM products WHERE id = ANY($1::int[])',
            [cart.product_ids]
        );

        // Build context for the LLM
        const cartContext = {
            cart_id: cart.id,
            total_amount: Number(cart.total_amount),
            products: productsRes.rows.map(p => ({
                name: p.name,
                brand: p.brand,
                category: p.category,
                price: Number(p.price),
            })),
            abandoned_at: cart.updated_at,
        };

        // Call Gemini with strict Revenue Recovery Agent prompt
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze this abandoned cart and generate a recovery campaign:\n${JSON.stringify(cartContext, null, 2)}`,
            config: {
                systemInstruction: 'Act as a Revenue Recovery Agent. Analyze this abandoned cart. Generate a highly personalized SMS campaign text to recover the sale. Suggest a smart incentive (e.g., a 10% discount or a free relevant accessory). You must output strictly in JSON: { "campaign_text": "string", "incentive": "string", "projected_recovery_amount": number }. Output ONLY raw JSON, no markdown, no code blocks.',
                temperature: 0.7,
            },
        });

        // Parse LLM response
        let campaign;
        try {
            let rawText = response.text.trim();
            const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (match) rawText = match[1];
            campaign = JSON.parse(rawText);
        } catch {
            campaign = {
                campaign_text: 'We noticed you left something behind! Complete your purchase today and enjoy a special offer.',
                incentive: '10% off your cart total',
                projected_recovery_amount: Number(cart.total_amount) * 0.9,
            };
        }

        res.json({
            cart_id: cart.id,
            cart_total: Number(cart.total_amount),
            products: productsRes.rows,
            campaign,
        });
    } catch (error) {
        console.error('[MERCHANT] Campaign generation error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate recovery campaign.' }
        });
    }
});

// POST /api/chat
// Handle conversational turns with the AI agent
app.post('/api/chat', semanticRouter, async (req, res) => {
    try {
        const { message, history, user_mandate, cart_id } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required.' });
        }
        const userMandate = user_mandate ?? 5000;
        
        // Tier 2 - The Semantic Cache (PostgreSQL Vector)
        const embeddingResult = await ai.models.embedContent({
            model: 'gemini-embedding-2',
            contents: message,
            config: { outputDimensionality: 768 }
        });
        const vector = embeddingResult.embeddings[0].values;
        const vectorString = `[${vector.join(',')}]`;

        const cacheRes = await pool.query(
            'SELECT json_response, query_embedding <=> $1 AS distance FROM llm_semantic_cache WHERE query_embedding <=> $1 < 0.05 ORDER BY distance ASC LIMIT 1',
            [vectorString]
        );

        if (cacheRes.rows.length > 0) {
            console.log('[TIER 2 - CACHE HIT] Serving from semantic cache');
            res.setHeader('X-Cache-Hit', 'true');
            return res.json(cacheRes.rows[0].json_response);
        }
        
        // Tier 3 - The LLM Fallback
        console.log('[TIER 3 - LLM FALLBACK] Routing to Gemini agent');
        const agentResponse = await handleChat(message, history, PORT, userMandate, cart_id);
        
        // Cache informational queries only (skip user-specific cart/checkout state)
        if (agentResponse.ui_component === 'ProductCarousel' || agentResponse.ui_component === 'CategoryList') {
            await pool.query(
                'INSERT INTO llm_semantic_cache (query_embedding, json_response) VALUES ($1, $2)',
                [vectorString, agentResponse]
            );
        }

        // Write explainability log if reasoning is provided
        if (agentResponse.reasoning) {
            let finalAuditCartId = agentResponse.new_cart_id || null;
            if (finalAuditCartId) {
                const checkRes = await pool.query('SELECT id FROM carts WHERE id = $1', [finalAuditCartId]);
                if (checkRes.rows.length === 0) finalAuditCartId = null;
            }
            // Strip raw_response to avoid duplicate large payloads, then stringify to guarantee valid JSONB
            const { raw_response, ...cleanAgentResponse } = agentResponse;
            await pool.query(
                `INSERT INTO audit_logs (agent_intent_json, llm_reasoning, validation_status, policy_result, cart_id) 
                 VALUES ($1, $2, 'APPROVED', 'PASS', $3)`,
                [JSON.stringify(cleanAgentResponse), agentResponse.reasoning, finalAuditCartId]
            );
        }

        res.json(agentResponse);
    } catch (error) {
        console.error('Error in chat:', error);
        res.status(500).json({ error: 'Failed to process chat message.' });
    }
});

// POST /api/webhooks/razorpay
// Handle asynchronous payment updates from Razorpay
app.post('/api/webhooks/razorpay', async (req, res) => {
    const client = await pool.connect();
    try {
        const event = req.body.event;
        const payload = req.body.payload;

        await client.query('BEGIN');

        if (event === 'payment.failed') {
            const order_id = payload.payment.entity.order_id;
            if (order_id) {
                await client.query(
                    `UPDATE carts SET status = 'PAYMENT_FAILED', updated_at = CURRENT_TIMESTAMP WHERE razorpay_order_id = $1`,
                    [order_id]
                );
                console.log(`[WEBHOOK] Cart updated to PAYMENT_FAILED for order ${order_id}`);
            }
        } else if (event === 'order.paid') {
            const order_id = payload.order.entity.id;
            if (order_id) {
                await client.query(
                    `UPDATE carts SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE razorpay_order_id = $1`,
                    [order_id]
                );
                console.log(`[WEBHOOK] Cart updated to COMPLETED for order ${order_id}`);
            }
        }

        await client.query('COMMIT');
        res.status(200).send('Webhook processed');
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('[WEBHOOK] Error processing webhook:', error);
        res.status(500).send('Internal Server Error');
    } finally {
        client.release();
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Razorpay Agentic Commerce API listening on port ${PORT}`);
});
