#!/bin/bash
################################################################################
# Polymarket Prime Alerts - VPS Monitor Script (Screen Session Optimized)
#
# This script runs on an external VPS server in a screen session and
# continuously monitors Polymarket for elite trader activity.
#
# Usage:
#   screen -S polymarket
#   ./vps-monitor.sh
#   Ctrl+A then D to detach
#   screen -r polymarket to reattach
################################################################################

# Configuration
SUPABASE_PROJECT_URL="https://ikogbedmigsgcgheusrd.supabase.co"
SUPABASE_FUNCTION_URL="${SUPABASE_PROJECT_URL}/functions/v1/polymarket-monitor"
CHECK_INTERVAL=10  # seconds between checks
LOG_FILE="./polymarket-monitor.log"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

################################################################################
# Functions
################################################################################

log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[${timestamp}]${NC} $1"
    echo "[${timestamp}] $1" >> "$LOG_FILE"
}

log_success() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[${timestamp}] ✅ $1${NC}"
    echo "[${timestamp}] ✅ $1" >> "$LOG_FILE"
}

log_error() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[${timestamp}] ❌ $1${NC}"
    echo "[${timestamp}] ❌ $1" >> "$LOG_FILE"
}

log_warning() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[${timestamp}] ⚠️  $1${NC}"
    echo "[${timestamp}] ⚠️ $1" >> "$LOG_FILE"
}

check_dependencies() {
    if ! command -v curl &> /dev/null; then
        log_error "curl is not installed. Install: sudo apt-get install curl"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        log_warning "jq not installed. Install for better output: sudo apt-get install jq"
    fi
}

trigger_monitor() {
    # Send request with preventDuplicates=false to match polymarketv1 behavior
    # This will alert on EVERY qualifying bet, not just once per trader
    local response=$(curl -s -w "\n%{http_code}" -X POST "$SUPABASE_FUNCTION_URL" \
        -H "Content-Type: application/json" \
        -d '{"preventDuplicates": false, "processAllTrades": true}' 2>&1)

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ]; then
        if command -v jq &> /dev/null; then
            local trades=$(echo "$body" | jq -r '.tradesProcessed // 0')
            local total_fetched=$(echo "$body" | jq -r '.totalTradesFetched // 0')
            local alerts=$(echo "$body" | jq -r '.alertsCreated // 0')

            if [ "$alerts" -gt 0 ]; then
                log_success "Processed $trades/$total_fetched trades → $alerts NEW ALERTS!"
                echo ""
                echo "$body" | jq -r '.alerts[]? | "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🚨 HIGH-PERFORMANCE BETTOR DETECTED!\n\n👤 Address: \(.address)\n🔗 Profile: https://polymarket.com/profile/\(.address)\n\n📊 Trader Historical Stats:\n   • Total Trades: \(.totalTrades)\n   • Realized PNL: $\(.realizedPnl | tonumber | floor) USD\n   • Position Value: $\(.positionValue | tonumber | floor) USD\n   • Largest Win: $\(.largestWin | tonumber | floor) USD\n\n💰 Latest Bet Value: $\(.betValue | tonumber | floor) USD\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"'
                echo ""
            else
                log "Processed $trades/$total_fetched trades, no new alerts"
            fi
        else
            if echo "$body" | grep -q '"alertsCreated":[1-9]'; then
                log_success "NEW ALERTS CREATED!"
                echo "$body"
            else
                log "Monitor completed - no new alerts"
            fi
        fi
        return 0
    else
        log_error "HTTP $http_code - $body"
        return 1
    fi
}

show_banner() {
    clear
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                                                            ║"
    echo "║           🐋 Poly Whales Tracker Monitor 🐋               ║"
    echo "║                                                            ║"
    echo "║  Running in Screen Session                                ║"
    echo "║  Press Ctrl+A then D to detach                            ║"
    echo "║  Press Ctrl+C to stop                                     ║"
    echo "║                                                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "📊 Configuration:"
    echo "  • Supabase URL: $SUPABASE_PROJECT_URL"
    echo "  • Check Interval: ${CHECK_INTERVAL}s"
    echo "  • Log File: $LOG_FILE"
    echo "  • Duplicate Prevention: DISABLED (alerts on every bet)"
    echo "  • Mode: Continuous monitoring (like polymarketv1)"
    echo ""
    echo "🔔 Alert Mode: Every qualifying bet (no duplicate prevention)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

################################################################################
# Main Script
################################################################################

# Check if running inside screen
if [ -z "$STY" ]; then
    echo "⚠️  WARNING: Not running in a screen session!"
    echo ""
    echo "Recommended usage:"
    echo "  screen -S polymarket"
    echo "  ./vps-monitor.sh"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

show_banner

# Setup
check_dependencies
touch "$LOG_FILE"

log "Starting Polymarket monitor..."
echo ""

# Trap Ctrl+C
trap 'echo ""; log "Monitor stopped by user"; exit 0' INT TERM

# Main monitoring loop
iteration=0
while true; do
    iteration=$((iteration + 1))

    log "Check #$iteration - Triggering monitor..."

    if trigger_monitor; then
        sleep "$CHECK_INTERVAL"
    else
        log_warning "Retrying in 30 seconds..."
        sleep 30
    fi
done
