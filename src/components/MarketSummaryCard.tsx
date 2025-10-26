import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Target, TrendingUp, Users } from "lucide-react";
import { BetAlertCard } from "./BetAlertCard";

interface BetAlert {
  id: string;
  trader_address: string;
  total_trades: number;
  realized_pnl: number;
  position_value: number;
  largest_win: number;
  bet_side: string | null;
  bet_size: number | null;
  bet_price: number | null;
  bet_value: number;
  market_slug: string | null;
  market_url: string | null;
  profile_url: string | null;
  market_title: string | null;
  outcome: string | null;
  created_at: string;
}

interface MarketSummaryCardProps {
  marketTitle: string;
  alerts: BetAlert[];
}

export const MarketSummaryCard = ({ marketTitle, alerts }: MarketSummaryCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalTrades = alerts.length;
  const totalBetValue = alerts.reduce((sum, alert) => sum + alert.bet_value, 0);
  
  // Calculate majority outcome
  const outcomeCounts = alerts.reduce((acc, alert) => {
    const outcome = alert.outcome || "Unknown";
    acc[outcome] = (acc[outcome] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const majorityOutcome = Object.entries(outcomeCounts).sort((a, b) => b[1] - a[1])[0];
  const majorityPercentage = majorityOutcome ? Math.round((majorityOutcome[1] / totalTrades) * 100) : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card 
        className="group relative overflow-hidden border-border/50 glass-effect transition-all duration-300 hover:border-primary/50 hover:shadow-xl cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-5 gradient-primary pointer-events-none" />

        <CardHeader className="relative p-4 sm:p-5 pb-3 sm:pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 p-2 sm:p-2.5 flex-shrink-0 border border-accent/30">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-foreground leading-tight break-words">
                  {marketTitle}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px] sm:text-xs bg-primary/20 text-primary border-primary/30">
                    {majorityOutcome?.[0]} • {majorityPercentage}%
                  </Badge>
                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                    {totalTrades} whale{totalTrades > 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-primary" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative p-4 sm:p-5 pt-0">
          <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-info" />
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Total Whales</p>
                <p className="font-bold text-foreground">{totalTrades}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Total Volume</p>
                <p className="font-bold text-success">{formatCurrency(totalBetValue)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expanded Individual Alerts */}
      {isExpanded && (
        <div className="ml-4 sm:ml-6 space-y-3 sm:space-y-4 border-l-2 border-primary/30 pl-4 sm:pl-6">
          {[...alerts]
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((alert) => (
              <BetAlertCard key={alert.id} alert={alert} />
            ))}
        </div>
      )}
    </div>
  );
};
