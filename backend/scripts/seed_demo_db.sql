-- E-commerce sample schema + data for SQL Assist demo
SET client_min_messages = WARNING;

CREATE TABLE customers (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    email       VARCHAR(160) UNIQUE NOT NULL,
    country     VARCHAR(60)  NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE products (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(140) NOT NULL,
    category    VARCHAR(60)  NOT NULL,
    price       NUMERIC(10,2) NOT NULL,
    stock       INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE orders (
    id          SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    total       NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id),
    quantity    INTEGER NOT NULL,
    unit_price  NUMERIC(10,2) NOT NULL
);

-- Customers
INSERT INTO customers (name, email, country, created_at) VALUES
 ('Alice Johnson','alice@example.com','USA',    now() - interval '120 days'),
 ('Bob Smith','bob@example.com','USA',          now() - interval '90 days'),
 ('Carla Mendes','carla@example.com','Brazil',  now() - interval '80 days'),
 ('David Kim','david@example.com','South Korea',now() - interval '60 days'),
 ('Elena Petrova','elena@example.com','Russia', now() - interval '45 days'),
 ('Farid Ahmed','farid@example.com','UAE',      now() - interval '30 days'),
 ('Grace Liu','grace@example.com','China',      now() - interval '20 days'),
 ('Hannah Müller','hannah@example.com','Germany',now() - interval '12 days'),
 ('Ivan Novak','ivan@example.com','Czechia',    now() - interval '6 days'),
 ('Julia Rossi','julia@example.com','Italy',    now() - interval '3 days'),
 ('Kenji Tanaka','kenji@example.com','Japan',   now() - interval '2 days'),
 ('Laura Garcia','laura@example.com','Spain',   now() - interval '1 days');

-- Products
INSERT INTO products (name, category, price, stock) VALUES
 ('Wireless Mouse','Electronics',24.99,140),
 ('Mechanical Keyboard','Electronics',89.00,60),
 ('27" 4K Monitor','Electronics',329.99,18),
 ('USB-C Hub','Electronics',45.50,0),
 ('Laptop Stand','Accessories',32.00,75),
 ('Noise-Cancelling Headphones','Electronics',199.00,25),
 ('Webcam 1080p','Electronics',59.99,0),
 ('Desk Lamp','Home',39.95,90),
 ('Ergonomic Chair','Furniture',249.00,12),
 ('Standing Desk','Furniture',459.00,7),
 ('Notebook (A5)','Stationery',6.50,500),
 ('Gel Pen Pack','Stationery',8.25,300),
 ('Coffee Mug','Home',12.00,0),
 ('Water Bottle','Home',18.75,210),
 ('Phone Charger','Electronics',19.99,160);

-- Orders + items (mix of statuses and dates)
INSERT INTO orders (customer_id, status, total, created_at) VALUES
 (1,'completed',  443.97, now() - interval '40 days'),
 (1,'completed',  24.99,  now() - interval '10 days'),
 (2,'completed',  329.99, now() - interval '35 days'),
 (2,'shipped',    97.25,  now() - interval '5 days'),
 (3,'completed',  199.00, now() - interval '25 days'),
 (4,'cancelled',  459.00, now() - interval '22 days'),
 (4,'completed',  71.99,  now() - interval '8 days'),
 (5,'completed',  249.00, now() - interval '18 days'),
 (6,'pending',    45.50,  now() - interval '2 days'),
 (7,'completed',  178.00, now() - interval '15 days'),
 (8,'shipped',    39.95,  now() - interval '4 days'),
 (9,'completed',  14.75,  now() - interval '3 days'),
 (10,'pending',   329.99, now() - interval '1 days'),
 (11,'completed', 108.99, now() - interval '2 days'),
 (1,'completed',  89.00,  now() - interval '70 days');

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
 (1,3,1,329.99),(1,6,1,199.00),(1,1,1,24.99),  -- minor mismatch ok for demo totals
 (2,1,1,24.99),
 (3,3,1,329.99),
 (4,2,1,89.00),(4,12,1,8.25),
 (5,6,1,199.00),
 (6,10,1,459.00),
 (7,8,1,39.95),(7,5,1,32.00),
 (8,9,1,249.00),
 (9,4,1,45.50),
 (10,2,2,89.00),
 (11,8,1,39.95),
 (12,14,1,18.75),
 (13,3,1,329.99),
 (14,6,1,199.00),(14,11,1,6.50),
 (15,2,1,89.00);

-- Hand the objects to the app role
ALTER TABLE customers   OWNER TO sqlassist;
ALTER TABLE products    OWNER TO sqlassist;
ALTER TABLE orders      OWNER TO sqlassist;
ALTER TABLE order_items OWNER TO sqlassist;
ALTER SEQUENCE customers_id_seq   OWNER TO sqlassist;
ALTER SEQUENCE products_id_seq    OWNER TO sqlassist;
ALTER SEQUENCE orders_id_seq      OWNER TO sqlassist;
ALTER SEQUENCE order_items_id_seq OWNER TO sqlassist;
GRANT ALL ON ALL TABLES IN SCHEMA public TO sqlassist;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO sqlassist;
