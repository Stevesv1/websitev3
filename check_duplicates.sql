-- Check for duplicate alerts from same trader
SELECT 
  trader_address,
  market_slug,
  bet_side,
  bet_size,
  bet_price,
  bet_value,
  created_at,
  COUNT(*) as count
FROM bet_alerts
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY trader_address, market_slug, bet_side, bet_size, bet_price, bet_value, created_at
HAVING COUNT(*) > 1
ORDER BY created_at DESC
LIMIT 20;
