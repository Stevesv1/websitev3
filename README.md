# Poly Whales Tracker 🐋

A production-ready real-time monitoring dashboard for tracking high-performance whale traders on Polymarket with complete market context and continuous monitoring.

## ✨ Features

- **Real-time Whale Alerts**: Instant notifications when elite whale traders place bets
- **Continuous Monitoring**: Automated monitoring system that runs 24/7 like polymarketv1
- **Smart Duplicate Prevention**: Prevents exact duplicate trades while allowing multiple bets from same trader
- **Market Context**: See full market titles and outcomes for each bet
- **Historical Performance**: Comprehensive trader stats including PNL, position value, and trade history
- **Latest Bets Tracking**: Detailed view of the most recent bets with size, price, and value
- **Smart Filtering**: Customizable thresholds for trades, PNL, wins, and bet values
- **Live Updates**: Real-time Supabase subscriptions for instant alert delivery
- **Mobile-First Design**: Fully responsive interface optimized for all devices

## 🚀 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite 5
- **UI**: Tailwind CSS 3 + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Real-time + Edge Functions)
- **Data Fetching**: TanStack Query (React Query)
- **Monitoring**: Continuous polling with VPS script

## 📦 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173`

### 3. Deploy Edge Function

```bash
supabase functions deploy polymarket-monitor
```

### 4. Start Continuous Monitoring

#### Option A: Using VPS (Recommended for Production)

```bash
# Make the script executable
chmod +x vps-monitor.sh

# Start in a screen session
screen -S polymarket
./vps-monitor.sh

# Detach: Ctrl+A then D
# Reattach: screen -r polymarket
```

#### Option B: Manual Testing

```bash
curl -X POST https://ikogbedmigsgcgheusrd.supabase.co/functions/v1/polymarket-monitor \
  -H "Content-Type: application/json" \
  -d '{"preventDuplicates": false, "processAllTrades": true}'
```

## 🎛️ Configuration

### Monitoring Behavior

The system processes ALL trades from the Polymarket API and prevents duplicate ALERTS:

✅ **Allowed**: Same trader placing multiple bets → Multiple alerts
✅ **Allowed**: All legitimate trades are processed every time
❌ **Prevented**: Duplicate alerts (same trader + same market + same bet value within 1 hour)

**How it works:**
- Fetches last 100 trades from Polymarket API every 10 seconds
- Processes ALL trades in each batch (no trade-level deduplication)
- Before creating an alert, checks if identical alert exists (same trader, market, bet value)
- Only prevents duplicate ALERTS, not duplicate trade processing
- This matches polymarketv1 behavior: process everything, show unique alerts

### Monitoring Modes

Edit `vps-monitor.sh` line 71 to change mode:

**Mode 1: Continuous (Default)**
```json
{"preventDuplicates": false, "processAllTrades": true}
```
- Alerts on every qualifying bet
- Prevents only exact duplicates
- Best for production

**Mode 2: Deduplicated**
```json
{"preventDuplicates": true, "processAllTrades": true}
```
- One alert per trader per 5 minutes
- Reduces notification noise
- Best for testing

### Custom Thresholds

```json
{
  "thresholds": {
    "minTrades": 100,
    "minRealizedPnl": 10000,
    "minLargestWin": 1000,
    "minPositionValue": 10000,
    "minBetValue": 500
  }
}
```

## 📊 How It Works

1. **VPS Script** calls edge function every 10 seconds
2. **Edge Function**:
   - Fetches last 100 trades from Polymarket API
   - Processes ALL trades (no trade-level deduplication)
   - For each trade, checks trader stats against thresholds
   - Before creating alert, checks if identical alert exists in last hour
   - Creates alert only if trader qualifies AND no duplicate alert exists
3. **Frontend** receives real-time updates via Supabase subscriptions
4. **Users** can filter and view alerts with custom thresholds

**Key Insight:** We process every trade in every API call (like polymarketv1), but prevent duplicate ALERTS at the database level. This ensures:
- Every qualifying trade is evaluated
- No missed opportunities due to overly aggressive deduplication
- No duplicate alerts shown to users
- Same trader can have multiple alerts for different bets

## 🔍 Understanding the Output

### VPS Monitor Output

```
[2025-01-26 10:30:45] ✅ Processed 45/100 trades → 3 NEW ALERTS!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 HIGH-PERFORMANCE BETTOR DETECTED!

👤 Address: 0x1234567890abcdef...
🔗 Profile: https://polymarket.com/profile/0x1234567890abcdef...

📊 Trader Historical Stats:
   • Total Trades: 250
   • Realized PNL: $15,000 USD
   • Position Value: $12,000 USD
   • Largest Win: $3,500 USD

💰 Latest Bet Value: $750 USD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🆘 Troubleshooting

### No Alerts Appearing

1. Check if monitoring is running: `screen -ls`
2. Lower thresholds in the edge function call
3. Check edge function logs: `supabase functions logs polymarket-monitor`

### Too Many Alerts

1. Enable duplicate prevention: `"preventDuplicates": true`
2. Increase thresholds
3. Increase check interval in `vps-monitor.sh`

### Website Not Showing Alerts

1. Check database: Alerts should be in `bet_alerts` table
2. Check frontend filters
3. Check browser console for errors

## 👥 Authors

Built by [Zun](https://x.com/Zun2025) and [Panchu](https://x.com/Panchu2605)

---

## Original Lovable Project Info

**URL**: https://lovable.dev/projects/37fcbcf7-a8e8-42df-8140-b8e57c8d266a

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/37fcbcf7-a8e8-42df-8140-b8e57c8d266a) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/37fcbcf7-a8e8-42df-8140-b8e57c8d266a) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
