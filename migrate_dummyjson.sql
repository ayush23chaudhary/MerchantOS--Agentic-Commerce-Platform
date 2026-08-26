CREATE EXTENSION IF NOT EXISTS vector;

DROP TABLE IF EXISTS products;

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    category VARCHAR(255),
    description TEXT,
    price NUMERIC NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    rating NUMERIC(3, 2),
    image_url TEXT,
    warranty_information TEXT,
    shipping_information TEXT,
    reviews JSONB,
    embedding vector(768)
);
