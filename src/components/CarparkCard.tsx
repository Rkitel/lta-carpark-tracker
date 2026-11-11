import React from 'react';
import { Carpark, VehicleType } from '../types/carpark';
import {
  Bookmark,
  Zap,
  Navigation,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Bus,
  Footprints,
} from 'lucide-react';
import { calculateParkingCostForHours } from '../services/carparkService';

interface CarparkCardProps {
  carpark: Carpark;
  vehicleType: VehicleType;
  isSelected: boolean;
  isBookmarked: boolean;
  selectedDuration: number;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  onSelect: (carpark: Carpark) => void;
  onNavigate: (carpark: Carpark, e: React.MouseEvent) => void;
}

export const CarparkCard: React.FC<CarparkCardProps> = ({
  carpark,
  vehicleType,
  isSelected,
  isBookmarked,
  selectedDuration,
  onToggleBookmark,
  onSelect,
  onNavigate,
}) => {
  const { available, total } = carpark.lots.car;
  const percentageAvailable = Math.round((available / (total || 1)) * 100);
  const isCampus = carpark.category === 'campus';

  // Status colors
  const isFull = available <= 10 || percentageAvailable < 10;
  const isModerate = !isFull && percentageAvailable < 30;

  const statusColorClass = isFull
    ? 'text-rose-600 dark:text-rose-400'
    : isModerate
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-emerald-600 dark:text-emerald-400';

  const progressBgClass = isFull
    ? 'bg-rose-500'
    : isModerate
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  // Estimated total cost for selected hours
  const baseParkingFee = calculateParkingCostForHours(carpark, selectedDuration);
  const totalCostEstimate = isCampus
    ? baseParkingFee + carpark.erpEstimateSgd
    : baseParkingFee + ((carpark.connectedBus?.busFareSgd || 1.19) * 2);

  return (
    <div
      onClick={() => onSelect(carpark)}
      className={`p-4 rounded-xl border transition-all cursor-pointer bg-white dark:bg-slate-900 ${
        isSelected
          ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
      }`}
    >
      {/* Category Tag & Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            {isCampus ? (
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                <Footprints className="w-3.5 h-3.5 text-blue-600" />
                <span>{carpark.walkTimeToSmuMins}m Walk to SMU</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                <Bus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bus {carpark.connectedBus?.serviceNo} to Stop 04121 ({carpark.connectedBus?.rideMinutesToSmu}m)</span>
              </span>
            )}
            <span aria-hidden="true">·</span>
            <span>{carpark.agency}</span>
          </div>

          <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {carpark.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {carpark.address}
          </p>
        </div>

        {/* Favorite & Navigate */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => onToggleBookmark(carpark.id, e)}
            className={`p-1.5 rounded-lg border transition-colors ${
              isBookmarked
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={(e) => onNavigate(carpark, e)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Lot Availability Capacity Bar & Figures */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-baseline justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className={`text-xl font-bold font-mono tabular-nums ${statusColorClass}`}>
              {available}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              / {total} lots free
            </span>

            {carpark.trend === 'filling' && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center ml-1">
                <TrendingDown className="w-3 h-3 mr-0.5" />
                Filling
              </span>
            )}
            {carpark.trend === 'emptying' && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center ml-1">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                Freeing up
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
              S$ {totalCostEstimate.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 block">
              {selectedDuration}h total est.
            </span>
          </div>
        </div>

        {/* Capacity Bar */}
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressBgClass}`}
            style={{ width: `${Math.max(4, Math.min(100, percentageAvailable))}%` }}
          />
        </div>
      </div>

      {/* Cost notes & Details link */}
      <div className="mt-2.5 pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60">
        <div className="truncate text-[11px]">
          {isCampus ? (
            <span>Rate: ${carpark.rates.weekdayDayRatePerHour}/h + S${carpark.erpEstimateSgd} ERP</span>
          ) : (
            <span>Rate: ${carpark.rates.weekdayDayRatePerHour}/h + $2.38 bus fare (0 ERP)</span>
          )}
        </div>

        <div className="flex items-center gap-0.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium text-[11px] shrink-0">
          <span>Compare</span>
          <ArrowUpRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
};
