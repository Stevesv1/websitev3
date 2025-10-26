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
  id: string;
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
  thresholds = DEFAULT_THRESHOLDS
) {
  const address = extractUserAddress(trade);
  if (!address) {
    console.log("No address found in trade");
    return null;
  }

  // Calculate bet value
  const betSize = parseFloat(trade.size?.toString() || trade.amount?.toString() || "0");
  const betPrice = parseFloat(trade.price?.toString() || "0");
  const betValue = betSize * betPrice;

  // Skip if bet value is too small
  if (betValue < thresholds.minBetValue) {
    console.log(`Bet value $${betValue} below threshold $${thresholds.minBetValue}`);
    return null;
  }

  console.log(`Processing user ${address.substring(0, 10)}... with bet value $${betValue}`);

  try {
    // Fetch user stats
    const [leaderboardStats, positionValue, profileStats] = await Promise.all([
      getLeaderboardStats(address),
      getPositionValue(address),
      getProfileStats(address),
    ]);

    // Calculate metrics
    const totalTrades = parseInt(profileStats.trades || 0, 10);
    const realizedPnl = parseFloat(leaderboardStats?.pnl || 0);
    const largestWin = parseFloat(profileStats.largestWin || 0);

    console.log(`User stats: trades=${totalTrades}, pnl=${realizedPnl}, largestWin=${largestWin}, positionValue=${positionValue}`);

    // Check if meets thresholds
    if (
      totalTrades >= thresholds.minTrades &&
      realizedPnl >= thresholds.minRealizedPnl &&
      largestWin >= thresholds.minLargestWin &&
      positionValue >= thresholds.minPositionValue
    ) {
      console.log(`✅ User meets thresholds! Checking for duplicates...`);

      // Check if we already have a recent alert for this trader (within last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: existingAlerts } = await supabaseClient
        .from("bet_alerts")
        .select("id")
        .eq("trader_address", address)
        .gte("created_at", fiveMinutesAgo)
        .limit(1);

      if (existingAlerts && existingAlerts.length > 0) {
        console.log(`⏭️  Skipping - alert already exists for this trader in last 5 minutes`);
        return null;
      }

      console.log(`Creating new alert...`);

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

      // Insert alert
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
        console.error("Error inserting alert:", error);
        return null;
      }

      console.log("✅ Alert created successfully!");
      return { address, totalTrades, realizedPnl, largestWin, positionValue, betValue };
    } else {
      console.log("❌ User does not meet thresholds");
      return null;
    }
  } catch (error) {
    console.error(`Error processing user ${address}:`, error);
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

    // Get custom thresholds from request or use defaults
    const { thresholds = DEFAULT_THRESHOLDS } = await req.json().catch(() => ({}));
    console.log("Using thresholds:", thresholds);

    // Fetch recent trades
    const recentTrades = await getRecentTrades(100);
    console.log(`Found ${recentTrades.length} recent trades`);

    const processedAddresses = new Set<string>();
    const alerts = [];

    // Process each trade
    for (const trade of recentTrades) {
      const address = extractUserAddress(trade);

      // Skip if already processed this address in this run
      if (!address || processedAddresses.has(address)) {
        continue;
      }

      processedAddresses.add(address);

      const result = await processUser(trade, supabaseClient, thresholds);
      if (result) {
        alerts.push(result);
      }

      // Add small delay between processing users
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS));
    }

    console.log(`=== Monitor Complete: ${alerts.length} alerts created ===`);

    return new Response(
      JSON.stringify({
        success: true,
        tradesProcessed: recentTrades.length,
        uniqueAddresses: processedAddresses.size,
        alertsCreated: alerts.length,
        alerts,
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
