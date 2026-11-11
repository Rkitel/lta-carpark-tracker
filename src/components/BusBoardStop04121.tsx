import React from 'react';
import {
  BusArrivalInfo,
  Carpark,
} from '../types/carpark';
import {
  Bus,
  RefreshCw,
  Clock,
  ArrowRight,
  Sparkles,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

interface BusBoardStop04121Props {
  busArrivals: BusArrivalInfo | null;
  carparks: Carpark[];
  onSelectCarpark: (carpark: Carpark) => void;
  onRefreshBus: () => void;
  isRefreshing: boolean;
}

export const BusBoardStop04121: React.FC<BusBoardStop04121Props> = ({
  busArrivals,
  carparks,
  onSelectCarpark,
  onRefreshBus,
  isRefreshing,
}) => {
  const pnrCarparks = carparks.filter((c) => c.category === 'park_and_ride');

  // Match bus service to connected carpark
  const getConnectedCarpark = (serviceNo: string): Carpark | undefined => {
    return pnrCarparks.find((c) => c.connectedBus?.serviceNo === serviceNo);
  };

  const getLoadBadge = (load?: 'SEA' | 'SDA' | 'LSD') => {
    switch (load) {
      case 'SEA':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Seats Avail
          </span>
        );
      case 'SDA':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Standing
          </span>
        );
      case 'LSD':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
            Packed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl overflow-hidden font-sans">
      {/* Station Header: Bus Stop 04121 */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm">
            <Bus className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                Stop 04121
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                SMU (Singapore Management University)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-500" />
              <span>Stamford Road, directly outside Li Ka Shing Library</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshBus}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors border border-slate-700 font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Live Refresh</span>
          </button>
        </div>
      </div>

      {/* Product Highlight Banner: Yesterday's Bus Board Joined with Carpark Availability */}
      <div className="px-5 py-2.5 bg-emerald-950/40 border-b border-emerald-900/60 text-xs text-emerald-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            <strong>Joined Commute View:</strong> Every bus below connects to an outer Park & Ride carpark with live lot capacity!
          </span>
        </div>
        <span className="text-[11px] font-mono text-emerald-400 hidden md:inline">
          LTA DataMall v3 Live
        </span>
      </div>

      {/* Bus Services Grid / Table */}
      <div className="divide-y divide-slate-800 overflow-x-auto">
        <div className="grid grid-cols-12 px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/60">
          <div className="col-span-2 sm:col-span-2">Service</div>
          <div className="col-span-4 sm:col-span-3">Next Arrival</div>
          <div className="hidden sm:block sm:col-span-2">Subsequent</div>
          <div className="col-span-6 sm:col-span-5">Connected Park & Ride Carpark</div>
        </div>

        {busArrivals?.Services.map((svc) => {
          const connectedCp = getConnectedCarpark(svc.ServiceNo);
          const mins1 = svc.minutesToArrival !== undefined ? svc.minutesToArrival : 4;
          const mins2 = svc.minutesToArrival2 !== undefined ? svc.minutesToArrival2 : 14;

          return (
            <div
              key={svc.ServiceNo}
              className="grid grid-cols-12 px-4 py-3 items-center hover:bg-slate-800/40 transition-colors text-xs"
            >
              {/* Service Number Badge */}
              <div className="col-span-2 sm:col-span-2 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-mono font-bold text-sm flex items-center justify-center shadow-xs">
                  {svc.ServiceNo}
                </span>
              </div>

              {/* Next Bus Arrival */}
              <div className="col-span-4 sm:col-span-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-bold font-mono text-white tabular-nums">
                    {mins1 <= 0 ? 'Arriving' : `${mins1}m`}
                  </span>
                  {getLoadBadge(svc.NextBus?.Load)}
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {svc.NextBus?.Type === 'DD' ? 'Double Deck' : 'Single Deck'}
                </span>
              </div>

              {/* Subsequent Bus Arrival */}
              <div className="hidden sm:block sm:col-span-2 text-slate-400 font-mono">
                <span>{mins2}m</span>
                <span className="text-[10px] text-slate-500 block">
                  {svc.NextBus2?.Type === 'DD' ? 'Double Deck' : 'Single Deck'}
                </span>
              </div>

              {/* Joined Carpark Availability */}
              <div className="col-span-6 sm:col-span-5">
                {connectedCp ? (
                  <div
                    onClick={() => onSelectCarpark(connectedCp)}
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 cursor-pointer transition-all flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-200 truncate">
                          {connectedCp.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-mono text-emerald-400 font-bold">
                          {connectedCp.lots.car.available} lots free
                        </span>
                        <span>·</span>
                        <span>{connectedCp.rates.weekdayDayRatePerHour ? `$${connectedCp.rates.weekdayDayRatePerHour}/h` : 'Cheap'}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">Regular line to SMU</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
