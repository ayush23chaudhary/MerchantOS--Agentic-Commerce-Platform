<p align="center">
  <h1 align="center">MerchantOS</h1>
  <p align="center"><strong>Enterprise Agentic Financial Infrastructure for AI-Native Commerce</strong></p>
  <p align="center">
    Razorpay AI Buildathon 2025 · Track 01: Agentic E-Commerce<br/>
    Built with Gemini 2.5 Flash · Secured by Razorpay · State-managed in PostgreSQL
  </p>
</p>

---

## What is MerchantOS?

MerchantOS is **not** an AI chatbot with a payment link. It is a full-stack commerce runtime that treats the LLM as an **untrusted reasoning engine** — the AI can search, recommend, and propose purchases, but it can never set a price, call the Razorpay API, or bypass a user's spending limit.

The platform ships as a **dual-view system**:

| View | Audience | Purpose |
|------|----------|---------|
| **B2C Storefront** | Shoppers | AI-assisted browsing, generative UI product cards, policy-checked checkout |
| **B2B Merchant Dashboard** | Business owners | Revenue analytics, abandoned cart recovery, AI-drafted SMS campaigns |
| **Developer Portal** | External AI agents | A2A protocol docs, agent manifest, headless checkout specs |

## The Core Thesis

> Every AI commerce demo today has the same fatal flaw: **the LLM controls the price.**
>
> An LLM can hallucinate `₹1` for a `₹50,000` laptop. A prompt injection can override spending limits. A malicious agent can bypass consent flows.
>
> MerchantOS solves this architecturally — not with better prompts, but with a **deterministic policy engine** that sits between the AI and Razorpay.

---

## Architecture Flow

This is how a single user message — *"I want to buy those headphones"* — flows through the system:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER MESSAGE                                   │
│                  "I want to buy those headphones"                        │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  TIER 1: Intent Router                                    latency: <1ms │
│  Exact-match on greetings/help → short-circuit response                 │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │ (not a greeting)
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  TIER 2: Semantic Cache (pgvector)                       latency: ~5ms  │
│  Embed query → cosine distance < 0.05 → serve cached response          │
│  Only caches informational queries (searches, categories)               │
│  Never caches user-specific state (cart, checkout)                       │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │ (cache miss)
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  TIER 3: Gemini 2.5 Flash Agent                        latency: ~800ms  │
│                                                                         │
│  System prompt enforces:                                                │
│    → "You MUST NOT confirm payments. Only Razorpay can."                │
│    → "You MUST call add_to_cart before propose_checkout."               │
│    → "For multi-category queries, call search_catalog in PARALLEL."     │
│                                                                         │
│  Model emits tool calls:                                                │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│    │ add_to_cart   │  │ view_cart    │  │ propose_     │                 │
│    │ {product_id:5}│  │ {}          │  │ checkout {}  │                 │
│    └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                 │
└───────────┼─────────────────┼─────────────────┼─────────────────────────┘
            │                 │                 │
            ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  NODE.JS TOOL EXECUTOR (server.js)                                      │
│                                                                         │
│  Each tool call hits a REST endpoint on localhost.                       │
│  The LLM has NO direct database or Razorpay access.                     │
│  All tool responses are fed back to the model for the next turn.        │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ (if tool = propose_checkout)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  POLICY ENGINE (Circuit Breaker)                    SINGLE PG TRANSACTION│
│                                                                         │
│  BEGIN;                                                                 │
│    1. SELECT ... FOR UPDATE  → Lock the cart row                        │
│    2. SELECT ... FOR SHARE   → Lock product rows (prevent stock race)   │
│    3. Recalculate total from DB prices (IGNORE LLM's numbers)           │
│    4. IF stock < quantity    → Cart → ABANDONED + audit log             │
│    5. IF total > mandate     → Cart → ABANDONED + audit log             │
│    6. IF ALL PASS            → Cart → AUTHORIZED                       │
│    7. razorpay.orders.create({ amount: total * 100 })                   │
│    8. INSERT INTO audit_logs (intent, status, idempotency_key)          │
│  COMMIT;                                                                │
│                                                                         │
│  The AI NEVER sees the Razorpay API key.                                │
│  The AI NEVER sets the order amount.                                    │
│  The AI NEVER confirms a payment.                                       │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  RAZORPAY                                                               │
│                                                                         │
│  → Order created with cart_id + idempotency_key in notes                │
│  → Frontend opens Razorpay modal for user consent                       │
│  → Webhooks: order.paid → COMPLETED | payment.failed → PAYMENT_FAILED  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key insight:** The LLM and Razorpay never communicate directly. The Policy Engine is a mandatory intermediary that enforces deterministic pricing, stock validation, and mandate authorization on every single transaction.

---

## Five Engineering Differentiators

### 1. 🛡️ The Circuit Breaker (Deterministic State Machine)

The cart is a PostgreSQL state machine with enforced transitions:

```sql
CREATE TABLE carts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status          VARCHAR(20) CHECK (status IN ('ACTIVE','AUTHORIZED','ABANDONED','COMPLETED')),
    cart_items      JSONB NOT NULL,          -- [{product_id, quantity}]
    total_amount    NUMERIC(12,2) NOT NULL,
    idempotency_key VARCHAR(100) UNIQUE,
    razorpay_order_id VARCHAR(100)
);
```

```
  ACTIVE ──── Policy PASS ────▶ AUTHORIZED ──── Webhook ────▶ COMPLETED
    │                               │
    │ Policy FAIL                   │ payment.failed
    ▼                               ▼
  ABANDONED                    PAYMENT_FAILED
```

**Why this matters:** The `CHECK` constraint means no code path — not the AI, not a bug, not a race condition — can put a cart into an invalid state. The idempotency key prevents duplicate Razorpay charges. The `FOR UPDATE` lock prevents concurrent checkout of the same cart.

### 2. 🤖 Agent-to-Agent (A2A) Headless API

External AI agents discover merchant capabilities via a machine-readable manifest:

```bash
GET /.well-known/agent-manifest.json
```
```json
{
  "schema_version": "1.0.0",
  "merchant_name": "Razorpay Agentic Commerce",
  "capabilities": ["search", "recommend", "cart", "checkout"],
  "policies": {
    "max_autonomous_order": 5000,
    "requires_user_consent": true
  },
  "endpoints": {
    "catalog": "/api/catalog",
    "intent": "/api/checkout/intent"
  }
}
```

A complete headless purchase in **3 deterministic API calls**:

```bash
# 1. Semantic search (pgvector cosine similarity)
curl /api/catalog?q=wireless+headphones

# 2. Add to cart (returns cart UUID)
curl -X POST /api/cart/add -d '{"product_id":5,"quantity":1}'

# 3. Checkout (Policy Engine → Razorpay order)
curl -X POST /api/checkout/intent -d '{"cart_id":"<uuid>","user_mandate":3000}'
```

No browser. No cookies. No UI. The same Policy Engine protects both human and AI buyers.

### 3. ⚡ Parallel Tool Orchestration

When a user says *"show me kitchen gadgets and beauty products"*, most agents serialize the queries. MerchantOS uses Gemini's native parallel function calling:

```javascript
// agent.js — Gemini emits multiple tool calls in a single response
while (response.functionCalls && response.functionCalls.length > 0) {
    const functionResponses = [];
    for (const functionCall of response.functionCalls) {
        // All search_catalog calls execute concurrently
        // Each one uses pgvector (768-dim Gemini embeddings) for semantic matching
    }
    response = await chat.sendMessage({ message: functionResponses });
}
```

| Pattern | Latency | MerchantOS |
|---------|---------|------------|
| Sequential (2 searches) | ~1600ms | ❌ |
| Parallel fan-out/fan-in | ~800ms | ✅ |

Each search uses the `<=>` cosine distance operator against 768-dimensional Gemini Embedding 2 vectors, enabling semantic matches like *"something for my skin"* → `skin-care` products.

### 4. 🎨 Action-Oriented Generative UI

We eliminated the "text-to-buy" hallucination vector entirely. The AI doesn't generate payment links or confirm orders in text — it returns **structured JSON schemas** that render as interactive React components:

| `ui_component` | What Renders | User Action |
|-----------------|-------------|-------------|
| `ProductCarousel` | Horizontal card strip with images, prices, ratings | **"Add to Cart"** button → `POST /api/cart/add` |
| `CartSummary` | Line items with quantities and totals | **"Checkout Now"** button → `POST /api/checkout/intent` |
| `UpsellPrompt` | Primary + accessory with combined price | **"Add Both"** / **"Just Primary"** buttons |
| `CategoryList` | Tappable category chips | Triggers `search_catalog` for that category |
| `SimpleReply` | Text-only with suggested reply pills | Quick-reply buttons |

Every button fires a **deterministic REST API call** — not a follow-up LLM prompt. The user clicks "Add to Cart" → the button calls `POST /api/cart/add` with the exact `product_id` from the database. No LLM in the loop. No hallucination possible.

The Cart Drawer includes a live **AI Upsell Engine** (`GET /api/cart/upsell`) that analyzes cart contents via Gemini and recommends a relevant cross-sell accessory with one-click add.

### 5. 💰 B2B Revenue Recovery Agent

Every `ABANDONED` cart is a business intelligence signal. The Merchant Dashboard surfaces:

- **Revenue at risk** — aggregate total of abandoned cart amounts
- **Policy failure reasons** — `MANDATE_VIOLATION` vs `STOCK_VIOLATION` breakdown
- **1-click AI campaign generation** — Gemini drafts a personalized SMS recovery message:

```bash
POST /api/merchant/campaign/generate
{ "cart_id": "uuid-of-abandoned-cart" }
```

```json
{
  "campaign_text": "Hey! Those wireless headphones you loved are still waiting...",
  "incentive": "10% off if you complete checkout in 24h",
  "projected_recovery_amount": 2700
}
```

This transforms abandoned carts from lost revenue into **re-engagement opportunities with projected ROI**.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **LLM** | Gemini 2.5 Flash | Parallel tool calling, structured JSON output, low latency |
| **Embeddings** | Gemini Embedding 2 (768d) | Semantic product search + query cache similarity |
| **Database** | PostgreSQL + pgvector | ACID transactions, JSONB carts, vector similarity search |
| **Payments** | Razorpay Orders API + Webhooks | Order creation, payment capture, async state updates |
| **Validation** | Zod | Runtime schema enforcement on every API payload |
| **Frontend** | React + Vite + Tailwind CSS | Three-view app (Storefront / Dashboard / API Docs) |
| **Cache** | PostgreSQL (semantic) | Cosine distance < 0.05 on query embeddings → cache hit |

## Security Model

| Threat | Mitigation |
|--------|-----------|
| LLM hallucinates a price | Total recalculated from `products.price` at checkout time |
| AI calls Razorpay directly | LLM has zero access to Razorpay credentials |
| Concurrent checkout race | `SELECT ... FOR UPDATE` row-level lock on cart |
| Stock oversell | `SELECT ... FOR SHARE` on product rows during checkout |
| Duplicate charges | `idempotency_key` UNIQUE constraint on carts |
| Mandate bypass | Server-side check: `IF total > user_mandate → ABANDONED` |
| Stale cache serves cart state | Semantic cache only stores `ProductCarousel` and `CategoryList` responses |

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/.well-known/agent-manifest.json` | A2A discovery manifest |
| `GET` | `/api/catalog?q=&category=&max_price=` | Semantic vector search |
| `GET` | `/api/categories` | All product categories |
| `POST` | `/api/cart/add` | Add item to JSONB cart |
| `GET` | `/api/cart/:id` | Enriched cart details |
| `GET` | `/api/cart/upsell?cart_id=` | AI cross-sell engine |
| `POST` | `/api/checkout/intent` | **Policy Engine → Razorpay** |
| `POST` | `/api/chat` | Conversational agent (3-tier) |
| `GET` | `/api/merchant/insights` | Merchant analytics |
| `POST` | `/api/merchant/campaign/generate` | AI revenue recovery |
| `POST` | `/api/webhooks/razorpay` | Async payment events |
| `GET` | `/api/audit-logs` | Transaction audit trail |

## Quick Start

```bash
git clone https://github.com/ayush23chaudhary/razorpay-agentic-commerce.git
cd razorpay-agentic-commerce

cp .env.example .env
# Set: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, GEMINI_API_KEY, DATABASE_URL

psql $DATABASE_URL < schema.sql
psql $DATABASE_URL < migrate_merchantos.sql
psql $DATABASE_URL < migrate_vector.sql
psql $DATABASE_URL < migrate_cache.sql
node scripts/embed_catalog.js

node server.js                  # Backend → :3000
cd client && npm i && npm run dev   # Frontend → :5173
```

---

Built by [Ayush Chaudhary](https://github.com/ayush23chaudhary) for the Razorpay AI Buildathon 2025.
# MerchantOS--Agentic-Commerce-Platform
