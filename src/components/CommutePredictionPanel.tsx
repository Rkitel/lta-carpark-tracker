import React, { useState, useEffect, useRef } from 'react';
import {
  CommutePredictionResult,
  CommutePredictionInput,
  DepartureTimeWindow,
  CommuteOrigin,
  StartLocation,
  searchOneMapAddresses,
  fetchOneMapRouteTiming,
} from '../services/predictionEngine';
import { Carpark } from '../types/carpark';
import { SMU_STOP_04121_COORDINATES } from '../data/singaporeCarparks';
import {
  Bus,
  Car,
  Clock,
  Compass,
  CloudRain,
  Sun,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  Navigation,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  MapPin,
  Locate,
  Search,
  X,
  Building,
} from 'lucide-react';

interface CommutePredictionPanelProps {
  prediction: CommutePredictionResult;
  predictionInput: CommutePredictionInput;
  setPredictionInput: React.Dispatch<React.SetStateAction<CommutePredictionInput>>;
  onSelectCarpark: (carpark: Carpark) => void;
  onViewBusBoard: () => void;
}

const PRESET_START_LOCATIONS: Array<{ label: string; origin: CommuteOrigin; location: StartLocation }> = [
  {
    label: 'Tampines Hub',
    origin: 'east',
    location: {
      name: 'Our Tampines Hub',
      address: '1 Tampines Walk, Singapore 528523',
      lat: 1.353321,
      lng: 103.940212,
      postal: '528523',
    },
  },
  {
    label: 'Woodlands Civic',
    origin: 'north',
    location: {
      name: 'Woodlands Civic Centre',
      address: '900 South Woodlands Drive, Singapore 730900',
      lat: 1.435012,
      lng: 103.787401,
      postal: '730900',
    },
  },
  {
    label: 'Jurong East MRT',
    origin: 'west',
    location: {
      name: 'Jurong East MRT Station',
      address: '10 Jurong East Street 12, Singapore 609690',
      lat: 1.333153,
      lng: 103.742286,
      postal: '609690',
    },
  },
  {
    label: 'Bishan Junction 8',
    origin: 'central',
    location: {
      name: 'Bishan Junction 8',
      address: '9 Bishan Place, Singapore 579837',
      lat: 1.350812,
      lng: 103.848821,
      postal: '579837',
    },
  },
  {
    label: 'Marine Parade Central',
    origin: 'east',
    location: {
      name: 'Marine Parade Central',
      address: '80 Marine Parade Central, Singapore 440080',
      lat: 1.302512,
      lng: 103.906212,
      postal: '440080',
    },
  },
];

export const CommutePredictionPanel: React.FC<CommutePredictionPanelProps> = ({
  prediction,
  predictionInput,
  setPredictionInput,
  onSelectCarpark,
  onViewBusBoard,
}) => {
  const isTakeBus = prediction.decision === 'TAKE_BUS';

  // Start Location search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<StartLocation[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounced OneMap address search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchOneMapAddresses(searchQuery);
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } catch (e) {
        console.warn(e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update routing timing when start location changes
  const updateRouteTiming = async (loc: StartLocation, origin?: CommuteOrigin) => {
    try {
      // 1. Direct drive timing to SMU
      const smuRoute = await fetchOneMapRouteTiming(
        loc.lat,
        loc.lng,
        SMU_STOP_04121_COORDINATES.lat,
        SMU_STOP_04121_COORDINATES.lng,
        'drive'
      );

      // 2. Drive timing to PnR hub
      const pnrCoords = prediction.recommendedParkAndRideCarpark.coordinates;
      const pnrRoute = await fetchOneMapRouteTiming(
        loc.lat,
        loc.lng,
        pnrCoords.lat,
        pnrCoords.lng,
        'drive'
      );

      setPredictionInput((prev) => ({
        ...prev,
        startLocation: loc,
        origin: origin || prev.origin,
        liveDriveTimeMinutes: smuRoute.timeMinutes,
        liveDistanceKm: smuRoute.distanceKm,
        livePnrDriveTimeMinutes: pnrRoute.timeMinutes,
      }));
    } catch (err) {
      console.warn('Error fetching OneMap routing:', err);
    }
  };

  const handleSelectLocation = (loc: StartLocation) => {
    setSearchQuery('');
    setShowDropdown(false);

    // Auto-detect general origin from coordinates
    let detectedOrigin: CommuteOrigin = predictionInput.origin;
    if (loc.lng > 103.88) detectedOrigin = 'east';
    else if (loc.lat > 1.38) detectedOrigin = 'north';
    else if (loc.lng < 103.78) detectedOrigin = 'west';
    else detectedOrigin = 'central';

    updateRouteTiming(loc, detectedOrigin);
  };

  // Browser Geolocation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          // Reverse geocode via OneMap proxy
          const res = await fetch(`/api/onemap/revgeocode?location=${lat},${lng}`);
          const data = await res.json();
          const info = data.GeocodeInfo?.[0];

          const currentLoc: StartLocation = {
            name: info?.BUILDINGNAME && info.BUILDINGNAME !== 'NIL' ? info.BUILDINGNAME : 'My Current Location',
            address: `${info?.BLOCK || ''} ${info?.ROAD || ''}`.trim() || 'Singapore GPS Pin',
            lat,
            lng,
            postal: info?.POSTALCODE || undefined,
          };

          handleSelectLocation(currentLoc);
        } catch {
          handleSelectLocation({
            name: 'My Current Location',
            address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            lat,
            lng,
          });
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setIsLocating(false);
      }
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden transition-all">
      {/* 1. Commute Parameters Customizer Bar */}
      <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span>OneMap Routing & AI Commute Prediction</span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Should you drive all the way to SMU, or take the bus in?
            </h2>
          </div>

          {/* Quick Weather Toggle */}
          <button
            onClick={() =>
              setPredictionInput((prev) => ({
                ...prev,
                rainWeather: !prev.rainWeather,
              }))
            }
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 self-start lg:self-auto ${
              predictionInput.rainWeather
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            {predictionInput.rainWeather ? (
              <>
                <CloudRain className="w-3.5 h-3.5 text-blue-600" />
                <span>Raining / Wet Weather (Demand High)</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Normal Weather</span>
              </>
            )}
          </button>
        </div>

        {/* Start Location Input with OneMap Autocomplete */}
        <div className="space-y-1.5" ref={searchContainerRef}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Starting Location (OneMap SLA Geocoding & Routing):</span>
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              Current: <strong className="text-slate-800 dark:text-slate-200">{predictionInput.startLocation.name}</strong>
            </span>
          </div>

          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowDropdown(true);
                  }}
                  placeholder={`Search starting address (e.g. ${predictionInput.startLocation.name}, 528523, Jurong East)...`}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowDropdown(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* GPS Locate Me Button */}
              <button
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                title="Use current GPS location"
                className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Locate className={`w-3.5 h-3.5 text-emerald-600 ${isLocating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Use GPS</span>
              </button>
            </div>

            {/* OneMap Autocomplete Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                {searchResults.map((loc, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectLocation(loc)}
                    className="w-full p-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-start gap-2 text-xs"
                  >
                    <Building className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {loc.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {loc.address} {loc.postal ? `· S(${loc.postal})` : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Preset Origin Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-slate-400 text-[11px]">Quick Origins:</span>
            {PRESET_START_LOCATIONS.map((preset) => {
              const isSelected = predictionInput.startLocation.name === preset.location.name;
              return (
                <button
                  key={preset.label}
                  onClick={() => updateRouteTiming(preset.location, preset.origin)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-semibold shadow-2xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Param Controls: Departure Window, Origin Highway, Duration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs border-t border-slate-200/60 dark:border-slate-700/60">
          {/* Departure Window */}
          <div>
            <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">
              Departure Timing:
            </label>
            <select
              value={predictionInput.departureWindow}
              onChange={(e) =>
                setPredictionInput((prev) => ({
                  ...prev,
                  departureWindow: e.target.value as DepartureTimeWindow,
                }))
              }
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="now">Leaving Right Now</option>
              <option value="in_30m">Leaving in ~30 Mins</option>
              <option value="morning_peak">Morning Rush (8:30–9:30 AM)</option>
              <option value="lunch_rush">Lunch Peak (12:00–1:30 PM)</option>
              <option value="evening_class">Evening Class (6:00–7:30 PM)</option>
            </select>
          </div>

          {/* Coming From (Origin) */}
          <div>
            <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">
              Corridor & Highway:
            </label>
            <select
              value={predictionInput.origin}
              onChange={(e) =>
                setPredictionInput((prev) => ({
                  ...prev,
                  origin: e.target.value as CommuteOrigin,
                }))
              }
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="east">East (ECP / Nicoll ➔ Kallang / Bus 16)</option>
              <option value="north">North (CTE / PIE ➔ Thomson / Bus 167)</option>
              <option value="west">West (AYE ➔ Commonwealth / Bus 106)</option>
              <option value="central">Central (Whampoa / Balestier ➔ Bus 131)</option>
            </select>
          </div>

          {/* Stay Duration */}
          <div>
            <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">
              Parking Stay Duration:
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 4, 8].map((h) => (
                <button
                  key={h}
                  onClick={() =>
                    setPredictionInput((prev) => ({
                      ...prev,
                      durationHours: h,
                    }))
                  }
                  className={`py-1.5 rounded-lg border font-medium text-xs transition-colors ${
                    predictionInput.durationHours === h
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. The Result Prediction Hero Display */}
      <div
        className={`p-6 border-b transition-all ${
          isTakeBus
            ? 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white'
            : 'bg-gradient-to-r from-blue-600 via-indigo-700 to-slate-900 text-white'
        }`}
      >
        <div className="max-w-4xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wide uppercase bg-black/30 backdrop-blur-xs border border-white/20">
              {prediction.confidenceScore}% Confidence Score
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-white/20 backdrop-blur-xs flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" />
              <span>From {prediction.startLocation.name} ({prediction.directDistanceKm} km)</span>
            </span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {prediction.headline}
          </h3>

          <p className="text-sm sm:text-base text-white/90 leading-relaxed font-normal">
            {prediction.summary}
          </p>

          {/* Quick Metrics Bar */}
          <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
              <span className="text-white/70 block text-[11px]">Drive Time to SMU</span>
              <span className="text-lg font-bold font-mono">
                ~{prediction.directDriveTimeMinutes}m ({prediction.directDistanceKm}km)
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
              <span className="text-white/70 block text-[11px]">Money Saved Today (Bus)</span>
              <span className="text-lg font-bold font-mono text-emerald-200">
                S$ {prediction.moneySaved.toFixed(2)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
              <span className="text-white/70 block text-[11px]">Time To Next Bus</span>
              <span className="text-lg font-bold font-mono">
                Bus {prediction.connectedBusService} in ~{prediction.nextBusArrivalMins}m
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
              <span className="text-white/70 block text-[11px]">Campus Lots At Arrival</span>
              <span className="text-lg font-bold font-mono">
                ~{prediction.predictedLotsAtSmu} free ({prediction.campusRiskLevel})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Actionable Step-by-Step Commute Itinerary */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Recommended Execution Route (If Driving)</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {prediction.itinerary.map((step) => (
            <div
              key={step.stepNumber}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 relative"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-mono text-xs font-bold flex items-center justify-center">
                  {step.stepNumber}
                </span>
                <span className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  {step.estimatedTime}
                </span>
              </div>
              <h5 className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">
                {step.title}
              </h5>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {isTakeBus ? (
            <>
              <button
                onClick={() =>
                  onSelectCarpark(prediction.recommendedParkAndRideCarpark)
                }
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Navigation className="w-4 h-4" />
                <span>Navigate to {prediction.recommendedParkAndRideCarpark.name}</span>
              </button>
              <button
                onClick={onViewBusBoard}
                className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Open Stop 04121 Bus Board (Service {prediction.connectedBusService})
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() =>
                  onSelectCarpark(prediction.recommendedCampusCarpark)
                }
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Navigation className="w-4 h-4" />
                <span>Navigate Directly to {prediction.recommendedCampusCarpark.name}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4. Predictive Factors Breakdown */}
      <div className="p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-800/30">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Key Predictive Factors Analyzed
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {prediction.factors.map((f, i) => (
            <div
              key={i}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">
                  {f.title}
                </span>
                <span
                  className={`text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded ${
                    f.impact === 'take_bus'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : f.impact === 'drive'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {f.impact === 'take_bus'
                    ? 'Favors Bus'
                    : f.impact === 'drive'
                    ? 'Favors Drive'
                    : 'Neutral'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {f.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
