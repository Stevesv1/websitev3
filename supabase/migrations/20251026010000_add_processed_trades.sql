-- Create table to track processed trades (prevent duplicates across function calls)
CREATE TABLE IF NOT EXISTS public.processed_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_hash TEXT NOT NULL UNIQUE,
  trader_address TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_processed_trades_hash ON public.processed_trades(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_processed_trades_processed_at ON public.processed_trades(processed_at DESC);

-- Enable Row Level Security
ALTER TABLE public.processed_trades ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage processed trades
CREATE POLICY "Service role can manage processed trades" 
ON public.processed_trades 
FOR ALL
USING (true);

-- Auto-cleanup old processed trades (keep last 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_processed_trades()
RETURNS void AS $$
BEGIN
  DELETE FROM public.processed_trades
  WHERE processed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to run cleanup daily (if pg_cron is available)
-- Note: This requires pg_cron extension which may not be available on all Supabase plans
-- If not available, you can manually run: SELECT cleanup_old_processed_trades();

