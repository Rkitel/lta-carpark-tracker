import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Carpark,
  FilterOptions,
  BusArrivalInfo,
  CommuteComparison,
} from './types/carpark';
import {
  INITIAL_SMU_CARPARKS,
  SMU_STOP_04121_COORDINATES,
} from './data/singaporeCarparks';
import {
  calculateDistanceKm,
  loadFavorites,
  saveFavorites,
  loadBackendConfig,
  saveBackendConfig,
  simulateLotUpdates,
  fetchLiveBusArrivals,
  computeCommuteVerdict,
  BackendConfig,
} from './services/carparkService';
import { Navbar } from './components/Navbar';
import { FilterBar } from './components/FilterBar';
import { CommuteVerdictCard } from './components/CommuteVerdictCard';
import { BusBoardStop04121 } from './components/BusBoardStop04121';
import { InteractiveMap } from './components/InteractiveMap';
import { CarparkCard } from './components/CarparkCard';
import { CarparkDetailModal } from './components/CarparkDetailModal';
import { BackendConfigModal } from './components/BackendConfigModal';
import { FavoritesView } from './components/FavoritesView';
import {
  Car,
  Bus,
  Footprints,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('parksg_theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('parksg_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('parksg_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  // Core data states
  const [carparks, setCarparks] = useState<Carpark[]>(() => {
    // Attach initial distances to SMU Stop 04121
    return INITIAL_SMU_CARPARKS.map((cp) => ({
      ...cp,
      distanceKm: calculateDistanceKm(
        SMU_STOP_04121_COORDINATES.lat,
        SMU_STOP_04121_COORDINATES.lng,
        cp.coordinates.lat,
        cp.coordinates.lng
      ),
    }));
  });

  const [busArrivals, setBusArrivals] = useState<BusArrivalInfo | null>(null);
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [selectedCarpark, setSelectedCarpark] = useState<Carpark | null>(null);
  const [activeTab, setActiveTab] = useState<
    'verdict' | 'map' | 'busboard' | 'directory' | 'favorites'
  >('verdict');
  const [backendConfig, setBackendConfig] = useState<BackendConfig>(loadBackendConfig);
  const [isBackendModalOpen, setIsBackendModalOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Map state
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    SMU_STOP_04121_COORDINATES.lat,
    SMU_STOP_04121_COORDINATES.lng,
  ]);
  const [zoomLevel, setZoomLevel] = useState<number>(14);

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    category: 'ALL',
    vehicleType: 'car',
    durationHours: 4, // 4 hours default typical university block
    onlyAmpleLots: false,
    sortBy: 'best_value',
  });

  // Save favorites
  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  const handleToggleBookmark = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleNavigate = useCallback((carpark: Carpark, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${carpark.coordinates.lat},${carpark.coordinates.lng}`,
      '_blank'
    );
  }, []);

  // Fetch initial live bus arrivals for Stop 04121
  const refreshBuses = useCallback(async () => {
    try {
      const data = await fetchLiveBusArrivals();
      setBusArrivals(data);
    } catch (e) {
      console.warn('Failed to load bus arrivals', e);
    }
  }, []);

  useEffect(() => {
    refreshBuses();
  }, [refreshBuses]);

  // Periodic real-time updates for lots & buses
  useEffect(() => {
    const intervalMs = (backendConfig.refreshIntervalSec || 20) * 1000;
    const interval = setInterval(() => {
      setCarparks((prev) => simulateLotUpdates(prev));
      refreshBuses();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [backendConfig.refreshIntervalSec, refreshBuses]);

  const handleManualRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(async () => {
      setCarparks((prev) => simulateLotUpdates(prev));
      await refreshBuses();
      setIsRefreshing(false);
    }, 400);
  }, [refreshBuses]);

  // Compute live commute verdict
  const commuteComparison: CommuteComparison = useMemo(() => {
    return computeCommuteVerdict(carparks, busArrivals, filters.durationHours);
  }, [carparks, busArrivals, filters.durationHours]);

  // Filtered carparks for directory and map
  const filteredCarparks = useMemo(() => {
    const q = filters.searchQuery.trim().toLowerCase();

    return carparks
      .filter((cp) => {
        if (q) {
          const matchName = cp.name.toLowerCase().includes(q);
          const matchAddr = cp.address.toLowerCase().includes(q);
          const matchBus = cp.connectedBus?.serviceNo.toLowerCase().includes(q);
          const matchArea = cp.area.toLowerCase().includes(q);
          if (!matchName && !matchAddr && !matchBus && !matchArea) {
            return false;
          }
        }

        if (filters.category !== 'ALL' && cp.category !== filters.category) {
          return false;
        }

        if (filters.onlyAmpleLots && cp.lots.car.available <= 15) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'best_value') {
          // Compare total cost
          const costA =
            (a.rates.weekdayDayRatePerHour || 2) * filters.durationHours +
            (a.category === 'campus' ? a.erpEstimateSgd : (a.connectedBus?.busFareSgd || 1.19) * 2);
          const costB =
            (b.rates.weekdayDayRatePerHour || 2) * filters.durationHours +
            (b.category === 'campus' ? b.erpEstimateSgd : (b.connectedBus?.busFareSgd || 1.19) * 2);
          return costA - costB;
        }
        if (filters.sortBy === 'most_lots') {
          return b.lots.car.available - a.lots.car.available;
        }
        if (filters.sortBy === 'closest_walk') {
          const timeA = a.category === 'campus' ? (a.walkTimeToSmuMins || 2) : (a.connectedBus?.rideMinutesToSmu || 15);
          const timeB = b.category === 'campus' ? (b.walkTimeToSmuMins || 2) : (b.connectedBus?.rideMinutesToSmu || 15);
          return timeA - timeB;
        }
        if (filters.sortBy === 'cheapest') {
          return (a.rates.weekdayDayRatePerHour || 2) - (b.rates.weekdayDayRatePerHour || 2);
        }
        return 0;
      });
  }, [carparks, filters]);

  // Aggregate stats
  const campusCarparks = useMemo(() => carparks.filter((c) => c.category === 'campus'), [carparks]);
  const parkAndRideCarparks = useMemo(() => carparks.filter((c) => c.category === 'park_and_ride'), [carparks]);

  const campusAvailableLots = useMemo(() => {
    return campusCarparks.reduce((sum, cp) => sum + cp.lots.car.available, 0);
  }, [campusCarparks]);

  const campusTotalLots = useMemo(() => {
    return campusCarparks.reduce((sum, cp) => sum + cp.lots.car.total, 0);
  }, [campusCarparks]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        favoritesCount={favorites.length}
        campusAvailableLots={campusAvailableLots}
        campusTotalLots={campusTotalLots}
        isRefreshing={isRefreshing}
        onManualRefresh={handleManualRefresh}
        onOpenBackendModal={() => setIsBackendModalOpen(true)}
        backendConfig={backendConfig}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />

      {/* Filter and Duration Bar */}
      {activeTab !== 'favorites' && activeTab !== 'busboard' && (
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          totalCount={carparks.length}
          filteredCount={filteredCarparks.length}
        />
      )}

      {/* Commuter Live Context Ticker */}
      <div className="bg-slate-100/90 dark:bg-slate-900/70 border-b border-slate-200/80 dark:border-slate-800/80 py-1.5 px-4 sm:px-6 lg:px-8 text-xs text-slate-600 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-white">
              SMU Campus Lots:
            </span>
            <span
              className={`font-mono font-bold ${
                campusAvailableLots <= 60
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {campusAvailableLots} lots free
            </span>
            <span className="text-slate-400">({campusTotalLots} total capacity)</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-500">
              Stop 04121 (Stamford Rd) active with 11 direct lines
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>SGT (UTC+8)</span>
            </span>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setActiveTab('busboard')}
              className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <Bus className="w-3 h-3" />
              <span>View Stop 04121 Board</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {activeTab === 'verdict' && (
          <div className="space-y-6">
            {/* The Live Commute Verdict Engine */}
            <CommuteVerdictCard
              comparison={commuteComparison}
              selectedDuration={filters.durationHours}
              onSelectDuration={(hrs) =>
                setFilters((p) => ({ ...p, durationHours: hrs }))
              }
              onSelectCarpark={(cp) => setSelectedCarpark(cp)}
              onViewBusBoard={() => setActiveTab('busboard')}
            />

            {/* Two-Column Comparison View: Campus Carparks vs Park & Ride to Stop 04121 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Column 1: Near Campus Walkable Carparks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Footprints className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Near SMU Campus (Walk ≤ 8m)
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {campusCarparks.length} Carparks
                  </span>
                </div>

                <div className="space-y-3">
                  {campusCarparks.map((cp) => (
                    <CarparkCard
                      key={cp.id}
                      carpark={cp}
                      vehicleType={filters.vehicleType}
                      isSelected={selectedCarpark?.id === cp.id}
                      isBookmarked={favorites.includes(cp.id)}
                      selectedDuration={filters.durationHours}
                      onToggleBookmark={handleToggleBookmark}
                      onSelect={(c) => setSelectedCarpark(c)}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              </div>

              {/* Column 2: Park & Ride to Stop 04121 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Bus className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Park Further Out & Bus into Stop 04121
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('busboard')}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>View Bus Board</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-3">
                  {parkAndRideCarparks.map((cp) => (
                    <CarparkCard
                      key={cp.id}
                      carpark={cp}
                      vehicleType={filters.vehicleType}
                      isSelected={selectedCarpark?.id === cp.id}
                      isBookmarked={favorites.includes(cp.id)}
                      selectedDuration={filters.durationHours}
                      onToggleBookmark={handleToggleBookmark}
                      onSelect={(c) => setSelectedCarpark(c)}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Bus Board for Stop 04121 */}
        {activeTab === 'busboard' && (
          <div className="space-y-4">
            <BusBoardStop04121
              busArrivals={busArrivals}
              carparks={carparks}
              onSelectCarpark={(cp) => setSelectedCarpark(cp)}
              onRefreshBus={handleManualRefresh}
              isRefreshing={isRefreshing}
            />
          </div>
        )}

        {/* Tab 3: Interactive Map */}
        {activeTab === 'map' && (
          <div className="flex flex-col lg:flex-row gap-6 min-h-[580px]">
            <div className="flex-1 min-h-[440px] lg:min-h-[580px]">
              <InteractiveMap
                carparks={filteredCarparks}
                selectedCarpark={selectedCarpark}
                onSelectCarpark={(cp) => setSelectedCarpark(cp)}
                vehicleType={filters.vehicleType}
                mapCenter={mapCenter}
                zoomLevel={zoomLevel}
                isDarkMode={isDarkMode}
                onFocusSmu={() => {
                  setMapCenter([SMU_STOP_04121_COORDINATES.lat, SMU_STOP_04121_COORDINATES.lng]);
                  setZoomLevel(14);
                }}
              />
            </div>

            <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col h-[500px] lg:h-[580px]">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Commute Parking Options ({filteredCarparks.length})
                </span>
                <span className="text-[11px] text-slate-400">Click to focus</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {filteredCarparks.map((cp) => (
                  <CarparkCard
                    key={cp.id}
                    carpark={cp}
                    vehicleType={filters.vehicleType}
                    isSelected={selectedCarpark?.id === cp.id}
                    isBookmarked={favorites.includes(cp.id)}
                    selectedDuration={filters.durationHours}
                    onToggleBookmark={handleToggleBookmark}
                    onSelect={(c) => {
                      setSelectedCarpark(c);
                      setMapCenter([c.coordinates.lat, c.coordinates.lng]);
                      setZoomLevel(15);
                    }}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Directory Grid */}
        {activeTab === 'directory' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  All Monitored Commute Carparks
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {filteredCarparks.length} campus and park & ride hubs
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCarparks.map((cp) => (
                <CarparkCard
                  key={cp.id}
                  carpark={cp}
                  vehicleType={filters.vehicleType}
                  isSelected={selectedCarpark?.id === cp.id}
                  isBookmarked={favorites.includes(cp.id)}
                  selectedDuration={filters.durationHours}
                  onToggleBookmark={handleToggleBookmark}
                  onSelect={(c) => setSelectedCarpark(c)}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Saved Favorites */}
        {activeTab === 'favorites' && (
          <FavoritesView
            carparks={carparks}
            favorites={favorites}
            vehicleType={filters.vehicleType}
            selectedCarpark={selectedCarpark}
            onSelectCarpark={(cp) => setSelectedCarpark(cp)}
            onToggleBookmark={handleToggleBookmark}
            onNavigate={handleNavigate}
            onExploreAll={() => setActiveTab('verdict')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Bus or Carpark?
            </span>
            <span aria-hidden="true">·</span>
            <span>SMU Commute Navigator & Stop 04121 Bus Board</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span>LTA DataMall CarParkAvailabilityv2 & BusArrival v3</span>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsBackendModalOpen(true)}
              className="text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Configure API Key
            </button>
          </div>
        </div>
      </footer>

      {/* Detail Modal */}
      {selectedCarpark && (
        <CarparkDetailModal
          carpark={selectedCarpark}
          onClose={() => setSelectedCarpark(null)}
          isBookmarked={favorites.includes(selectedCarpark.id)}
          onToggleBookmark={(id) => handleToggleBookmark(id)}
          vehicleType={filters.vehicleType}
        />
      )}

      {/* Backend Config Modal */}
      {isBackendModalOpen && (
        <BackendConfigModal
          config={backendConfig}
          onSaveConfig={(cfg) => {
            setBackendConfig(cfg);
            saveBackendConfig(cfg);
          }}
          onClose={() => setIsBackendModalOpen(false)}
        />
      )}
    </div>
  );
}
