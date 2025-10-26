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
    local response=$(curl -s -w "\n%{http_code}" -X POST "$SUPABASE_FUNCTION_URL" \
        -H "Content-Type: application/json" \
        -d '{}' 2>&1)

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ]; then
        if command -v jq &> /dev/null; then
            local trades=$(echo "$body" | jq -r '.tradesProcessed // 0')
            local addresses=$(echo "$body" | jq -r '.uniqueAddresses // 0')
            local alerts=$(echo "$body" | jq -r '.alertsCreated // 0')

            if [ "$alerts" -gt 0 ]; then
                log_success "Processed $trades trades, $addresses traders → $alerts NEW ALERTS!"
                echo "$body" | jq -r '.alerts[]? | "  → \(.address) | Trades: \(.totalTrades) | PNL: $\(.realizedPnl) | Bet: $\(.betValue)"'
            else
                log "Processed $trades trades, $addresses traders, no new alerts"
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
