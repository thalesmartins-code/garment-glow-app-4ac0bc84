SELECT cron.schedule(
  'ml-token-refresh-every-20min',
  '*/20 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://gionpsuunfkkzzjdubfy.supabase.co/functions/v1/ml-token-refresh',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdpb25wc3V1bmZra3p6amR1YmZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTc2NDgsImV4cCI6MjA4ODEzMzY0OH0.mHbEEnXlynQopAd5j7A4B4emYwalXqvyVcvEh_G5gUk"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);