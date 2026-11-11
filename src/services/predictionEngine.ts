import { Carpark, BusArrivalInfo } from '../types/carpark';
import { calculateParkingCostForHours } from './carparkService';
import { SMU_STOP_04121_COORDINATES } from '../data/singaporeCarparks';

export type DepartureTimeWindow = 'now' | 'in_30m' | 'morning_peak' | 'lunch_rush' | 'evening_class';
export type CommuteOrigin = 'east' | 'west' | 'north' | 'central';

export interface StartLocation {
  name: string;
  address: string;
  lat: number;
  lng: number;
  postal?: string;
}

export const DEFAULT_START_LOCATION: StartLocation = {
  name: 'Our Tampines Hub',
  address: '1 Tampines Walk, Singapore 528523',
  lat: 1.353321,
  lng: 103.940212,
  postal: '528523',
};

export interface CommutePredictionInput {
  startLocation: StartLocation;
  departureWindow: DepartureTimeWindow;
  durationHours: number;
  origin: CommuteOrigin;
  rainWeather: boolean;
  liveDriveTimeMinutes?: number;
  liveDistanceKm?: number;
  livePnrDriveTimeMinutes?: number;
}

export interface CommutePredictionResult {
  decision: 'TAKE_BUS' | 'DRIVE';
  confidenceScore: number; // 0 - 100%
  headline: string;
  summary: string;
  startLocation: StartLocation;
  directDriveTimeMinutes: number;
  directDistanceKm: number;
  pnrDriveTimeMinutes: number;
  pnrTotalTransitMinutes: number;
  arrivalTimeStr: string;
  predictedLotsAtSmu: number;
  campusRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedDirectDriveCost: number;
  estimatedParkAndRideCost: number;
  moneySaved: number;
  timeDiffMinutes: number;
  recommendedParkAndRideCarpark: Carpark;
  recommendedCampusCarpark: Carpark;
  connectedBusService: string;
  nextBusArrivalMins: number;
  factors: Array<{
    title: string;
    impact: 'take_bus' | 'drive' | 'neutral';
    detail: string;
  }>;
  itinerary: Array<{
    stepNumber: number;
    title: string;
    description: string;
    estimatedTime: string;
  }>;
}

// Origin mappings to optimal Park & Ride hubs
const ORIGIN_HUB_MAP: Record<CommuteOrigin, { hubId: string; defaultBus: string }> = {
  east: { hubId: 'URA-KALLANG', defaultBus: '16' }, // Kallang Riverside -> Bus 16 to 04121
  north: { hubId: 'HDB-THOMSON', defaultBus: '167' }, // Novena / Thomson -> Bus 167 to 04121
  west: { hubId: 'HDB-COMMONWEALTH', defaultBus: '106' }, // Commonwealth -> Bus 106 to 04121
  central: { hubId: 'HDB-WHAMPOA', defaultBus: '131' }, // Whampoa -> Bus 131 to 04121
};

// Search addresses via OneMap API proxy
export async function searchOneMapAddresses(query: string): Promise<StartLocation[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const res = await fetch(`/api/onemap/search?searchVal=${encodeURIComponent(query.trim())}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const results = data.results || [];

    return results.map((item: any) => ({
      name: item.BUILDING && item.BUILDING !== 'NIL' ? item.BUILDING : item.SEARCHVAL || item.ADDRESS,
      address: item.ADDRESS || `${item.BLK_NO || ''} ${item.ROAD_NAME || ''}`.trim(),
      lat: parseFloat(item.LATITUDE),
      lng: parseFloat(item.LONGITUDE),
      postal: item.POSTAL && item.POSTAL !== 'NIL' ? item.POSTAL : undefined,
    }));
  } catch (err) {
    console.warn('OneMap search failed, returning empty:', err);
    return [];
  }
}

// Route timing via OneMap API proxy
export async function fetchOneMapRouteTiming(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  routeType: 'drive' | 'walk' | 'pt' = 'drive'
): Promise<{ timeMinutes: number; distanceKm: number }> {
  try {
    const res = await fetch(
      `/api/onemap/route?start=${startLat},${startLng}&end=${endLat},${endLng}&routeType=${routeType}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    return {
      timeMinutes: data.time_minutes || Math.round((data.total_time || 1200) / 60),
      distanceKm: data.distance_km || Number(((data.total_distance || 10000) / 1000).toFixed(2)),
    };
  } catch (err) {
    console.warn('OneMap route failed, using distance estimation:', err);
    // Simple fallback
    const R = 6371;
    const dLat = ((endLat - startLat) * Math.PI) / 180;
    const dLon = ((endLng - startLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((startLat * Math.PI) / 180) *
        Math.cos((endLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.3;
    const mins = Math.max(5, Math.round((distKm / 38) * 60) + 3);
    return { timeMinutes: mins, distanceKm: Number(distKm.toFixed(2)) };
  }
}

export function predictCommuteDecision(
  carparks: Carpark[],
  busArrivals: BusArrivalInfo | null,
  input: CommutePredictionInput
): CommutePredictionResult {
  const {
    startLocation,
    departureWindow,
    durationHours,
    origin,
    rainWeather,
    liveDriveTimeMinutes,
    liveDistanceKm,
    livePnrDriveTimeMinutes,
  } = input;

  const campusCarparks = carparks.filter((c) => c.category === 'campus');
  const pnrCarparks = carparks.filter((c) => c.category === 'park_and_ride');

  // SMU Basement & immediate campus lots
  const smuBasement = campusCarparks.find((c) => c.id === 'SMU-BASEMENT') || campusCarparks[0];
  const brasBasahHdb = campusCarparks.find((c) => c.id === 'HDB-BRAS-BASAH') || campusCarparks[1];

  const currentSmuLots = smuBasement.lots.car.available;

  // Calculate direct drive time and distance from start location to SMU
  const directDriveMins = liveDriveTimeMinutes || 25;
  const directDistKm = liveDistanceKm || 14.5;

  // Depletion velocity modeling based on departure window and drive duration
  let depletionFactor = 1.0;
  let departureLabel = 'Leaving now';

  if (departureWindow === 'now') {
    depletionFactor = 1.0 + (directDriveMins / 30) * 0.4;
    departureLabel = `Leaving now (~${directDriveMins} mins drive)`;
  } else if (departureWindow === 'in_30m') {
    depletionFactor = 1.5 + (directDriveMins / 30) * 0.4;
    departureLabel = `Leaving in 30m (~${directDriveMins + 30} mins to arrival)`;
  } else if (departureWindow === 'morning_peak') {
    depletionFactor = 2.4;
    departureLabel = 'Morning Peak Rush (8:30–9:30 AM)';
  } else if (departureWindow === 'lunch_rush') {
    depletionFactor = 2.0;
    departureLabel = 'Lunch Peak Rush (12:00–1:30 PM)';
  } else if (departureWindow === 'evening_class') {
    depletionFactor = 1.5;
    departureLabel = 'Evening Classes (6:00–7:30 PM)';
  }

  if (rainWeather) {
    depletionFactor += 0.5; // Rain increases driving congestion and parking demand
  }

  // Predicted available lots when driver reaches SMU campus
  const predictedLotsAtSmu = Math.max(
    0,
    Math.round(currentSmuLots - Math.floor(depletionFactor * 7))
  );

  // Assess campus risk level
  let campusRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (predictedLotsAtSmu <= 3) {
    campusRiskLevel = 'CRITICAL';
  } else if (predictedLotsAtSmu <= 8) {
    campusRiskLevel = 'HIGH';
  } else if (predictedLotsAtSmu <= 18) {
    campusRiskLevel = 'MEDIUM';
  } else {
    campusRiskLevel = 'LOW';
  }

  // Find optimal Park & Ride hub matching origin direction
  const preferredMapping = ORIGIN_HUB_MAP[origin];
  const matchingPnr =
    pnrCarparks.find((p) => p.id === preferredMapping.hubId) ||
    pnrCarparks[0];

  // Best campus alternative
  const recommendedCampus =
    (currentSmuLots > 8 ? smuBasement : brasBasahHdb) || campusCarparks[0];

  // Cost modeling
  const directParkingFee = calculateParkingCostForHours(recommendedCampus, durationHours);
  const directErpToll = recommendedCampus.erpEstimateSgd || 2.0;
  const estimatedDirectDriveCost = Number((directParkingFee + directErpToll).toFixed(2));

  const pnrParkingFee = calculateParkingCostForHours(matchingPnr, durationHours);
  const twoWayBusFare = Number(((matchingPnr.connectedBus?.busFareSgd || 1.19) * 2).toFixed(2));
  const estimatedParkAndRideCost = Number((pnrParkingFee + twoWayBusFare).toFixed(2));

  const moneySaved = Number((estimatedDirectDriveCost - estimatedParkAndRideCost).toFixed(2));

  // Bus arrival calculation
  const busServiceNo = matchingPnr.connectedBus?.serviceNo || preferredMapping.defaultBus;
  const liveBus = busArrivals?.Services.find((s) => s.ServiceNo === busServiceNo);
  const nextBusArrivalMins = liveBus?.minutesToArrival ?? 4;

  // Accurate timing comparisons
  const pnrDriveMins = livePnrDriveTimeMinutes || Math.max(5, Math.round(directDriveMins * 0.65));
  const busRideMins = matchingPnr.connectedBus?.rideMinutesToSmu || 12;
  const pnrTotalTransitMins = pnrDriveMins + nextBusArrivalMins + busRideMins + 2; // parking walk + transfer
  const timeDiffMinutes = Math.max(0, pnrTotalTransitMins - directDriveMins);

  // Calculate arrival time clock string
  const arrivalDate = new Date(Date.now() + directDriveMins * 60000);
  const arrivalTimeStr = arrivalDate.toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Weighted Scoring Formula
  let decisionScore = 0;

  if (campusRiskLevel === 'CRITICAL') decisionScore += 45;
  else if (campusRiskLevel === 'HIGH') decisionScore += 30;
  else if (campusRiskLevel === 'MEDIUM') decisionScore += 10;
  else decisionScore -= 20;

  if (moneySaved >= 10.0) decisionScore += 30;
  else if (moneySaved >= 6.0) decisionScore += 20;
  else if (moneySaved >= 3.0) decisionScore += 10;
  else decisionScore -= 10;

  if (durationHours >= 4) decisionScore += 20;
  else if (durationHours === 1) decisionScore -= 25;

  if (rainWeather && campusRiskLevel !== 'CRITICAL') {
    decisionScore -= 10;
  }

  const decision: 'TAKE_BUS' | 'DRIVE' = decisionScore >= 15 ? 'TAKE_BUS' : 'DRIVE';
  const rawConfidence = Math.min(98, Math.max(72, Math.round(50 + Math.abs(decisionScore) * 0.75)));

  // Factors
  const factors: CommutePredictionResult['factors'] = [];

  factors.push({
    title: `Travel Timing from ${startLocation.name}`,
    impact: directDriveMins > 30 ? 'take_bus' : 'neutral',
    detail: `Driving: ~${directDriveMins} mins (${directDistKm} km via OneMap routing) to SMU. Park & Ride: ~${pnrDriveMins} mins drive to ${matchingPnr.name} + ~${busRideMins} mins on Bus ${busServiceNo}.`,
  });

  factors.push({
    title: 'Predicted Lot Availability at SMU',
    impact: predictedLotsAtSmu <= 5 ? 'take_bus' : 'drive',
    detail: `Current: ${currentSmuLots} lots. By the time you drive in (${departureLabel}): ~${predictedLotsAtSmu} lots remaining at SMU Basement (${campusRiskLevel} Risk).`,
  });

  factors.push({
    title: 'Financial Cost Comparison',
    impact: moneySaved > 4 ? 'take_bus' : 'neutral',
    detail: `Direct drive: S$${estimatedDirectDriveCost.toFixed(2)} (inc. S$${directErpToll.toFixed(2)} ERP) vs Park & Ride: S$${estimatedParkAndRideCost.toFixed(2)} (Save S$${moneySaved.toFixed(2)}).`,
  });

  factors.push({
    title: `Time to Next Bus (Service ${busServiceNo})`,
    impact: nextBusArrivalMins <= 5 ? 'take_bus' : 'neutral',
    detail: `Next Bus ${busServiceNo} arriving in ~${nextBusArrivalMins}m (${liveBus?.NextBus.Load === 'SEA' ? 'seats available' : 'standing room'}). Alight directly at Stop 04121 outside Li Ka Shing Library.`,
  });

  let headline = '';
  let summary = '';

  if (decision === 'TAKE_BUS') {
    headline = `PREDICTION: TAKE THE BUS (${rawConfidence}% Confidence)`;
    summary = `From ${startLocation.name} (${directDistKm} km), campus lots are predicted to hit critical capacity (~${predictedLotsAtSmu} lots left by arrival). Save S$${moneySaved.toFixed(2)} and avoid full gantries by parking at ${matchingPnr.name} and taking Bus ${busServiceNo} directly to Stop 04121.`;
  } else {
    headline = `PREDICTION: DRIVE IN DIRECTLY (${rawConfidence}% Confidence)`;
    summary = `From ${startLocation.name}, driving straight to ${recommendedCampus.name} takes ~${directDriveMins} mins. For your ${durationHours}h stay, healthy lot reserves (~${predictedLotsAtSmu} lots predicted) make driving faster with minimal cost penalty.`;
  }

  const itinerary = decision === 'TAKE_BUS'
    ? [
        {
          stepNumber: 1,
          title: `Drive from ${startLocation.name} to ${matchingPnr.name}`,
          description: `~${pnrDriveMins} mins drive. Ample parking (${matchingPnr.lots.car.available} free lots). 0 ERP tolls! Rate: $${matchingPnr.rates.weekdayDayRatePerHour}/hr.`,
          estimatedTime: `~${pnrDriveMins}m drive`,
        },
        {
          stepNumber: 2,
          title: `Board Bus ${busServiceNo}`,
          description: `Bus arrives every ~${nextBusArrivalMins}–8 mins. Tap in with contactless card (Fare: S$${matchingPnr.connectedBus?.busFareSgd.toFixed(2)}).`,
          estimatedTime: `Next bus in ~${nextBusArrivalMins}m`,
        },
        {
          stepNumber: 3,
          title: 'Alight at Stop 04121 (SMU Stamford Road)',
          description: 'Step right off outside SMU School of Accountancy & Li Ka Shing Library. 0 mins walk to class.',
          estimatedTime: `~${busRideMins} min ride`,
        },
      ]
    : [
        {
          stepNumber: 1,
          title: `Drive from ${startLocation.name} to ${recommendedCampus.name}`,
          description: `~${directDriveMins} mins drive (${directDistKm} km). Enter via Bras Basah / Stamford Road cordon (ERP ~$${directErpToll.toFixed(2)}).`,
          estimatedTime: `~${directDriveMins}m drive`,
        },
        {
          stepNumber: 2,
          title: 'Park at Campus MSCP / Basement',
          description: `Predicted ~${predictedLotsAtSmu} lots available upon arrival. EPS gantry clearance ${recommendedCampus.clearanceHeight}m.`,
          estimatedTime: 'Fast Entry',
        },
        {
          stepNumber: 3,
          title: 'Walk to SMU Seminars / Library',
          description: `~${recommendedCampus.walkTimeToSmuMins} mins direct walk to SMU campus buildings.`,
          estimatedTime: `~${recommendedCampus.walkTimeToSmuMins}m walk`,
        },
      ];

  return {
    decision,
    confidenceScore: rawConfidence,
    headline,
    summary,
    startLocation,
    directDriveTimeMinutes: directDriveMins,
    directDistanceKm: directDistKm,
    pnrDriveTimeMinutes: pnrDriveMins,
    pnrTotalTransitMinutes: pnrTotalTransitMins,
    arrivalTimeStr,
    predictedLotsAtSmu,
    campusRiskLevel,
    estimatedDirectDriveCost,
    estimatedParkAndRideCost,
    moneySaved,
    timeDiffMinutes,
    recommendedParkAndRideCarpark: matchingPnr,
    recommendedCampusCarpark: recommendedCampus,
    connectedBusService: busServiceNo,
    nextBusArrivalMins,
    factors,
    itinerary,
  };
}
