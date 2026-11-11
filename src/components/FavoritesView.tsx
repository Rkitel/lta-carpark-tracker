import React from 'react';
import { Carpark, VehicleType } from '../types/carpark';
import { CarparkCard } from './CarparkCard';
import { Bookmark, Sparkles, ArrowRight } from 'lucide-react';

interface FavoritesViewProps {
  carparks: Carpark[];
  favorites: string[];
  vehicleType: VehicleType;
  selectedCarpark: Carpark | null;
  onSelectCarpark: (carpark: Carpark) => void;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  onNavigate: (carpark: Carpark, e: React.MouseEvent) => void;
  onExploreAll: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  carparks,
  favorites,
  vehicleType,
  selectedCarpark,
  onSelectCarpark,
  onToggleBookmark,
  onNavigate,
  onExploreAll,
}) => {
  const favoriteCarparks = carparks.filter((cp) => favorites.includes(cp.id));

  // Compute total available lots in saved spots
  const totalSavedLots = favoriteCarparks.reduce((sum, cp) => {
    let avail = cp.lots.car.available;
    if (vehicleType === 'motorcycle' && cp.lots.motorcycle) {
      avail = cp.lots.motorcycle.available;
    } else if (vehicleType === 'heavy' && cp.lots.heavy) {
      avail = cp.lots.heavy.available;
    }
    return sum + avail;
  }, 0);

  if (favoriteCarparks.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-800">
          <Bookmark className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          No Saved Carparks Yet
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Tap the bookmark icon on any Singapore carpark to pin your regular
          daily parking spots (e.g. office MSCP, home HDB, or favorite mall).
        </p>
        <button
          onClick={onExploreAll}
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs"
        >
          <span>Explore Singapore Carparks</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-5">
      {/* Overview Banner */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Your Daily Saved Carparks</span>
            <span className="px-2 py-0.5 text-xs font-mono rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 font-semibold">
              {favoriteCarparks.length} Saved
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Quick real-time status check for your most frequented Singapore locations
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-400 block text-[11px]">Free Lots Available:</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {totalSavedLots} lots
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Saved Carparks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {favoriteCarparks.map((cp) => (
          <CarparkCard
            key={cp.id}
            carpark={cp}
            vehicleType={vehicleType}
            isSelected={selectedCarpark?.id === cp.id}
            isBookmarked={true}
            selectedDuration={4}
            onToggleBookmark={onToggleBookmark}
            onSelect={onSelectCarpark}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
};
