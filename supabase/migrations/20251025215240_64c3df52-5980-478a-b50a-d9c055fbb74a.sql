-- Enable realtime for bet_alerts table
ALTER TABLE public.bet_alerts REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.bet_alerts;