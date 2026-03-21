-- Run this in Supabase SQL Editor to add the `unlock_date` column
ALTER TABLE savings_pots ADD COLUMN unlock_date TIMESTAMPTZ;
