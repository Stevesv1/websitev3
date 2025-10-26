-- Create table for storing bet alerts
CREATE TABLE public.bet_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trader_address TEXT NOT NULL,
  total_trades INTEGER NOT NULL,
  realized_pnl DECIMAL(20, 2) NOT NULL,
  position_value DECIMAL(20, 2) NOT NULL,
  largest_win DECIMAL(20, 2) NOT NULL,
  bet_side TEXT,
  bet_size DECIMAL(20, 2),
  bet_price DECIMAL(10, 4),
  bet_value DECIMAL(20, 2) NOT NULL,
  market_slug TEXT,
  market_url TEXT,
  profile_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_bet_alerts_created_at ON public.bet_alerts(created_at DESC);
CREATE INDEX idx_bet_alerts_trader ON public.bet_alerts(trader_address);
CREATE INDEX idx_bet_alerts_filters ON public.bet_alerts(total_trades, realized_pnl, largest_win, position_value, bet_value);

-- Enable Row Level Security
ALTER TABLE public.bet_alerts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read bet alerts (public data)
CREATE POLICY "Anyone can view bet alerts" 
ON public.bet_alerts 
FOR SELECT 
USING (true);

-- Create table for user filter preferences
CREATE TABLE public.user_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  min_trades INTEGER NOT NULL DEFAULT 100,
  min_realized_pnl DECIMAL(20, 2) NOT NULL DEFAULT 10000,
  min_largest_win DECIMAL(20, 2) NOT NULL DEFAULT 1000,
  min_position_value DECIMAL(20, 2) NOT NULL DEFAULT 10000,
  min_bet_value DECIMAL(20, 2) NOT NULL DEFAULT 500,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security for user filters
ALTER TABLE public.user_filters ENABLE ROW LEVEL SECURITY;

-- Users can view their own filters (or default if not logged in)
CREATE POLICY "Users can view own filters" 
ON public.user_filters 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can create their own filters
CREATE POLICY "Users can create own filters" 
ON public.user_filters 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own filters
CREATE POLICY "Users can update own filters" 
ON public.user_filters 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_filters_updated_at
BEFORE UPDATE ON public.user_filters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();