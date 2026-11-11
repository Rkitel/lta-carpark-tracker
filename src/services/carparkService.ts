import {
  Carpark,
  OccupancyStatus,
  BusArrivalInfo,
  CommuteComparison,
} from '../types/carpark';
import {
  INITIAL_SMU_CARPARKS,
  SMU_STOP_04121_COORDINATES,
} from '../data/singaporeCarparks';

export interface BackendConfig {
  mode: 'simulated' | 'custom_api';
  apiUrl: string;
  apiKey: string;
  refreshIntervalSec: number;
}

const DEFAULT_CONFIG: BackendConfig = {
  mode: 'simulated',
  apiUrl: '/api/carparkavailability',
  apiKey: '',
  refreshIntervalSec: 20,
};

// Calculate Haversine distance in km
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// Recalculate status
export function getOccupancyStatus(available: number, total: number): OccupancyStatus {
  if (total <= 0) return 'full';
  const ratio = available / total;
  if (available <= 8 || ratio < 0.1) return 'full';
  if (ratio < 0.3) return 'moderate';
  return 'ample';
}

// Storage helpers
export function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem('parksg_smu_favorites');
    return raw ? JSON.parse(raw) : ['SMU-BASEMENT', 'HDB-BRAS-BASAH', 'URA-KALLANG'];
  } catch {
    return ['SMU-BASEMENT', 'HDB-BRAS-BASAH', 'URA-KALLANG'];
  }
}

export function saveFavorites(favs: string[]) {
  try {
    localStorage.setItem('parksg_smu_favorites', JSON.stringify(favs));
  } catch (e) {
    console.warn('Failed to save favorites to localStorage', e);
  }
}

export function loadBackendConfig(): BackendConfig {
  try {
    const raw = localStorage.getItem('parksg_backend_config');
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveBackendConfig(config: BackendConfig) {
  try {
    localStorage.setItem('parksg_backend_config', JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save backend config', e);
  }
}

// Simulate realistic lot fluctuations
export function simulateLotUpdates(carparks: Carpark[]): Carpark[] {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return carparks.map((cp) => {
    // 60% chance of lot movement
    if (Math.random() < 0.6) {
      // Near campus lots are tighter and fill faster
      const delta = cp.category === 'campus'
        ? Math.floor(Math.random() * 5) - 3 // -3 to +1 (tendency to fill)
        : Math.floor(Math.random() * 7) - 3; // -3 to +3

      const newAvail = Math.max(0, Math.min(cp.lots.car.total, cp.lots.car.available + delta));
      const trend = delta > 0 ? 'emptying' : delta < 0 ? 'filling' : cp.trend;

      return {
        ...cp,
        lots: {
          ...cp.lots,
          car: {
            ...cp.lots.car,
            available: newAvail,
          },
        },
        occupancyStatus: getOccupancyStatus(newAvail, cp.lots.car.total),
        trend,
        updatedAt: timeStr,
      };
    }
    return cp;
  });
}

// Calculate parking cost for specific hours
export function calculateParkingCostForHours(carpark: Carpark, durationHours: number): number {
  const ratePerHour = carpark.rates.weekdayDayRatePerHour || 2.4;
  return Number((durationHours * ratePerHour).toFixed(2));
}

// Calculate detailed estimated parking fee with grace period and day conditions
export function calculateParkingCost(
  carpark: Carpark,
  arrivalDate: Date,
  stayMinutes: number
): { totalCost: number; breakdownText: string; isFree: boolean } {
  const grace = carpark.rates.gracePeriodMins || 10;
  if (stayMinutes <= grace) {
    return {
      totalCost: 0,
      breakdownText: `Within ${grace}-min complimentary grace period (Free drop-off)`,
      isFree: true,
    };
  }

  const dayOfWeek = arrivalDate.getDay(); // 0 is Sunday
  const arrivalHour = arrivalDate.getHours();

  // Check HDB Sunday Free Parking Scheme
  if (dayOfWeek === 0 && carpark.rates.sundayFree) {
    if (arrivalHour >= 7 && arrivalHour < 22) {
      return {
        totalCost: 0,
        breakdownText: 'HDB Free Parking Scheme (FPS) active on Sundays 7:30 AM – 10:30 PM',
        isFree: true,
      };
    }
  }

  if (arrivalHour >= 18 && carpark.rates.weekdayEvening.includes('entry')) {
    const match = carpark.rates.weekdayEvening.match(/\$(\d+(\.\d+)?)/);
    const flatRate = match ? parseFloat(match[1]) : 3.5;
    return {
      totalCost: flatRate,
      breakdownText: `Evening entry flat rate: ${carpark.rates.weekdayEvening}`,
      isFree: false,
    };
  }

  const hours = stayMinutes / 60;
  const ratePerHour = carpark.rates.weekdayDayRatePerHour || 2.4;
  const cost = Math.max(1.2, Number((hours * ratePerHour).toFixed(2)));

  return {
    totalCost: cost,
    breakdownText: `Estimated at ~$${ratePerHour.toFixed(2)}/hr (${stayMinutes} mins parked)`,
    isFree: false,
  };
}

// Fetch live bus arrivals for Stop 04121 (SMU Stamford Road)
export async function fetchLiveBusArrivals(): Promise<BusArrivalInfo> {
  try {
    const response = await fetch('/api/busarrival?busStopCode=04121', {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: BusArrivalInfo = await response.json();
    return data;
  } catch (err) {
    console.warn('Failed to fetch from /api/busarrival, using fallback generator', err);
    return generateFallbackBusArrivals();
  }
}

function generateFallbackBusArrivals(): BusArrivalInfo {
  const now = new Date();
  return {
    BusStopCode: '04121',
    BusStopDescription: 'SMU (Singapore Management University)',
    RoadName: 'Stamford Road',
    timestamp: now.toISOString(),
    isSimulated: true,
    Services: [
      {
        ServiceNo: '16',
        Operator: 'SBST',
        minutesToArrival: 3,
        minutesToArrival2: 12,
        originParkAndRide: 'Kallang Riverside Carpark',
        suggestedCarparkId: 'URA-KALLANG',
        NextBus: {
          EstimatedArrival: new Date(now.getTime() + 3 * 60000).toISOString(),
          Load: 'SEA',
          Type: 'DD',
        },
      },
      {
        ServiceNo: '14',
        Operator: 'SBST',
        minutesToArrival: 5,
        minutesToArrival2: 14,
        originParkAndRide: 'Mountbatten / Old Airport MSCP',
        suggestedCarparkId: 'HDB-OLD-AIRPORT',
        NextBus: {
          EstimatedArrival: new Date(now.getTime() + 5 * 60000).toISOString(),
          Load: 'SEA',
          Type: 'DD',
        },
      },
      {
        ServiceNo: '7',
        Operator: 'SBST',
        minutesToArrival: 4,
        minutesToArrival2: 15,
        originParkAndRide: 'Geylang East / Aljunied MSCP',
        suggestedCarparkId: 'HDB-GEYLANG',
        NextBus: {
          EstimatedArrival: new Date(now.getTime() + 4 * 60000).toISOString(),
          Load: 'SDA',
          Type: 'SD',
        },
      },
      {
        ServiceNo: '131',
        Operator: 'SBST',
        minutesToArrival: 6,
        minutesToArrival2: 16,
        originParkAndRide: 'Balestier / Whampoa MSCP',
        suggestedCarparkId: 'HDB-WHAMPOA',
        NextBus: {
          EstimatedArrival: new Date(now.getTime() + 6 * 60000).toISOString(),
          Load: 'SEA',
          Type: 'SD',
        },
      },
      {
        ServiceNo: '167',
        Operator: 'SMRT',
        minutesToArrival: 8,
        minutesToArrival2: 19,
        originParkAndRide: 'Novena / Thomson MSCP',
        suggestedCarparkId: 'HDB-THOMSON',
        NextBus: {
          EstimatedArrival: new Date(now.getTime() + 8 * 60000).toISOString(),
          Load: 'SEA',
          Type: 'DD',
        },
      },
      {
        ServiceNo: '106',
        Operator: 'TTS',
        minutesToArrival: 2,
        minutesToArrival2: 11,
        originParkAndRide: 'Commonwealth / Queenstown MSCP',
        suggestedCarparkId: 'HDB-COMMONWEALTH',
        NextBus: {
          EstimatedArrival: new Date(now.getTime() + 2 * 60000).toISOString(),
          Load: 'SEA',
          Type: 'DD',
        },
      },
    ],
  };
}

// Compute the smart Commute Comparison Verdict: Drive All The Way vs Park & Ride
export function computeCommuteVerdict(
  carparks: Carpark[],
  busArrivals: BusArrivalInfo | null,
  durationHours: number
): CommuteComparison {
  const campusCarparks = carparks.filter((c) => c.category === 'campus');
  const parkAndRideCarparks = carparks.filter((c) => c.category === 'park_and_ride');

  // Find best campus option (prioritizing available lots, then price)
  const bestCampus = [...campusCarparks].sort((a, b) => {
    // If one is full and other has ample lots, strongly prefer the available one
    const aFull = a.lots.car.available <= 10;
    const bFull = b.lots.car.available <= 10;
    if (aFull !== bFull) return aFull ? 1 : -1;

    const costA = calculateParkingCostForHours(a, durationHours) + a.erpEstimateSgd;
    const costB = calculateParkingCostForHours(b, durationHours) + b.erpEstimateSgd;
    return costA - costB;
  })[0] || campusCarparks[0];

  // Find best park and ride option
  const bestPnr = [...parkAndRideCarparks].sort((a, b) => {
    // Match with fastest bus arrival if available
    const serviceA = a.connectedBus?.serviceNo;
    const serviceB = b.connectedBus?.serviceNo;

    const arrivalA = busArrivals?.Services.find((s) => s.ServiceNo === serviceA)?.minutesToArrival ?? 10;
    const arrivalB = busArrivals?.Services.find((s) => s.ServiceNo === serviceB)?.minutesToArrival ?? 10;

    // Combined ride + wait time
    const timeA = (a.connectedBus?.rideMinutesToSmu || 15) + arrivalA;
    const timeB = (b.connectedBus?.rideMinutesToSmu || 15) + arrivalB;
    return timeA - timeB;
  })[0] || parkAndRideCarparks[0];

  const campusParkingCost = calculateParkingCostForHours(bestCampus, durationHours);
  const campusErpCost = bestCampus.erpEstimateSgd || 0;
  const campusTotalCost = Number((campusParkingCost + campusErpCost).toFixed(2));
  const campusTimeMins = (bestCampus.walkTimeToSmuMins || 3) + 12; // 12 min city traffic + walk

  const pnrParkingCost = calculateParkingCostForHours(bestPnr, durationHours);
  const pnrBusFareTwoWays = Number(((bestPnr.connectedBus?.busFareSgd || 1.19) * 2).toFixed(2));
  const pnrTotalCost = Number((pnrParkingCost + pnrBusFareTwoWays).toFixed(2));

  const busServiceNo = bestPnr.connectedBus?.serviceNo || '16';
  const matchingBus = busArrivals?.Services.find((s) => s.ServiceNo === busServiceNo);
  const nextBusMins = matchingBus?.minutesToArrival ?? 4;
  const pnrTotalTimeMins = (bestPnr.connectedBus?.rideMinutesToSmu || 12) + nextBusMins + 3; // 3 min walk to bus

  const moneySaved = Number((campusTotalCost - pnrTotalCost).toFixed(2));
  const timeDiff = Math.max(0, pnrTotalTimeMins - campusTimeMins);

  // Determine intelligent verdict
  const campusIsTight = bestCampus.lots.car.available <= 15;
  const smuBasement = campusCarparks.find((c) => c.id === 'SMU-BASEMENT');
  const smuBasementIsFull = (smuBasement?.lots.car.available ?? 0) <= 8;

  let verdict: 'drive_direct' | 'park_and_ride' | 'toss_up' = 'park_and_ride';
  let verdictHeadline = '';
  let verdictReason = '';

  if (campusIsTight || smuBasementIsFull) {
    verdict = 'park_and_ride';
    verdictHeadline = `Park & Ride Recommended: Campus Lots Critical (${bestCampus.name} has only ${bestCampus.lots.car.available} lots)`;
    verdictReason = `Save S$${moneySaved.toFixed(2)} today by parking at ${bestPnr.name} (${bestPnr.lots.car.available} free lots) and taking Bus ${busServiceNo} directly to Stop 04121 (arriving in ${nextBusMins}m).`;
  } else if (durationHours >= 4 && moneySaved >= 7.00) {
    verdict = 'park_and_ride';
    verdictHeadline = `Park & Ride Recommended: Save S$${moneySaved.toFixed(2)} for ${durationHours}h stay`;
    verdictReason = `Parking near SMU will cost S$${campusTotalCost.toFixed(2)} (inc. S$${campusErpCost.toFixed(2)} ERP). Park at ${bestPnr.name} for S$${pnrTotalCost.toFixed(2)} total (inc. two-way bus fare on Bus ${busServiceNo}).`;
  } else if (durationHours <= 2 && !campusIsTight) {
    verdict = 'drive_direct';
    verdictHeadline = `Drive Directly In: Quick Stay (${durationHours}h) & Available Campus Lots`;
    verdictReason = `${bestCampus.name} has ${bestCampus.lots.car.available} lots available. For a short stay of ${durationHours}h, the S$${moneySaved.toFixed(2)} savings is offset by saving ${timeDiff} mins of commute time.`;
  } else {
    verdict = 'toss_up';
    verdictHeadline = `Close Call: S$${moneySaved.toFixed(2)} savings vs ${timeDiff} mins time difference`;
    verdictReason = `Drive in to ${bestCampus.name} if you are in a rush. Otherwise, take Bus ${busServiceNo} from ${bestPnr.name} to avoid ERP and guaranteed easy lot.`;
  }

  return {
    durationHours,
    directCampusBest: {
      carpark: bestCampus,
      parkingCost: campusParkingCost,
      erpCost: campusErpCost,
      totalCost: campusTotalCost,
      availableLots: bestCampus.lots.car.available,
      totalLots: bestCampus.lots.car.total,
      occupancyStatus: bestCampus.occupancyStatus,
      totalTimeMins: campusTimeMins,
    },
    parkAndRideBest: {
      carpark: bestPnr,
      parkingCost: pnrParkingCost,
      busFareTwoWays: pnrBusFareTwoWays,
      totalCost: pnrTotalCost,
      availableLots: bestPnr.lots.car.available,
      totalLots: bestPnr.lots.car.total,
      occupancyStatus: bestPnr.occupancyStatus,
      totalTimeMins: pnrTotalTimeMins,
      busService: busServiceNo,
      nextBusMinutes: nextBusMins,
    },
    moneySavedSgd: moneySaved,
    timeDiffMins: timeDiff,
    verdict,
    verdictHeadline,
    verdictReason,
  };
}

// Test / Connect function
export async function fetchLiveCarparkData(config: BackendConfig): Promise<{
  success: boolean;
  message: string;
  dataCount?: number;
}> {
  if (config.mode === 'simulated') {
    return {
      success: true,
      message: 'Connected to SMU Campus & Stop 04121 Live Commute Telemetry Engine (17 Monitored Hubs)',
      dataCount: INITIAL_SMU_CARPARKS.length,
    };
  }

  try {
    const headers: Record<string, string> = {};
    if (config.apiKey) {
      headers['AccountKey'] = config.apiKey;
    }

    const response = await fetch(config.apiUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    const count = json.value ? json.value.length : json.items ? json.items.length : 0;

    return {
      success: true,
      message: `Successfully connected to LTA API! Received ${count || 'live'} records.`,
      dataCount: count,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Connection failed: ${err.message || 'Network error'}. Check your LTA AccountKey.`,
    };
  }
}
