import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, TrendingUp, Wallet, DollarSign, Trophy, Target, BarChart3, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BetAlertCardProps {
  alert: {
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
  };
}

export const BetAlertCard = ({ alert }: BetAlertCardProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);
  };

  const timeAgo = formatDistanceToNow(new Date(alert.created_at), { addSuffix: true });

  return (
    <Card className="group relative overflow-hidden border-border/50 glass-effect transition-all duration-300 hover:border-primary/50 hover:shadow-2xl sm:hover:scale-[1.02] h-full flex flex-col">
      {/* Animated gradient overlay on hover */}
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-5 gradient-primary pointer-events-none" />

      {/* Card Header - Trader Info */}
      <CardHeader className="relative p-4 sm:p-5 pb-3 sm:pb-4 space-y-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 p-2 sm:p-2.5 flex-shrink-0 border border-primary/30">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Whale Trader</p>
              <p className="mt-0.5 font-mono text-xs sm:text-sm font-bold text-foreground truncate">
                {alert.trader_address.substring(0, 8)}...{alert.trader_address.substring(36)}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold backdrop-blur-sm whitespace-nowrap flex-shrink-0">
            {timeAgo}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative p-4 sm:p-5 pt-0 flex-1 flex flex-col space-y-3 sm:space-y-4">
        
        {/* Market Info - If Available */}
        {alert.market_title && (
          <div className="rounded-lg border border-accent/30 bg-gradient-to-br from-accent/5 to-primary/5 p-3 sm:p-3.5 backdrop-blur-sm">
            <div className="flex items-start gap-2">
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 flex items-start gap-2 flex-wrap">
                <p className="text-xs sm:text-sm font-bold text-foreground leading-tight break-words flex-1 min-w-0">
                  {alert.market_title}
                </p>
                {alert.outcome && (
                  <Badge variant="secondary" className="text-[10px] sm:text-xs bg-accent/20 text-accent border-accent/30 flex-shrink-0">
                    {alert.outcome}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Latest Bet Section */}
        {alert.bet_side && (
          <div className="rounded-lg border border-warning/30 bg-gradient-to-br from-warning/5 to-warning/10 p-3 sm:p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-md bg-warning/20 p-1.5">
                <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warning" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wide">Latest Bet</h3>
              <Badge
                variant={alert.bet_side === "BUY" ? "default" : "secondary"}
                className={`ml-auto text-[10px] sm:text-xs ${alert.bet_side === "BUY" ? "bg-success text-white" : "bg-destructive text-white"}`}
              >
                {alert.bet_side}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Bet Size</span>
                <span className="text-xs sm:text-sm font-bold text-foreground">{alert.bet_size?.toLocaleString()} shares</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Price</span>
                <span className="text-xs sm:text-sm font-bold text-foreground">{alert.bet_price ? formatPrice(alert.bet_price) : "N/A"}</span>
              </div>
              <Separator className="my-2 bg-warning/20" />
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground font-semibold">Total Value</span>
                <span className="text-base sm:text-lg font-bold text-gradient">{formatCurrency(alert.bet_value)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Trader Historical Performance Section */}
        <div className="rounded-lg border border-info/30 bg-gradient-to-br from-info/5 to-success/5 p-3 sm:p-4 backdrop-blur-sm flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="rounded-md bg-info/20 p-1.5">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-info" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wide">Historical Performance</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-info" />
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Total Trades</span>
              </div>
              <p className="text-sm sm:text-base font-bold text-foreground pl-4.5">{alert.total_trades.toLocaleString()}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-3 w-3 text-success" />
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Realized PNL</span>
              </div>
              <p className="text-sm sm:text-base font-bold text-success pl-4.5">{formatCurrency(Number(alert.realized_pnl))}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Trophy className="h-3 w-3 text-warning" />
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Largest Win</span>
              </div>
              <p className="text-sm sm:text-base font-bold text-foreground pl-4.5">{formatCurrency(Number(alert.largest_win))}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Target className="h-3 w-3 text-accent" />
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Position Value</span>
              </div>
              <p className="text-sm sm:text-base font-bold text-foreground pl-4.5">{formatCurrency(Number(alert.position_value))}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 sm:gap-3 pt-1">
          {alert.profile_url && (
            <a
              href={alert.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 border-border/50 bg-secondary/50 px-3 py-2 text-xs sm:text-sm font-bold backdrop-blur-sm transition-all hover:bg-secondary hover:border-primary/50 sm:hover:scale-105"
            >
              <span className="truncate">View Profile</span>
              <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
            </a>
          )}
          {alert.market_url && (
            <a
              href={alert.market_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-accent px-3 py-2 text-xs sm:text-sm font-bold text-white transition-all hover:opacity-90 sm:hover:scale-105 glow-primary"
            >
              <span className="truncate">View Market</span>
              <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
