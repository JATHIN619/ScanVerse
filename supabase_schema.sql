-- Enable pgvector extension for Gemini AI embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Profiles (Customers & Owners)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('customer', 'owner')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Stores
CREATE TABLE stores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Products Catalog with Vector Embeddings
CREATE TABLE products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    barcode TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock_qty INTEGER NOT NULL DEFAULT 0,
    embedding vector(384), -- Holds Gemini AI product embeddings
    UNIQUE(store_id, barcode)
);

-- 4. Store Promotions (N-Item Bundles)
CREATE TABLE store_promotions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    required_items JSONB NOT NULL, -- e.g., [{"product_id": "uuid", "qty": 2}]
    discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed_price')),
    discount_value DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 5. Orders (Digital Ledger)
CREATE TABLE orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID REFERENCES stores(id),
    customer_id UUID REFERENCES profiles(id),
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'failed')),
    razorpay_order_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Order Items
CREATE TABLE order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price_at_time DECIMAL(10,2) NOT NULL
);

-- 7. Analytics: Abandoned Cart Tracking
CREATE TABLE scan_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID REFERENCES stores(id),
    product_id UUID REFERENCES products(id),
    action TEXT CHECK (action IN ('scanned', 'dropped', 'purchased')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RPC 1: Vector Similarity Search for Product Recommendations
CREATE OR REPLACE FUNCTION match_products(
    query_embedding vector(384),
    match_threshold float,
    match_count int,
    target_store_id uuid
) RETURNS TABLE (
    id uuid,
    name text,
    similarity float
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.name, 1 - (p.embedding <=> query_embedding) AS similarity
    FROM products p
    WHERE p.store_id = target_store_id AND 1 - (p.embedding <=> query_embedding) > match_threshold
    ORDER BY p.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- RPC 2: Business Intelligence Dashboard Aggregation
CREATE OR REPLACE FUNCTION get_advanced_dashboard(target_store_id UUID)
RETURNS JSON AS $$
DECLARE
    total_rev DECIMAL;
    order_count INT;
    abandoned JSON;
BEGIN
    SELECT COALESCE(SUM(total_amount), 0), COUNT(id) INTO total_rev, order_count 
    FROM orders WHERE store_id = target_store_id AND payment_status = 'paid';
    
    SELECT json_agg(row_to_json(t)) INTO abandoned FROM (
        SELECT p.name, COUNT(s.id) as drop_count 
        FROM scan_analytics s 
        JOIN products p ON p.id = s.product_id 
        WHERE s.store_id = target_store_id AND s.action = 'dropped' 
        GROUP BY p.name ORDER BY drop_count DESC LIMIT 5
    ) t;

    RETURN json_build_object(
        'total_revenue', total_rev,
        'total_orders', order_count,
        'most_abandoned', COALESCE(abandoned, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql;

-- SECURITY (RLS Bypassed for Demo/Presentation Phase)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read/write access for presentation demo" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public read/write access for presentation demo" ON orders FOR ALL USING (true) WITH CHECK (true);