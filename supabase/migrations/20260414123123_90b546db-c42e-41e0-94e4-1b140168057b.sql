-- Link token to Buy Clock seller
UPDATE ml_tokens SET seller_id = '52a7ed04-0d06-4ef5-ae6c-4f3e08a12867' WHERE ml_user_id = '1291897547' AND seller_id IS NULL;

-- Update ml_user_cache if exists
UPDATE ml_user_cache SET seller_id = '52a7ed04-0d06-4ef5-ae6c-4f3e08a12867' WHERE ml_user_id = 1291897547 AND seller_id IS NULL;

-- Set external_id on Buy Clock's ML store
UPDATE seller_stores SET external_id = '1291897547', store_name = 'Mercado Livre SP' WHERE id = 'fd4847a0-e3d7-4e42-94b9-cec69d3ea1d3';