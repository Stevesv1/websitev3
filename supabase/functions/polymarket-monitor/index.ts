// @ts-ignore - Deno imports work in Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno imports work in Supabase Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Polymarket API configuration
const POLYMARKET_API_BASE = "https://data-api.polymarket.com";
const RATE_LIMIT_MS = 100;

// Thresholds (can be adjusted)
const DEFAULT_THRESHOLDS = {
  minTrades: 100,
  minRealizedPnl: 10000,
  minLargestWin: 1000,
  minPositionValue: 10000,
  minBetValue: 500,
};

interface Trade {
  id?: string;
  transactionHash?: string;
  transaction_hash?: string;
  proxyWallet?: string;
  maker_address?: string;
  taker_address?: string;
  size?: number;
  amount?: number;
  price?: number;
  side?: string;
  timestamp?: string;
  created_at?: string;
  market?: string;
  asset_id?: string;
  asset?: string;
  eventSlug?: string;
  slug?: string;
  market_slug?: string;
  title?: string;
  outcome?: string;
}

let lastRequestTime = 0;

async function rateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
}

async function fetchWithRateLimit(url: string) {
  await rateLimit();
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

async function getRecentTrades(limit = 100): Promise<Trade[]> {
  console.log(`Fetching ${limit} recent trades...`);
  const data = await fetchWithRateLimit(`${POLYMARKET_API_BASE}/trades?_limit=${limit}`);
  return data || [];
}

async function getLeaderboardStats(address: string) {
  try {
    const data = await fetchWithRateLimit(
      `${POLYMARKET_API_BASE}/v1/leaderboard?timePeriod=all&orderBy=VOL&limit=1&offset=0&category=overall&user=${address}`
    );
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error(`Error fetching leaderboard for ${address}:`, error);
    return null;
  }
}

async function getPositionValue(address: string): Promise<number> {
  try {
    const data = await fetchWithRateLimit(`${POLYMARKET_API_BASE}/value?user=${address}`);
    if (Array.isArray(data) && data.length > 0) {
      return parseFloat(data[0].value || 0);
    }
    return 0;
  } catch (error) {
    console.error(`Error fetching position value for ${address}:`, error);
    return 0;
  }
}

async function getProfileStats(address: string) {
  try {
    const response = await fetch(`https://polymarket.com/api/profile/stats?proxyAddress=${address}`);
    if (!response.ok) return {};
    return await response.json();
  } catch (error) {
    console.error(`Error fetching profile stats for ${address}:`, error);
    return {};
  }
}

function extractUserAddress(trade: Trade): string | null {
  return (
    trade.proxyWallet || trade.maker_address || trade.taker_address || null
  );
}

async function processUser(
  trade: Trade,
  supabaseClient: any,
  thresholds = DEFAULT_THRESHOLDS,
  preventDuplicates = false
) {
  const address = extractUserAddress(trade);
  if (!address) {
    return null;
  }

  // Calculate bet value
  const betSize = parseFloat(trade.size?.toString() || trade.amount?.toString() || "0");
  const betPrice = parseFloat(trade.price?.toString() || "0");
  const betValue = betSize * betPrice;

  // Skip if bet value is too small
  if (betValue < thresholds.minBetValue) {
    return null;
  }

  try {
    // Fetch user stats (silent processing like polymarketv1)
    const [leaderboardStats, positionValue, profileStats] = await Promise.all([
      getLeaderboardStats(address),
      getPositionValue(address),
      getProfileStats(address),
    ]);

    // Calculate metrics
    const totalTrades = parseInt(profileStats.trades || 0, 10);
    const realizedPnl = parseFloat(leaderboardStats?.pnl || 0);
    const largestWin = parseFloat(profileStats.largestWin || 0);

    // Check if meets thresholds
    if (
      totalTrades >= thresholds.minTrades &&
      realizedPnl >= thresholds.minRealizedPnl &&
      largestWin >= thresholds.minLargestWin &&
      positionValue >= thresholds.minPositionValue
    ) {
      // Construct URLs
      const profileUrl = `https://polymarket.com/profile/${address}`;
      let marketUrl = null;
      const marketSlug = trade.eventSlug || trade.slug || trade.market_slug;

      if (marketSlug && marketSlug !== "unknown") {
        marketUrl = `https://polymarket.com/event/${marketSlug}`;
      } else if (trade.market) {
        marketUrl = `https://polymarket.com/market/${trade.market}`;
      }

      // Extract market title and outcome
      const marketTitle = trade.title || null;
      const outcome = trade.outcome || null;

      // Insert alert - database unique constraint prevents duplicates
      const { error } = await supabaseClient.from("bet_alerts").insert({
        trader_address: address,
        total_trades: totalTrades,
        realized_pnl: realizedPnl,
        position_value: positionValue,
        largest_win: largestWin,
        bet_side: trade.side || null,
        bet_size: betSize,
        bet_price: betPrice,
        bet_value: betValue,
        market_slug: marketSlug || null,
        market_url: marketUrl,
        profile_url: profileUrl,
        market_title: marketTitle,
        outcome: outcome,
      });

      if (error) {
        // Check if it's a duplicate constraint violation (code 23505)
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          console.log(`⏭️  Skipping - duplicate alert for ${address.substring(0, 10)}... (same bet already exists)`);
          return null;
        }
        console.error("Error inserting alert:", error);
        return null;
      }

      console.log(`✅ Alert created for ${address.substring(0, 10)}... - $${betValue.toLocaleString()} bet`);
      return { address, totalTrades, realizedPnl, largestWin, positionValue, betValue };
    }

    return null;
  } catch (error) {
    // Silent error handling like polymarketv1
    if (error instanceof Error && (error.message.includes('rate limit') || error.message.includes('timeout'))) {
      // Ignore transient errors
    } else {
      console.error(`⚠️  Error processing user ${address.substring(0, 10)}...:`, error);
    }
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Polymarket Monitor Started ===");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get custom thresholds and options from request or use defaults
    const {
      thresholds = DEFAULT_THRESHOLDS,
      preventDuplicates = false,
      processAllTrades = true
    } = await req.json().catch(() => ({}));

    console.log("Using thresholds:", thresholds);
    console.log("Duplicate prevention:", preventDuplicates ? "enabled (5 min)" : "disabled");
    console.log("Process all trades:", processAllTrades);

    // Fetch recent trades
    const recentTrades = await getRecentTrades(100);
    console.log(`Found ${recentTrades.length} recent trades`);

    const alerts = [];
    let tradesProcessed = 0;
    const seenTradesInBatch = new Set<string>();

    // Process each trade (similar to polymarketv1 logic)
    for (const trade of recentTrades) {
      const address = extractUserAddress(trade);

      if (!address) {
        continue;
      }

      // Calculate bet value first
      const betSize = parseFloat(trade.size?.toString() || trade.amount?.toString() || "0");
      const betPrice = parseFloat(trade.price?.toString() || "0");
      const betValue = betSize * betPrice;

      // Create unique trade ID using transactionHash (unique per blockchain transaction)
      // Polymarket API returns transactionHash which is unique for each trade
      const transactionHash = (trade as any).transactionHash ||
                              (trade as any).transaction_hash ||
                              `${address}-${(trade as any).asset || (trade as any).asset_id || 'unknown'}-${trade.timestamp || trade.created_at}-${betSize}`;

      // Skip duplicates within THIS batch only (not across function calls)
      // This prevents processing the same trade twice in one API response
      if (seenTradesInBatch.has(transactionHash)) {
        continue;
      }

      seenTradesInBatch.add(transactionHash);
      tradesProcessed++;

      // Skip if bet value is less than minimum threshold
      if (betValue < thresholds.minBetValue) {
        continue;
      }

      // Process user (with optional duplicate prevention)
      const result = await processUser(trade, supabaseClient, thresholds, preventDuplicates);
      if (result) {
        alerts.push(result);
      }

      // Add small delay between processing users to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS));
    }

    console.log(`=== Monitor Complete: ${alerts.length} alerts created from ${tradesProcessed} trades ===`);

    return new Response(
      JSON.stringify({
        success: true,
        tradesProcessed,
        totalTradesFetched: recentTrades.length,
        alertsCreated: alerts.length,
        alerts,
        config: {
          preventDuplicates,
          thresholds
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in monitor function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
