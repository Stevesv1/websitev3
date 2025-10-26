-- Add a unique constraint to prevent duplicate alerts
-- Composite key: trader_address + market_slug + bet_size + bet_price
-- This ensures the same bet cannot be inserted twice

-- First, remove any existing duplicates
DELETE FROM public.bet_alerts a
USING public.bet_alerts b
WHERE a.id > b.id
  AND a.trader_address = b.trader_address
  AND COALESCE(a.market_slug, '') = COALESCE(b.market_slug, '')
  AND a.bet_size = b.bet_size
  AND a.bet_price = b.bet_price;

-- Add unique constraint
-- Note: We use COALESCE to handle NULL market_slug values
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_bet_alert 
ON public.bet_alerts (
  trader_address, 
  COALESCE(market_slug, ''), 
  bet_size, 
  bet_price
);

-- Add a comment explaining the constraint
COMMENT ON INDEX idx_unique_bet_alert IS 
'Prevents duplicate alerts for the same bet (trader + market + size + price). 
This ensures each unique bet is only shown once, even if the API returns it multiple times.';

