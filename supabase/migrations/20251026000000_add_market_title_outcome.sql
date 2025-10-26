-- Add market_title and outcome columns to bet_alerts table
ALTER TABLE public.bet_alerts 
ADD COLUMN market_title TEXT,
ADD COLUMN outcome TEXT;

-- Create index for market_title for faster searches
CREATE INDEX idx_bet_alerts_market_title ON public.bet_alerts(market_title);

-- Add comment to document the new columns
COMMENT ON COLUMN public.bet_alerts.market_title IS 'The full market question/title from Polymarket';
COMMENT ON COLUMN public.bet_alerts.outcome IS 'The outcome being bet on (e.g., Yes, No, or specific outcome name)';

