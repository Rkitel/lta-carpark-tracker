import React, { useState } from 'react';
import {
  Carpark,
  VehicleType,
} from '../types/carpark';
import { calculateParkingCost } from '../services/carparkService';
import {
  X,
  Bookmark,
  Navigation,
  Clock,
  Zap,
  Shield,
  Copy,
  Check,
  ExternalLink,
  Coins,
  MapPin,
  Calendar,
} from 'lucide-react';

interface CarparkDetailModalProps {
  carpark: Carpark;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  vehicleType: VehicleType;
}

export const CarparkDetailModal: React.FC<CarparkDetailModalProps> = ({
  carpark,
  onClose,
  isBookmarked,
  onToggleBookmark,
  vehicleType,
}) => {
  // Rate calculator state
  const [stayMinutes, setStayMinutes] = useState<number>(120); // 2 hours default
  const [selectedDay, setSelectedDay] = useState<'today' | 'sunday' | 'saturday' | 'weekday'>('today');
  const [copied, setCopied] = useState<boolean>(false);

  // Compute test arrival date for calculator
  const arrivalDate = new Date();
  if (selectedDay === 'sunday') {
    // Force day to Sunday
    arrivalDate.setDate(arrivalDate.getDate() + ((0 + 7 - arrivalDate.getDay()) % 7 || 7));
  } else if (selectedDay === 'saturday') {
    arrivalDate.setDate(arrivalDate.getDate() + ((6 + 7 - arrivalDate.getDay()) % 7 || 7));
  } else if (selectedDay === 'weekday') {
    arrivalDate.setDate(arrivalDate.getDate() + ((1 + 7 - arrivalDate.getDay()) % 7 || 7));
  }

  const { totalCost, breakdownText, isFree } = calculateParkingCost(
    carpark,
    arrivalDate,
    stayMinutes
  );

  const handleCopyCoordinates = () => {
    const text = `${carpark.coordinates.lat.toFixed(6)}, ${carpark.coordinates.lng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openGoogleMaps = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${carpark.coordinates.lat},${carpark.coordinates.lng}`,
      '_blank'
    );
  };

  const openWaze = () => {
    window.open(
      `https://waze.com/ul?ll=${carpark.coordinates.lat},${carpark.coordinates.lng}&navigate=yes`,
      '_blank'
    );
  };

  // Lot breakdown
  const carLots = carpark.lots.car;
  const motoLots = carpark.lots.motorcycle;
  const heavyLots = carpark.lots.heavy;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="pr-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                {carpark.agency}
              </span>
              <span aria-hidden="true">·</span>
              <span>{carpark.area}</span>
              <span aria-hidden="true">·</span>
              <span>Height Clearance {carpark.clearanceHeight}m</span>
              <span aria-hidden="true">·</span>
              <span>{carpark.gantryType}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {carpark.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{carpark.address}</span>
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onToggleBookmark(carpark.id)}
              className={`p-2 rounded-lg border transition-colors ${
                isBookmarked
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bookmark
                className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`}
              />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* SMU Commute Connection Banner */}
          {carpark.category === 'park_and_ride' && carpark.connectedBus ? (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-mono font-bold text-sm flex items-center justify-center shrink-0">
                  {carpark.connectedBus.serviceNo}
                </span>
                <div>
                  <span className="font-bold">Park & Ride to SMU Stop 04121:</span>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Bus {carpark.connectedBus.serviceNo} arrives directly at SMU Stamford Road in ~{carpark.connectedBus.rideMinutesToSmu} mins (Fare: S${carpark.connectedBus.busFareSgd.toFixed(2)}). 0 ERP tolls!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
              <div>
                <span className="font-bold">Direct Campus Walk:</span>
                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                  ~{carpark.walkTimeToSmuMins} mins walk to SMU campus. Driving in incurs ~S${carpark.erpEstimateSgd.toFixed(2)} ERP toll.
                </p>
              </div>
            </div>
          )}

          {/* Live Lots Gauge Strip */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Real-Time Lots Availability
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">
                Updated at {carpark.updatedAt}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Car Lots */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Passenger Cars (C)
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {carLots.available}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    / {carLots.total} free
                  </span>
                </div>
                <div className="mt-2 w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{
                      width: `${(carLots.available / (carLots.total || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Motorcycle Lots */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Motorcycles (Y)
                </span>
                {motoLots ? (
                  <>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold font-mono tabular-nums text-slate-800 dark:text-slate-100">
                        {motoLots.available}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        / {motoLots.total} free
                      </span>
                    </div>
                    <div className="mt-2 w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${(motoLots.available / (motoLots.total || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">Not designated</p>
                )}
              </div>

              {/* Heavy Vehicle Lots or EV Status */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Heavy Vehicles (H)
                </span>
                {heavyLots ? (
                  <>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold font-mono tabular-nums text-slate-800 dark:text-slate-100">
                        {heavyLots.available}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        / {heavyLots.total} free
                      </span>
                    </div>
                    <div className="mt-2 w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{
                          width: `${(heavyLots.available / (heavyLots.total || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">Cars/Motos only</p>
                )}
              </div>
            </div>
          </div>

          {/* Rates Breakdown */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Official Parking Charges (SGD)
            </h4>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="flex justify-between p-3">
                <span className="text-slate-500 dark:text-slate-400">
                  Weekday Daytime (7am - 5pm/6pm)
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {carpark.rates.weekdayDay}
                </span>
              </div>
              <div className="flex justify-between p-3">
                <span className="text-slate-500 dark:text-slate-400">
                  Weekday Evening & Night
                </span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {carpark.rates.weekdayEvening}
                </span>
              </div>
              <div className="flex justify-between p-3">
                <span className="text-slate-500 dark:text-slate-400">
                  Weekend & Public Holidays
                </span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {carpark.rates.weekendRate}
                </span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50/50 dark:bg-slate-800/30">
                <span className="text-slate-500 dark:text-slate-400">
                  Complimentary Grace Period
                </span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {carpark.rates.gracePeriodMins} minutes free
                </span>
              </div>
              {carpark.rates.sundayFree && (
                <div className="flex justify-between p-3 bg-purple-50/40 dark:bg-purple-950/20">
                  <span className="text-purple-700 dark:text-purple-300 font-medium">
                    HDB Free Parking Scheme (FPS)
                  </span>
                  <span className="font-semibold text-purple-700 dark:text-purple-300">
                    Free on Sundays (7:30am - 10:30pm)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Estimated Fee Calculator */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Live Parking Fee Estimator
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-500 dark:text-slate-400 block mb-1">
                  Expected Duration: <span className="font-bold text-slate-900 dark:text-white font-mono">{stayMinutes} mins ({Math.floor(stayMinutes / 60)}h {stayMinutes % 60}m)</span>
                </label>
                <input
                  type="range"
                  min="15"
                  max="480"
                  step="15"
                  value={stayMinutes}
                  onChange={(e) => setStayMinutes(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>15m</span>
                  <span>1h</span>
                  <span>2h</span>
                  <span>4h</span>
                  <span>8h</span>
                </div>
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 block mb-1">
                  Day of Arrival:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'today', label: 'Today' },
                      { id: 'weekday', label: 'Weekday' },
                      { id: 'sunday', label: 'Sunday' },
                    ] as const
                  ).map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDay(d.id)}
                      className={`py-1.5 px-2 rounded-md font-medium text-xs border transition-colors ${
                        selectedDay === d.id
                          ? 'bg-white dark:bg-slate-700 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculated Result Box */}
            <div className="mt-2 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Estimated Total Fee:
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  {breakdownText}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`text-xl font-bold font-mono tabular-nums ${
                    isFree ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {isFree ? 'FREE' : `S$ ${totalCost.toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>

          {/* EV Charging Info (if available) */}
          {carpark.evCharging.available && (
            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300">
                  Electric Vehicle (EV) Charging Station
                </h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">Provider</span>
                  <p className="font-semibold text-slate-900 dark:text-white">{carpark.evCharging.operator}</p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">Power Output</span>
                  <p className="font-semibold text-slate-900 dark:text-white font-mono">{carpark.evCharging.powerKw} kW</p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">Connectors</span>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {carpark.evCharging.connectors?.join(', ') || 'Type 2, CCS2'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">Available Plugs</span>
                  <p className="font-semibold font-mono text-blue-700 dark:text-blue-300">
                    {carpark.evCharging.availablePoints} of {carpark.evCharging.totalPoints} free
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              onClick={openGoogleMaps}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm"
            >
              <Navigation className="w-4 h-4" />
              <span>Drive with Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60 ml-0.5" />
            </button>

            <button
              onClick={openWaze}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
            >
              <span>Open in Waze</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60 ml-0.5" />
            </button>

            <button
              onClick={handleCopyCoordinates}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>GPS</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
