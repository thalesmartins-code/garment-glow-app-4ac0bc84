-- Link token to Buy Clock
UPDATE ml_tokens SET seller_id = '52a7ed04-0d06-4ef5-ae6c-4f3e08a12867' WHERE ml_user_id = '2325825107' AND seller_id IS NULL;

-- Link ml_user_cache if exists
UPDATE ml_user_cache SET seller_id = '52a7ed04-0d06-4ef5-ae6c-4f3e08a12867' WHERE ml_user_id = 2325825107 AND seller_id IS NULL;

-- Create store entry for this ML account
INSERT INTO seller_stores (seller_id, marketplace, external_id, store_name, is_active)
VALUES ('52a7ed04-0d06-4ef5-ae6c-4f3e08a12867', 'ml', '2325825107', 'Loja ML 2325825107', true)
ON CONFLICT DO NOTHING;