export type VehicleType = 'car' | 'motorcycle' | 'heavy';
export type AgencyType = 'SMU' | 'HDB' | 'URA' | 'LTA' | 'MALL' | 'COMMERCIAL';
export type CarparkType = 'MSCP' | 'Basement' | 'Surface' | 'Mechanised';
export type OccupancyStatus = 'ample' | 'moderate' | 'full';
export type CommuteCategory = 'campus' | 'park_and_ride';

export interface LotBreakdown {
  total: number;
  available: number;
}

export interface EvChargingInfo {
  available: boolean;
  totalPoints?: number;
  availablePoints?: number;
  operator?: string;
  powerKw?: number;
  connectors?: string[];
}

export interface RatesInfo {
  weekdayDay: string;
  weekdayDayRatePerHour: number;
  weekdayEvening: string;
  weekendRate: string;
  sundayFree: boolean;
  gracePeriodMins: number;
  centralZoneSurcharge?: boolean;
}

export interface ConnectedBusInfo {
  serviceNo: string;
  operator: 'SBST' | 'SMRT' | 'TTS' | 'GAS';
  rideMinutesToSmu: number;
  busFareSgd: number; // Single trip contactless fare in SGD
  directToStop04121: boolean;
}

export interface Carpark {
  id: string;
  name: string;
  address: string;
  postalCode: string;
  area: string;
  category: CommuteCategory; // 'campus' (walk to SMU) or 'park_and_ride' (outer bus line to Stop 04121)
  walkTimeToSmuMins?: number; // Minutes walking to SMU campus
  connectedBus?: ConnectedBusInfo; // If park_and_ride, direct bus to Stop 04121
  erpEstimateSgd: number; // Estimated ERP gantry charge if driving directly
  coordinates: {
    lat: number;
    lng: number;
  };
  agency: AgencyType;
  type: CarparkType;
  clearanceHeight: number;
  lots: {
    car: LotBreakdown;
    motorcycle?: LotBreakdown;
    heavy?: LotBreakdown;
  };
  rates: RatesInfo;
  evCharging: EvChargingInfo;
  gantryType: 'Electronic (EPS)' | 'Ticketed' | 'Barrier-free';
  updatedAt: string;
  occupancyStatus: OccupancyStatus;
  trend: 'filling' | 'emptying' | 'stable';
  distanceKm?: number;
}

export interface BusArrivalInfo {
  BusStopCode: string;
  BusStopDescription: string;
  RoadName: string;
  Services: Array<{
    ServiceNo: string;
    Operator: 'SBST' | 'SMRT' | 'TTS' | 'GAS';
    NextBus: {
      EstimatedArrival: string;
      Load: 'SEA' | 'SDA' | 'LSD';
      Type: 'SD' | 'DD' | 'BD';
    };
    NextBus2?: {
      EstimatedArrival: string;
      Load: 'SEA' | 'SDA' | 'LSD';
      Type: 'SD' | 'DD' | 'BD';
    };
    minutesToArrival?: number;
    minutesToArrival2?: number;
    originParkAndRide?: string;
    suggestedCarparkId?: string;
  }>;
  timestamp: string;
  isSimulated?: boolean;
}

export interface CommuteComparison {
  durationHours: number;
  directCampusBest: {
    carpark: Carpark;
    parkingCost: number;
    erpCost: number;
    totalCost: number;
    availableLots: number;
    totalLots: number;
    occupancyStatus: OccupancyStatus;
    totalTimeMins: number; // drive + parking walk
  };
  parkAndRideBest: {
    carpark: Carpark;
    parkingCost: number;
    busFareTwoWays: number;
    totalCost: number;
    availableLots: number;
    totalLots: number;
    occupancyStatus: OccupancyStatus;
    totalTimeMins: number; // park + wait + bus ride to 04121
    busService: string;
    nextBusMinutes: number;
  };
  moneySavedSgd: number;
  timeDiffMins: number; // positive = bus takes X min longer, but saves $Y
  verdict: 'drive_direct' | 'park_and_ride' | 'toss_up';
  verdictHeadline: string;
  verdictReason: string;
}

export interface FilterOptions {
  searchQuery: string;
  category: 'ALL' | 'campus' | 'park_and_ride';
  vehicleType: VehicleType;
  durationHours: number; // 1, 2, 4, 8 hours
  onlyAmpleLots: boolean;
  sortBy: 'best_value' | 'most_lots' | 'closest_walk' | 'cheapest';
}
