SELECT cron.alter_job(1, schedule => '*/10 * * * *');
SELECT cron.alter_job(2, schedule => '15 * * * *');
SELECT cron.alter_job(4, schedule => '30 4 * * *');
DROP INDEX IF EXISTS public.products_name_category_idx;