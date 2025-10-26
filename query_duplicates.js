const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://ikogbedmigsgcgheusrd.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrb2diZWRtaWdzZ2NnaGV1c3JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk4NzI5NzcsImV4cCI6MjA0NTQ0ODk3N30.Uh_Ks-Yz_Uh_Ks-Yz_Uh_Ks-Yz_Uh_Ks-Yz_Uh_Ks-Yz';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findDuplicates() {
  // Get recent alerts from last hour
  const { data: alerts, error } = await supabase
    .from('bet_alerts')
    .select('*')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching alerts:', error);
    return;
  }

  console.log(`\nTotal alerts in last hour: ${alerts.length}\n`);

  // Group by trader address and market
  const grouped = {};
  alerts.forEach(alert => {
    const key = `${alert.trader_address}-${alert.market_slug || 'unknown'}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(alert);
  });

  // Find duplicates
  console.log('=== POTENTIAL DUPLICATES ===\n');
  let foundDuplicates = false;

  Object.entries(grouped).forEach(([key, group]) => {
    if (group.length > 1) {
      foundDuplicates = true;
      console.log(`\n🔍 Trader + Market: ${key}`);
      console.log(`   Found ${group.length} alerts:\n`);
      
      group.forEach((alert, idx) => {
        console.log(`   Alert ${idx + 1}:`);
        console.log(`     - ID: ${alert.id}`);
        console.log(`     - Created: ${alert.created_at}`);
        console.log(`     - Bet Side: ${alert.bet_side}`);
        console.log(`     - Bet Size: ${alert.bet_size}`);
        console.log(`     - Bet Price: ${alert.bet_price}`);
        console.log(`     - Bet Value: $${alert.bet_value}`);
        console.log(`     - Market: ${alert.market_title || alert.market_slug}`);
        console.log(`     - Outcome: ${alert.outcome}`);
        console.log(`     - Total Trades: ${alert.total_trades}`);
        console.log(`     - Position Value: $${alert.position_value}`);
        console.log('');
      });

      // Check if they're truly identical
      const first = group[0];
      const identical = group.every(a => 
        a.bet_side === first.bet_side &&
        a.bet_size === first.bet_size &&
        a.bet_price === first.bet_price &&
        Math.abs(a.bet_value - first.bet_value) < 0.01
      );

      if (identical) {
        console.log(`   ⚠️  EXACT DUPLICATES - Same bet details!\n`);
      } else {
        console.log(`   ✅ Different bets - Legitimate multiple trades\n`);
      }
    }
  });

  if (!foundDuplicates) {
    console.log('No duplicates found in last hour.\n');
  }
}

findDuplicates().catch(console.error);
