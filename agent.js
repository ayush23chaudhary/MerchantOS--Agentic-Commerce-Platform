const { GoogleGenAI, Type } = require('@google/genai');

// We initialize the AI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const search_catalog_declaration = {
    name: 'search_catalog',
    description: 'Search or browse the product catalog. Call this whenever the user asks about products, wants to see items, or wants to shop. Pass an empty string for query to show all products. Use max_price to filter by budget.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            query: {
                type: Type.STRING,
                description: 'Keyword to search for. Pass empty string "" to show all products.',
            },
            max_price: {
                type: Type.INTEGER,
                description: 'Maximum price in rupees. Only set this if the user mentions a budget or price limit.',
            },
            in_stock: {
                type: Type.BOOLEAN,
                description: 'Set to true if the user only wants to see items that are currently in stock.',
            },
            category: {
                type: Type.STRING,
                description: 'Optional category to filter products by (e.g. "beauty", "laptops").',
            }
        },
        required: ['query'],
    },
};

const list_categories_declaration = {
    name: 'list_categories',
    description: 'Get a list of all available product categories in the store. Call this when the user asks what you sell, or asks to see products without specifying what kind.',
    parameters: {
        type: Type.OBJECT,
        properties: {},
        required: []
    }
};

const suggest_accessory_declaration = {
    name: 'suggest_accessory',
    description: 'Search for a relevant accessory (e.g. case, cover, cable, mouse) for a primary item that the user intends to buy.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            main_item_name: {
                type: Type.STRING,
                description: 'The name of the primary item the user is buying.',
            }
        },
        required: ['main_item_name'],
    },
};

const add_to_cart_declaration = {
    name: 'add_to_cart',
    description: "Add a specific product to the user's cart.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            product_id: {
                type: Type.INTEGER,
                description: 'The ID of the product to add.',
            },
            quantity: {
                type: Type.INTEGER,
                description: 'Quantity to add.',
            }
        },
        required: ['product_id', 'quantity'],
    },
};

const view_cart_declaration = {
    name: 'view_cart',
    description: "View the current contents and total of the user's active cart.",
    parameters: {
        type: Type.OBJECT,
        properties: {},
        required: []
    }
};

const propose_checkout_declaration = {
    name: 'propose_checkout',
    description: 'Propose a checkout intent for the active cart. The backend calculates the final price deterministically based on the active cart.',
    parameters: {
        type: Type.OBJECT,
        properties: {},
        required: [],
    },
};

const systemPrompt = `PERSONA: You are a sharp, witty, and elite personal shopping concierge for MerchantOS. You sound human, confident, and slightly playful. NEVER say 'As an AI' or 'I am an AI'. NEVER be overly polite or robotic.
RULE 1 (Pacing): Use short, punchy sentences. Use conversational fillers like 'Ah, great choice', 'Let's see...', 'Boom.', 'Oh, nice taste.', or 'Alright, let's do this.'
RULE 2 (Proactive): Never let the conversation die. Always end your text with a quick hook or a question. Example: Instead of 'Your cart is empty', say 'Your cart is looking a bit lonely. What are we hunting for today?'
RULE 3 (Style): Use emojis sparingly but effectively (max 1-2 per message). Keep responses concise — no walls of text.
RULE 4: You must still strictly follow ALL JSON tool-calling rules, circuit breaker policies, and output schemas below. The persona applies only to the text_reply field.

You have access to tools:

1. search_catalog - Use this when the user asks to see specific products.
2. list_categories - Use this FIRST when the user generically asks to see products.
3. suggest_accessory - Use this when the user says they want to buy an item to find an upsell item.
4. add_to_cart - Use this to add items to the user's cart.
5. view_cart - Use this to check what is in the cart.
6. propose_checkout - Use this to initiate checkout for the active cart.

BEHAVIORAL RULES:
- When a user wants to buy something, ALWAYS use add_to_cart first.
- Do NOT call propose_checkout immediately unless the user explicitly says 'checkout', 'pay', or 'I am done shopping'.
- After adding an item, tell the user the item was added and ask if they want to check out.
- If a user asks for items from multiple distinct categories (e.g., 'kitchen and beauty'), you MUST execute the search_catalog tool multiple times in parallel for each distinct category. Combine the results and present them clearly.
- Ensure that the products returned by search_catalog use an "Add to Cart" intent.
- When searching, do NOT use strict exact-match category names unless the user explicitly types them. Prefer generic keyword searches. If a user asks for 'kitchen', pass 'kitchen' as a general search query, not a strict category filter.
- NEVER tell the user 'Your order has been placed' or 'Payment successful'. You do not have the authority to confirm payments. Only the Razorpay frontend modal can confirm payments. When a user asks to buy an item, you MUST call add_to_cart followed by propose_checkout. Your text response should only say something like 'Alright, securing your checkout now — hang tight.' in your concierge voice.

IMPORTANT: You MUST respond ONLY with a valid JSON object. No plain text. No markdown. No code blocks. Only raw JSON.

When you have products to show (after calling search_catalog), respond with this EXACT schema:
{
  "reasoning": "Explain internally why you are returning this specific response or recommending these products. This will be logged for explainability.",
  "text_reply": "A brief, helpful message about the products found.",
  "ui_component": "ProductCarousel",
  "products": [
    {
      "id": <number>,
      "name": "<string>",
      "brand": "<string>",
      "category": "<string>",
      "description": "<string>",
      "price": <number>,
      "stock": <number>,
      "rating": <number>,
      "image_url": "<string>",
      "warranty_information": "<string>",
      "shipping_information": "<string>",
      "reviews": [{"reviewerName": "<string>", "comment": "<string>", "rating": <number>}]
    }
  ],
  "suggested_replies": ["Short follow-up question 1?", "Short follow-up question 2?"]
}

When you have successfully executed add_to_cart or view_cart, respond with this EXACT schema:
{
  "reasoning": "Explain internally why you are showing the cart.",
  "text_reply": "A friendly, conversational response here.",
  "ui_component": "CartSummary",
  "suggested_replies": ["Checkout Now", "Keep Shopping"]
}

For all other responses (checkout status, errors, greetings, questions), respond with this schema in a friendly, helpful tone:
{
  "reasoning": "Explain internally why you are returning this specific response. This will be logged.",
  "text_reply": "Your natural language response here.",
  "ui_component": "SimpleReply",
  "products": [],
  "categories": [],
  "suggested_replies": ["Short follow-up question 1?", "Short follow-up question 2?"]
}

When you call list_categories, respond with this schema:
{
  "reasoning": "Explain why you are listing categories.",
  "text_reply": "Here are the categories we have available:",
  "ui_component": "CategoryList",
  "products": [],
  "categories": ["<all categories returned by the list_categories tool>"],
  "suggested_replies": ["Show me <category 1>", "Show me <category 2>"]
}

Rules:
- ALWAYS call list_categories if the user asks "what do you have" or "show me products" generally.
- Only include products that were returned by the search_catalog or suggest_accessory tools. NEVER invent products.
- Prices in the catalog are in rupees.
- If a product is not in the catalog, say so honestly in text_reply with ui_component SimpleReply.
- Never make up product names or prices. Only quote what the catalog returns.
- ALWAYS generate 2-3 short, contextual follow-up questions the user might ask next in the suggested_replies array.

Upsell Protocol (Always Be Closing):
- When a user says they want to buy a primary item, DO NOT immediately call propose_checkout.
- Call suggest_accessory using the primary item's name.
- DO NOT show the product cards again. The user has already seen them.
- If suggest_accessory returns a relevant accessory, respond with the UpsellPrompt schema below. DO NOT call propose_checkout yet.
- If suggest_accessory returns NO results or NO relevant accessory (e.g. only returns other main items), you MUST immediately call propose_checkout for the primary item. DO NOT return a text reply or JSON schema in this case. Just call the tool.
- ONLY call propose_checkout when the user gives their final answer (clicks one of the buttons), or if no accessory is found. If the user wants both items, pass both product IDs in the product_ids array. If they want just the primary item, pass only the primary item ID in the array. Do NOT calculate or pass any price — the backend handles pricing.

When you have an upsell to offer, respond with this schema:
{
  "reasoning": "Explain why you are suggesting this upsell.",
  "text_reply": "Great choice! I found a perfect add-on for your [Primary Item].",
  "ui_component": "UpsellPrompt",
  "products": [],
  "upsell_data": {
    "primary_item": { "id": <number>, "name": "<string>", "price": <number> },
    "accessory_item": { "id": <number>, "name": "<string>", "price": <number>, "image_url": "<string>" },
    "combined_price": <number>
  },
  "suggested_replies": []
}`;

const tools = [{ functionDeclarations: [search_catalog_declaration, list_categories_declaration, suggest_accessory_declaration, propose_checkout_declaration, add_to_cart_declaration, view_cart_declaration] }];

async function handleChat(userMessage, history, port, userMandate, cartId) {
    let razorpay_order_id = null;
    let new_cart_id = cartId;

    const sdkHistory = [];
    if (history && history.length > 0) {
        for (let i = 0; i < history.length - 1; i++) { // skip the latest user message
            const msg = history[i];
            if (msg.role === 'user') {
                sdkHistory.push({ role: 'user', parts: [{ text: msg.text }] });
            } else if (msg.role === 'agent') {
                const contextObj = { text_reply: msg.text };
                if (msg.ui_component) contextObj.ui_component = msg.ui_component;
                if (msg.products && msg.products.length > 0) contextObj.products = msg.products.map(p => ({ id: p.id, name: p.name, price: p.price }));
                if (msg.upsell_data) contextObj.upsell_data = msg.upsell_data;
                sdkHistory.push({ role: 'model', parts: [{ text: JSON.stringify(contextObj) }] });
            }
        }
    }

    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: sdkHistory,
        config: {
            systemInstruction: systemPrompt,
            tools: tools,
            temperature: 0,
        }
    });

    let response = await chat.sendMessage({ message: userMessage });

    // Process function calls if any
    while (response.functionCalls && response.functionCalls.length > 0) {
        const functionResponses = [];
        
        for (const functionCall of response.functionCalls) {
            const name = functionCall.name;
            const args = functionCall.args;

            let apiResponse;
            try {
                if (name === 'search_catalog') {
                    let q = args.query !== undefined ? args.query : '';
                    if (q.toLowerCase() === 'all products' || q.toLowerCase() === 'all') {
                        q = '';
                    }
                    const queryStr = new URLSearchParams({
                        q: q,
                        ...(args.max_price && { max_price: args.max_price }),
                        ...(args.in_stock !== undefined && { in_stock: args.in_stock }),
                        ...(args.category && { category: args.category })
                    }).toString();
                    const res = await fetch(`http://localhost:${port}/api/catalog?${queryStr}`);
                    apiResponse = await res.json();
                } else if (name === 'list_categories') {
                    const res = await fetch(`http://localhost:${port}/api/categories`);
                    apiResponse = await res.json();
                } else if (name === 'suggest_accessory') {
                    const queryStr = new URLSearchParams({
                        q: `${args.main_item_name} accessory case cover cable mouse`
                    }).toString();
                    const res = await fetch(`http://localhost:${port}/api/catalog?${queryStr}`);
                    apiResponse = await res.json();
                } else if (name === 'add_to_cart') {
                    const res = await fetch(`http://localhost:${port}/api/cart/add`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ product_id: args.product_id, quantity: args.quantity, cart_id: new_cart_id })
                    });
                    apiResponse = await res.json();
                    if (res.ok && apiResponse.cart_id) {
                        new_cart_id = apiResponse.cart_id;
                    }
                } else if (name === 'view_cart') {
                    if (!new_cart_id) {
                        apiResponse = { error: 'Cart is empty' };
                    } else {
                        const res = await fetch(`http://localhost:${port}/api/cart/${new_cart_id}`);
                        apiResponse = await res.json();
                    }
                } else if (name === 'propose_checkout') {
                    const res = await fetch(`http://localhost:${port}/api/checkout/intent`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cart_id: new_cart_id, user_mandate: userMandate ?? 5000 })
                    });
                    apiResponse = await res.json();

                    if (res.ok && apiResponse.id) {
                        razorpay_order_id = apiResponse.id;
                    }
                } else {
                    apiResponse = { error: 'Unknown tool' };
                }
            } catch (error) {
                apiResponse = { error: error.message };
            }
            
            functionResponses.push({
                functionResponse: {
                    name: name,
                    response: { result: apiResponse }
                }
            });
        }

        response = await chat.sendMessage({
            message: functionResponses
        });
    }

    // Parse AI's JSON response
    let parsed;
    try {
        let rawText = response.text.trim();
        // Strip markdown backticks if the AI wrapped the JSON
        const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
            rawText = match[1];
        } else {
            // Find the first { and last } to extract raw JSON if there's conversational text before it
            const start = rawText.indexOf('{');
            const end = rawText.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                rawText = rawText.substring(start, end + 1);
            }
        }
        parsed = JSON.parse(rawText);
    } catch (e) {
        // Fallback if AI doesn't return perfect JSON
        parsed = {
            reasoning: "Fallback parsing used due to malformed JSON.",
            text_reply: response.text,
            ui_component: 'SimpleReply',
            products: [],
            categories: [],
            cart_data: [],
            suggested_replies: []
        };
    }

    // Deterministically fetch the cart data so the LLM doesn't have to hallucinate it
    if (parsed.ui_component === 'CartSummary') {
        if (!new_cart_id) {
            parsed.cart_data = [];
        } else {
            try {
                const res = await fetch(`http://localhost:${port}/api/cart/${new_cart_id}`);
                if (res.ok) {
                    const cartApiRes = await res.json();
                    parsed.cart_data = cartApiRes.cart_data || [];
                } else {
                    parsed.cart_data = [];
                }
            } catch (e) {
                parsed.cart_data = [];
            }
        }
    }

    return {
        ...parsed,
        raw_response: response.text,
        razorpay_order_id,
        new_cart_id
    };
}

module.exports = { handleChat };
