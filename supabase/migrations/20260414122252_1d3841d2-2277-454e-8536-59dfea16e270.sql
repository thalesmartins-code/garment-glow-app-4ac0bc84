
-- Fix: Move ml_user_id 1421067331 (Mercado Livre MG) from Buy Clock to Sandrini
UPDATE ml_tokens SET seller_id = '8c57110c-77bc-4603-a959-01e965fbea3a' WHERE ml_user_id = '1421067331' AND seller_id = '52a7ed04-0d06-4ef5-ae6c-4f3e08a12867';

UPDATE ml_user_cache SET seller_id = '8c57110c-77bc-4603-a959-01e965fbea3a' WHERE ml_user_id = 1421067331 AND seller_id = '52a7ed04-0d06-4ef5-ae6c-4f3e08a12867';

-- Fix seller_stores: remove Buy Clock's ML stores (they belong to Sandrini)
DELETE FROM seller_stores WHERE seller_id = '52a7ed04-0d06-4ef5-ae6c-4f3e08a12867' AND marketplace = 'ml';

-- Fix Sandrini's ML MG store: ensure external_id is correct (1421067331)
UPDATE seller_stores SET external_id = '1421067331' WHERE id = '9eee89c9-4f57-49f2-bb60-86e134137f40';

-- Also fix all cache tables that reference the wrong seller_id for ml_user_id 1421067331
UPDATE ml_daily_cache SET seller_id = '8c57110c-77bc-4603-a959-01e965fbea3a' WHERE ml_user_id = '1421067331' AND seller_id = '52a7ed04-0d06-4ef5-ae6c-4f3e08a12867';

UPDATE ml_hourly_cache SET seller_id = '8c57110c-77bc-4603-a959-01e965fbea3a' WHERE ml_user_id = '1421067331' AND seller_id = '52a7ed04-0d06-4ef5-ae6c-4f3e08a12867';

UPDATE ml_product_daily_cache SET seller_id = '8c57110c-77bc-4603-a959-01e965fbea3a' WHERE ml_user_id = '1421067331' AND seller_id = '52a7ed04-0d06-4ef5-ae6c-4f3e08a12867';

UPDATE ml_sync_log SET seller_id = '8c57110c-77bc-4603-a959-01e965fbea3a' WHERE ml_user_id = '1421067331' AND seller_id = '52a7ed04-0d06-4ef5-ae6c-4f3e08a12867';

UPDATE ml_ads_campaigns_cache SET seller_id = '8c57110c-77bc-4603-a959-01e965fbea3a' WHERE ml_user_id = '1421067331' AND seller_id = '52a7ed04-0d06-4ef5-ae6c-4f3e08a12867';

UPDATE ml_ads_daily_cache SET seller_id = '8c57110c-77bc-4603-a959-01e965fbea3a' WHERE ml_user_id = '1421067331' AND seller_id = '52a7ed04-0d06-4ef5-ae6c-4f3e08a12867';

UPDATE ml_ads_products_cache SET seller_id = '8c57110c-77bc-4603-a959-01e965fbea3a' WHERE ml_user_id = '1421067331' AND seller_id = '52a7ed04-0d06-4ef5-ae6c-4f3e08a12867';
