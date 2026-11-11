import React from 'react';
import {
  Carpark,
  CommuteComparison,
} from '../types/carpark';
import {
  Car,
  Bus,
  TrendingDown,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Coins,
  Navigation,
} from 'lucide-react';

interface CommuteVerdictCardProps {
  comparison: CommuteComparison;
  selectedDuration: number;
  onSelectDuration: (hours: number) => void;
  onSelectCarpark: (carpark: Carpark) => void;
  onViewBusBoard: () => void;
}

export const CommuteVerdictCard: React.FC<CommuteVerdictCardProps> = ({
  comparison,
  selectedDuration,
  onSelectDuration,
  onSelectCarpark,
  onViewBusBoard,
}) => {
  const {
    directCampusBest,
    parkAndRideBest,
    moneySavedSgd,
    timeDiffMins,
    verdict,
    verdictHeadline,
    verdictReason,
  } = comparison;

  const isParkAndRideBetter = verdict === 'park_and_ride';
  const isCampusLotsCritical = directCampusBest.availableLots <= 15;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden transition-all">
      {/* Top Banner: Core Dilemma & Verdict */}
      <div
        className={`p-5 sm:p-6 border-b transition-colors ${
          isParkAndRideBetter
            ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80'
            : verdict === 'toss_up'
            ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80'
            : 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/80'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  isParkAndRideBetter
                    ? 'bg-emerald-600 text-white'
                    : verdict === 'toss_up'
                    ? 'bg-amber-600 text-white'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {isParkAndRideBetter
                  ? 'Recommended: Park & Ride to Stop 04121'
                  : verdict === 'toss_up'
                  ? 'Close Call: Balanced Trade-off'
                  : 'Drive In Directly Near Campus'}
              </span>

              {moneySavedSgd > 0 && (
                <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  Save S$ {moneySavedSgd.toFixed(2)} today
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white text-balance">
              {verdictHeadline}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
              {verdictReason}
            </p>
          </div>

          {/* Duration Selector Tabs */}
          <div className="shrink-0 flex flex-col items-start md:items-end gap-1.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Planned Parking Stay:
            </span>
            <div className="flex items-center p-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              {[
                { label: '1 Hour', hours: 1 },
                { label: '2 Hours', hours: 2 },
                { label: '4 Hours (Half Day)', hours: 4 },
                { label: '8 Hours (Full Day)', hours: 8 },
              ].map((dur) => (
                <button
                  key={dur.hours}
                  onClick={() => onSelectDuration(dur.hours)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    selectedDuration === dur.hours
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {dur.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Commute Comparison Breakdown */}
      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
        {/* Option 1: Drive Direct to SMU Campus */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                <Car className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <span>OPTION A: DRIVE ALL THE WAY TO SMU</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {directCampusBest.carpark.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {directCampusBest.carpark.walkTimeToSmuMins}-min walk to SMU campus · {directCampusBest.carpark.address}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[11px] text-slate-400 block">Total Est. Cost</span>
              <span className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                S$ {directCampusBest.totalCost.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Lots Availability Indicator */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              isCampusLotsCritical
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {isCampusLotsCritical ? (
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>
                <strong>{directCampusBest.availableLots}</strong> lots free of {directCampusBest.totalLots}
                {isCampusLotsCritical && ' · Very High Risk of Full Gantry!'}
              </span>
            </div>
            <span className="font-mono font-medium">
              {Math.round((directCampusBest.availableLots / (directCampusBest.totalLots || 1)) * 100)}% free
            </span>
          </div>

          {/* Cost breakdown */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Parking fee ({selectedDuration} hrs @ ~${(directCampusBest.parkingCost / selectedDuration).toFixed(2)}/hr):</span>
              <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-white">
                S$ {directCampusBest.parkingCost.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>CBD / Central Cordon ERP Toll:</span>
              <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-white">
                S$ {directCampusBest.erpCost.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Walking time from lot to Li Ka Shing Library:</span>
              <span className="font-medium text-slate-900 dark:text-white">
                ~{directCampusBest.carpark.walkTimeToSmuMins} mins
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onSelectCarpark(directCampusBest.carpark)}
              className="w-full py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>View Lot Details & Drive Directions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Option 2: Park Further Out & Bus to Stop 04121 */}
        <div className="space-y-4 pt-6 lg:pt-0 lg:pl-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                <Bus className="w-4 h-4 text-emerald-600" />
                <span>OPTION B: PARK & RIDE VIA STOP 04121</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {parkAndRideBest.carpark.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Take Bus {parkAndRideBest.busService} direct to SMU Stop 04121 ({parkAndRideBest.carpark.connectedBus?.rideMinutesToSmu} min ride)
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">Total Est. Cost</span>
              <span className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                S$ {parkAndRideBest.totalCost.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Lots Availability Indicator */}
          <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>{parkAndRideBest.availableLots}</strong> lots free · Ample parking guaranteed, no ERP!
              </span>
            </div>
            <span className="font-mono font-medium">
              {Math.round((parkAndRideBest.availableLots / (parkAndRideBest.totalLots || 1)) * 100)}% free
            </span>
          </div>

          {/* Connected Bus Live Arrival Status */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-emerald-600 text-white font-mono font-bold flex items-center justify-center text-xs">
                  {parkAndRideBest.busService}
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  Direct to SMU (Stop 04121)
                </span>
              </div>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                Next bus in ~{parkAndRideBest.nextBusMinutes}m
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span>Fringe Parking: S$ {parkAndRideBest.parkingCost.toFixed(2)}</span>
              <span>+ Two-Way Bus Fare: S$ {parkAndRideBest.busFareTwoWays.toFixed(2)}</span>
              <span>+ ERP Toll: S$ 0.00</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => onSelectCarpark(parkAndRideBest.carpark)}
              className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Route to {parkAndRideBest.carpark.area} Hub</span>
            </button>
            <button
              onClick={onViewBusBoard}
              className="py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
            >
              Stop 04121 Board
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
