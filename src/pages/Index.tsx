import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FilterControls, FilterValues } from "@/components/FilterControls";
import { BetAlertCard } from "@/components/BetAlertCard";
import { MarketSummaryCard } from "@/components/MarketSummaryCard";
import { Activity, AlertCircle, Loader2, Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

const ITEMS_PER_PAGE = 9;

const Index = () => {
  const { toast } = useToast();
  const [allAlerts, setAllAlerts] = useState<BetAlert[]>([]);
  const [groupedMarkets, setGroupedMarkets] = useState<[string, BetAlert[]][]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState<"time" | "market">("time");
  const [filters, setFilters] = useState<FilterValues>({
    minTrades: 100,
    minRealizedPnl: 10000,
    minLargestWin: 1000,
    minPositionValue: 10000,
    minBetValue: 500,
  });

  const fetchAlerts = async (page: number = 1) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("bet_alerts")
        .select("*")
        .gte("total_trades", filters.minTrades)
        .gte("realized_pnl", filters.minRealizedPnl)
        .gte("largest_win", filters.minLargestWin)
        .gte("position_value", filters.minPositionValue)
        .gte("bet_value", filters.minBetValue);

      // Apply sorting
      if (sortBy === "market") {
        // For market sorting, fetch ALL data to properly group and sort
        const { data: allData, error: allError } = await query;
        if (allError) throw allError;

        // Group by market_title
        const groupedByMarket = (allData || []).reduce((acc, alert) => {
          const title = alert.market_title || "Unknown";
          if (!acc[title]) {
            acc[title] = [];
          }
          acc[title].push(alert);
          return acc;
        }, {} as Record<string, BetAlert[]>);

        // Sort markets by whale count (descending)
        const sortedMarkets = Object.entries(groupedByMarket).sort((a, b) => {
          const countDiff = b[1].length - a[1].length;
          if (countDiff !== 0) return countDiff;
          return a[0].localeCompare(b[0]);
        });

        // Store all grouped markets
        setGroupedMarkets(sortedMarkets);
        
        // Paginate by MARKET GROUPS (not individual alerts)
        const MARKETS_PER_PAGE = 3;
        const from = (page - 1) * MARKETS_PER_PAGE;
        const to = from + MARKETS_PER_PAGE;
        const paginatedMarkets = sortedMarkets.slice(from, to);
        
        // Flatten the paginated markets into alerts for display
        const paginatedAlerts: BetAlert[] = [];
        paginatedMarkets.forEach(([_, alerts]) => {
          paginatedAlerts.push(...alerts);
        });
        
        setAllAlerts(paginatedAlerts);
        setTotalCount(sortedMarkets.length); // Total number of MARKETS, not alerts
      } else {
        // Time sorting - get count and paginated data
        const { count } = await supabase
          .from("bet_alerts")
          .select("*", { count: "exact", head: true })
          .gte("total_trades", filters.minTrades)
          .gte("realized_pnl", filters.minRealizedPnl)
          .gte("largest_win", filters.minLargestWin)
          .gte("position_value", filters.minPositionValue)
          .gte("bet_value", filters.minBetValue);

        setTotalCount(count || 0);

        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        query = query.order("created_at", { ascending: false });
        const { data, error } = await query.range(from, to);
        if (error) throw error;
        setAllAlerts(data || []);
        setGroupedMarkets([]);
      }
    } catch (error: any) {
      toast({
        title: "Error loading alerts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchAlerts(1);
  }, [filters, sortBy]);

  useEffect(() => {
    fetchAlerts(currentPage);

    // Subscribe to real-time updates
    const channel = supabase
      .channel("bet_alerts_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bet_alerts",
        },
        (payload) => {
          const newAlert = payload.new as BetAlert;
          
          // Check if new alert meets current filter criteria
          if (
            newAlert.total_trades >= filters.minTrades &&
            Number(newAlert.realized_pnl) >= filters.minRealizedPnl &&
            Number(newAlert.largest_win) >= filters.minLargestWin &&
            Number(newAlert.position_value) >= filters.minPositionValue &&
            Number(newAlert.bet_value) >= filters.minBetValue
          ) {
            // If on first page, add alert respecting current sort order
            if (currentPage === 1) {
              if (sortBy === "market") {
                // For market sort, refetch to maintain proper grouping
                fetchAlerts(1);
              } else {
                // For time sort, add to top
                setAllAlerts((prev) => [newAlert, ...prev].slice(0, ITEMS_PER_PAGE));
              }
            }
            setTotalCount((prev) => prev + 1);
            
            toast({
              title: (
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-bold">New Whale Alert!</span>
                </div>
              ),
              description: (
                <span className="text-xs">
                  🐋 ${Number(newAlert.bet_value).toLocaleString()} bet detected
                </span>
              ),
              className: "max-w-[280px] sm:max-w-sm",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters, toast, sortBy, currentPage]);

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchAlerts(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const MARKETS_PER_PAGE = 3;
  const totalPages = sortBy === "market" 
    ? Math.ceil(totalCount / MARKETS_PER_PAGE) 
    : Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 glass-effect">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 max-w-7xl">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 glow-primary flex-shrink-0">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="text-center">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-gradient">Poly Whales Tracker</h1>
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground hidden sm:block">Track high-performance traders in real-time</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto flex-1 px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-7xl">
        <div className="space-y-4 sm:space-y-6 md:space-y-8">
          {/* Filters */}
          <FilterControls onFilterChange={handleFilterChange} currentFilters={filters} />

          {/* Alerts Feed */}
          <div>
            <div className="mb-4 sm:mb-6 flex flex-row items-center justify-between gap-2 sm:gap-3 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Recent Alerts</h2>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "time" | "market")}
                  className="rounded-lg bg-secondary/50 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-foreground border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="time">Sort by Time</option>
                  <option value="market">Sort by Market</option>
                </select>
                <div className="flex items-center gap-2 rounded-full bg-secondary/50 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-muted-foreground">
                  {loading && <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-primary" />}
                  <span>{totalCount} {sortBy === "market" ? "markets" : "total"}</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center rounded-2xl border border-border/50 glass-effect py-20">
                <div className="text-center">
                  <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                  <p className="mt-4 text-sm font-medium text-muted-foreground">Loading alerts...</p>
                </div>
              </div>
            ) : allAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 glass-effect py-20">
                <AlertCircle className="mb-4 h-16 w-16 text-muted-foreground" />
                <p className="text-xl font-bold">No alerts found</p>
                <p className="mt-2 text-sm text-muted-foreground">Try adjusting your filters to see more results</p>
              </div>
            ) : (
              <>
                {sortBy === "market" ? (
                  // Market view - show grouped markets
                  <div className="space-y-4 sm:space-y-5 md:space-y-6">
                    {(() => {
                      // Group the current page's alerts by market
                      const groupedAlerts = allAlerts.reduce((acc, alert) => {
                        const title = alert.market_title || "Unknown Market";
                        if (!acc[title]) {
                          acc[title] = [];
                        }
                        acc[title].push(alert);
                        return acc;
                      }, {} as Record<string, BetAlert[]>);

                      // Render MarketSummaryCard for each market on this page
                      return Object.entries(groupedAlerts).map(([marketTitle, alerts]) => (
                        <MarketSummaryCard key={marketTitle} marketTitle={marketTitle} alerts={alerts} />
                      ));
                    })()}
                  </div>
                ) : (
                  // Time view - show individual cards
                  <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {allAlerts.map((alert) => (
                      <BetAlertCard key={alert.id} alert={alert} />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 sm:mt-8 flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="rounded-lg sm:rounded-xl border border-border bg-secondary/30 px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-semibold backdrop-blur-sm transition-all hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-bold transition-all ${
                              currentPage === pageNum
                                ? "bg-primary text-primary-foreground glow-primary"
                                : "border border-border bg-secondary/30 backdrop-blur-sm hover:bg-secondary"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="rounded-lg sm:rounded-xl border border-border bg-secondary/30 px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-semibold backdrop-blur-sm transition-all hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer - Fixed at bottom */}
      <footer className="mt-auto border-t border-border/50 bg-card/30 backdrop-blur-md">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
          <p className="text-center text-xs sm:text-sm font-medium text-muted-foreground">
            Built by{" "}
            <a
              href="https://x.com/Zun2025"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary transition-colors hover:text-accent"
            >
              Zun
            </a>
            {" "}and{" "}
            <a
              href="https://x.com/Panchu2605"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary transition-colors hover:text-accent"
            >
              Panchu
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
