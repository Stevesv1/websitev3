-- Find potential duplicate alerts
WITH recent_alerts AS (
  SELECT 
    id,
    trader_address,
    market_slug,
    market_title,
    outcome,
    bet_side,
    ROUND(bet_size::numeric, 2) as bet_size,
    ROUND(bet_price::numeric, 4) as bet_price,
    ROUND(bet_value::numeric, 2) as bet_value,
    total_trades,
    ROUND(position_value::numeric, 2) as position_value,
    created_at
  FROM bet_alerts
  WHERE created_at > NOW() - INTERVAL '2 hours'
  ORDER BY created_at DESC
),
grouped_alerts AS (
  SELECT 
    trader_address,
    market_slug,
    COUNT(*) as alert_count,
    json_agg(
      json_build_object(
        'id', id,
        'created_at', created_at,
        'bet_side', bet_side,
        'bet_size', bet_size,
        'bet_price', bet_price,
        'bet_value', bet_value,
        'market_title', market_title,
        'outcome', outcome,
        'total_trades', total_trades,
        'position_value', position_value
      ) ORDER BY created_at DESC
    ) as alerts
  FROM recent_alerts
  GROUP BY trader_address, market_slug
  HAVING COUNT(*) > 1
)
SELECT * FROM grouped_alerts;
