import React from 'react';
import {
  Search,
  X,
  SlidersHorizontal,
  Bus,
  Footprints,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { FilterOptions } from '../types/carpark';

interface FilterBarProps {
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  totalCount: number;
  filteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilters,
  totalCount,
  filteredCount,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Row 1: Search & Category Filter */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))
              }
              placeholder="Search SMU Basement, Bras Basah Complex, Waterloo, Kallang, Bus 16..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
            />
            {filters.searchQuery && (
              <button
                onClick={() =>
                  setFilters((prev) => ({ ...prev, searchQuery: '' }))
                }
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Commute Category Segmented Control */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
            {[
              { id: 'ALL' as const, label: 'All Lots' },
              { id: 'campus' as const, label: '🚶 Walk to SMU' },
              { id: 'park_and_ride' as const, label: '🚌 Park & Ride to 04121' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, category: cat.id }))
                }
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  filters.category === cat.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden xl:inline">
              Sort:
            </span>
            <select
              value={filters.sortBy}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  sortBy: e.target.value as FilterOptions['sortBy'],
                }))
              }
              className="px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="best_value">Best Value ($)</option>
              <option value="most_lots">Most Lots Free</option>
              <option value="closest_walk">Closest Walk / Transit</option>
              <option value="cheapest">Cheapest Rate/Hr</option>
            </select>
          </div>
        </div>

        {/* Row 2: Duration quick buttons and active lot counter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">Duration:</span>
            {[1, 2, 4, 8].map((hrs) => (
              <button
                key={hrs}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, durationHours: hrs }))
                }
                className={`px-2.5 py-1 rounded-md border font-medium transition-colors ${
                  filters.durationHours === hrs
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                {hrs}h stay
              </button>
            ))}

            <button
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  onlyAmpleLots: !prev.onlyAmpleLots,
                }))
              }
              className={`ml-2 px-2.5 py-1 rounded-md border font-medium transition-colors flex items-center gap-1 ${
                filters.onlyAmpleLots
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Ample Lots Only</span>
            </button>
          </div>

          <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
            <span>{filteredCount} of {totalCount} locations</span>
          </div>
        </div>
      </div>
    </div>
  );
};
