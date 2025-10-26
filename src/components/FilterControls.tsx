import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, DollarSign } from "lucide-react";

export interface FilterValues {
  minTrades: number;
  minRealizedPnl: number;
  minLargestWin: number;
  minPositionValue: number;
  minBetValue: number;
}

interface FilterControlsProps {
  onFilterChange: (filters: FilterValues) => void;
  currentFilters: FilterValues;
}

const TRADER_PRESETS = [
  {
    name: "Starter",
    emoji: "🐟",
    filters: { minTrades: 100, minRealizedPnl: 10000, minLargestWin: 1000, minPositionValue: 10000 },
  },
  {
    name: "Advanced",
    emoji: "🐬",
    filters: { minTrades: 500, minRealizedPnl: 50000, minLargestWin: 10000, minPositionValue: 50000 },
  },
  {
    name: "Expert",
    emoji: "🦈",
    filters: { minTrades: 1000, minRealizedPnl: 100000, minLargestWin: 25000, minPositionValue: 100000 },
  },
  {
    name: "Elite",
    emoji: "🐋",
    filters: { minTrades: 1500, minRealizedPnl: 150000, minLargestWin: 50000, minPositionValue: 150000 },
  },
];

const BET_VALUE_PRESETS = [
  { value: 500, label: "$500" },
  { value: 1000, label: "$1K" },
  { value: 5000, label: "$5K" },
  { value: 10000, label: "$10K" },
];

export const FilterControls = ({ onFilterChange, currentFilters }: FilterControlsProps) => {
  const [customFilters, setCustomFilters] = useState<FilterValues>(currentFilters);

  const applyPreset = (preset: typeof TRADER_PRESETS[0], betValue?: number) => {
    const newFilters = {
      ...preset.filters,
      minBetValue: betValue || currentFilters.minBetValue,
    };
    setCustomFilters(newFilters);
    onFilterChange(newFilters);
  };

  const applyBetValuePreset = (betValue: number) => {
    const newFilters = { ...currentFilters, minBetValue: betValue };
    setCustomFilters(newFilters);
    onFilterChange(newFilters);
  };

  const applyCustomFilters = () => {
    onFilterChange(customFilters);
  };

  return (
    <Card className="border-border/50 glass-effect overflow-hidden">
      <CardContent className="p-3 sm:p-4 md:p-5">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-sm sm:text-base font-bold text-foreground">Filters</h3>
          <div className="text-[10px] sm:text-xs text-accent/80 font-medium">
            Quick presets or custom
          </div>
        </div>

        <Tabs defaultValue="presets" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8 sm:h-9 mb-3 sm:mb-4 bg-secondary/50">
            <TabsTrigger value="presets" className="text-[10px] sm:text-xs font-semibold data-[state=active]:bg-blue-900 data-[state=active]:text-white">
              Quick Presets
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-[10px] sm:text-xs font-semibold data-[state=active]:bg-blue-900 data-[state=active]:text-white">
              Custom Values
            </TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="space-y-3 mt-0">
            {/* Combined Row: Whale Tier and Min Bet */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {/* Trader Level Presets */}
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-primary hidden md:block" />
                  <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-primary">Whale Tier</Label>
                </div>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  {TRADER_PRESETS.map((preset) => (
                    <Button
                      key={preset.name}
                      variant={
                        currentFilters.minTrades === preset.filters.minTrades &&
                        currentFilters.minRealizedPnl === preset.filters.minRealizedPnl
                          ? "default"
                          : "outline"
                      }
                      onClick={() => applyPreset(preset)}
                      className={`h-auto py-2 px-2 sm:px-3 rounded-lg font-bold text-xs sm:text-sm transition-all sm:hover:scale-105 ${
                        currentFilters.minTrades === preset.filters.minTrades &&
                        currentFilters.minRealizedPnl === preset.filters.minRealizedPnl
                          ? "bg-blue-900 text-white hover:bg-blue-900"
                          : ""
                      }`}
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Bet Value Presets */}
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3 text-success hidden md:block" />
                  <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-success">Min Bet</Label>
                </div>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  {BET_VALUE_PRESETS.map((preset) => (
                    <Button
                      key={preset.value}
                      variant={currentFilters.minBetValue === preset.value ? "default" : "outline"}
                      onClick={() => applyBetValuePreset(preset.value)}
                      className={`h-auto py-2 px-2 sm:px-3 rounded-lg font-bold text-xs sm:text-sm transition-all sm:hover:scale-105 ${
                        currentFilters.minBetValue === preset.value ? "bg-blue-900 text-white hover:bg-blue-900" : ""
                      }`}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-2 sm:space-y-2.5 mt-0">
            <div className="space-y-2">
              {/* First Row: 3 fields */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                <div className="space-y-0.5 sm:space-y-1">
                  <Label htmlFor="minTrades" className="text-[10px] sm:text-xs font-semibold text-info">Trades</Label>
                  <Input
                    id="minTrades"
                    type="number"
                    placeholder="100"
                    value={customFilters.minTrades}
                    onChange={(e) =>
                      setCustomFilters({ ...customFilters, minTrades: parseInt(e.target.value) || 0 })
                    }
                    className="h-8 sm:h-9 text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-0.5 sm:space-y-1">
                  <Label htmlFor="minRealizedPnl" className="text-[10px] sm:text-xs font-semibold text-success">PNL ($)</Label>
                  <Input
                    id="minRealizedPnl"
                    type="number"
                    placeholder="10000"
                    value={customFilters.minRealizedPnl}
                    onChange={(e) =>
                      setCustomFilters({ ...customFilters, minRealizedPnl: parseInt(e.target.value) || 0 })
                    }
                    className="h-8 sm:h-9 text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-0.5 sm:space-y-1">
                  <Label htmlFor="minLargestWin" className="text-[10px] sm:text-xs font-semibold text-warning">Largest Win ($)</Label>
                  <Input
                    id="minLargestWin"
                    type="number"
                    placeholder="1000"
                    value={customFilters.minLargestWin}
                    onChange={(e) =>
                      setCustomFilters({ ...customFilters, minLargestWin: parseInt(e.target.value) || 0 })
                    }
                    className="h-8 sm:h-9 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Second Row: 2 fields */}
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                <div className="space-y-0.5 sm:space-y-1">
                  <Label htmlFor="minPositionValue" className="text-[10px] sm:text-xs font-semibold text-accent">Position ($)</Label>
                  <Input
                    id="minPositionValue"
                    type="number"
                    placeholder="10000"
                    value={customFilters.minPositionValue}
                    onChange={(e) =>
                      setCustomFilters({ ...customFilters, minPositionValue: parseInt(e.target.value) || 0 })
                    }
                    className="h-8 sm:h-9 text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-0.5 sm:space-y-1">
                  <Label htmlFor="minBetValue" className="text-[10px] sm:text-xs font-semibold text-primary">Min Bet Value ($)</Label>
                  <Input
                    id="minBetValue"
                    type="number"
                    placeholder="500"
                    value={customFilters.minBetValue}
                    onChange={(e) =>
                      setCustomFilters({ ...customFilters, minBetValue: parseInt(e.target.value) || 0 })
                    }
                    className="h-8 sm:h-9 text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <Button 
              onClick={applyCustomFilters} 
              className="w-full rounded-lg bg-gradient-to-r from-primary to-accent font-bold text-xs sm:text-sm h-8 sm:h-9 sm:hover:scale-105 transition-all glow-primary"
            >
              Apply Filters
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
