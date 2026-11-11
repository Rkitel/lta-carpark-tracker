import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Carpark, VehicleType } from '../types/carpark';
import { SMU_STOP_04121_COORDINATES } from '../data/singaporeCarparks';
import { Locate, RotateCcw, Bus, Car } from 'lucide-react';

interface InteractiveMapProps {
  carparks: Carpark[];
  selectedCarpark: Carpark | null;
  onSelectCarpark: (carpark: Carpark) => void;
  vehicleType: VehicleType;
  mapCenter: [number, number];
  zoomLevel: number;
  isDarkMode: boolean;
  onFocusSmu: () => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  carparks,
  selectedCarpark,
  onSelectCarpark,
  vehicleType,
  mapCenter,
  zoomLevel,
  isDarkMode,
  onFocusSmu,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const smuMarkerRef = useRef<L.Marker | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [SMU_STOP_04121_COORDINATES.lat, SMU_STOP_04121_COORDINATES.lng],
      zoom: 14,
      minZoom: 11,
      maxZoom: 18,
      zoomControl: false,
    });

    // Zoom control
    L.control
      .zoom({
        position: 'bottomright',
      })
      .addTo(map);

    const tileUrl = isDarkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // 500m Walk radius circle around SMU
    L.circle([SMU_STOP_04121_COORDINATES.lat, SMU_STOP_04121_COORDINATES.lng], {
      radius: 600,
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.08,
      weight: 1.5,
      dashArray: '4, 6',
    }).addTo(map);

    // SMU Campus Stop 04121 Special Epicenter Marker
    const smuIconHtml = `
      <div class="cursor-pointer flex items-center justify-center">
        <div class="px-2.5 py-1 rounded-full bg-slate-950 text-emerald-400 border-2 border-emerald-500 shadow-xl flex items-center gap-1.5 font-bold text-xs ring-4 ring-emerald-500/20">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>SMU Stop 04121</span>
        </div>
      </div>
    `;

    const smuIcon = L.divIcon({
      className: 'bg-transparent',
      html: smuIconHtml,
      iconSize: [140, 32],
      iconAnchor: [70, 16],
    });

    const smuMarker = L.marker(
      [SMU_STOP_04121_COORDINATES.lat, SMU_STOP_04121_COORDINATES.lng],
      { icon: smuIcon }
    ).addTo(map);

    smuMarker.bindTooltip(
      `<strong>SMU Campus (Li Ka Shing Library)</strong><br/>
       Bus Stop 04121 · Stamford Road<br/>
       <span style="color: #10b981;">Lines: 7, 14, 16, 36, 106, 131, 167, 175</span>`,
      { permanent: false, direction: 'top' }
    );

    smuMarkerRef.current = smuMarker;

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update tile theme if dark mode changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const tileUrl = isDarkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
  }, [isDarkMode]);

  // Update map center when props change
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(mapCenter, zoomLevel, {
        duration: 1.2,
      });
    }
  }, [mapCenter, zoomLevel]);

  // Render markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const markersGroup = markersLayerRef.current;
    markersGroup.clearLayers();

    carparks.forEach((cp) => {
      const availableLots = cp.lots.car.available;
      const totalLots = cp.lots.car.total;

      const isFull = availableLots <= 10 || availableLots / (totalLots || 1) < 0.1;
      const isModerate = !isFull && availableLots / (totalLots || 1) < 0.3;

      const badgeColor = isFull
        ? 'bg-rose-600 border-rose-700 text-white'
        : isModerate
        ? 'bg-amber-500 border-amber-600 text-white'
        : 'bg-emerald-600 border-emerald-700 text-white';

      const isSelected = selectedCarpark?.id === cp.id;
      const isCampus = cp.category === 'campus';

      const customHtml = `
        <div class="custom-carpark-pin cursor-pointer flex items-center justify-center">
          <div class="px-2 py-1 rounded-full text-[11px] font-mono font-bold tracking-tight shadow-md border flex items-center gap-1 ${badgeColor} ${
        isSelected
          ? 'ring-4 ring-emerald-400 dark:ring-emerald-300 scale-110'
          : 'hover:scale-105'
      }">
            <span class="text-[9px] font-sans font-semibold opacity-90">${isCampus ? '🚶' : `🚌${cp.connectedBus?.serviceNo || ''}`}</span>
            <span>${availableLots}</span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'bg-transparent',
        html: customHtml,
        iconSize: [52, 26],
        iconAnchor: [26, 13],
      });

      const marker = L.marker([cp.coordinates.lat, cp.coordinates.lng], { icon });

      marker.on('click', () => {
        onSelectCarpark(cp);
      });

      marker.bindTooltip(
        `<strong>${cp.name}</strong><br/>
         <span style="font-family: monospace;">${availableLots} / ${totalLots}</span> lots free<br/>
         <span style="color: #64748b; font-size: 11px;">${
           isCampus
             ? `🚶 ${cp.walkTimeToSmuMins}m walk to SMU`
             : `🚌 Bus ${cp.connectedBus?.serviceNo} to Stop 04121 in ${cp.connectedBus?.rideMinutesToSmu}m`
         }</span>`,
        {
          direction: 'top',
          offset: [0, -10],
          opacity: 0.95,
        }
      );

      marker.addTo(markersGroup);
    });
  }, [carparks, selectedCarpark, vehicleType]);

  const handleResetSmu = () => {
    mapInstanceRef.current?.flyTo(
      [SMU_STOP_04121_COORDINATES.lat, SMU_STOP_04121_COORDINATES.lng],
      14,
      { duration: 1 }
    );
  };

  return (
    <div className="relative w-full h-full min-h-[380px] lg:min-h-[500px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-100 dark:bg-slate-900">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Action Buttons */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <button
          onClick={handleResetSmu}
          title="Center on SMU Campus & Stop 04121"
          className="px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
          <span>SMU Center</span>
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs px-3 py-2 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">🚶</span>
          <span className="text-[11px] font-medium">Campus Walk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs">🚌</span>
          <span className="text-[11px] font-medium">Park & Ride Line</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
          <span className="text-[11px]">Ample</span>
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 ml-1" />
          <span className="text-[11px]">Critical / Full</span>
        </div>
      </div>
    </div>
  );
};
