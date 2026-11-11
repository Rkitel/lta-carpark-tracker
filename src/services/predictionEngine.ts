import { Carpark, BusArrivalInfo } from '../types/carpark';
import { calculateParkingCostForHours } from './carparkService';

export type DepartureTimeWindow = 'now' | 'in_30m' | 'morning_peak' | 'lunch_rush' | 'evening_class';
export type CommuteOrigin = 'east' | 'west' | 'north' | 'central';

export interface CommutePredictionInput {
  departureWindow: DepartureTimeWindow;
  durationHours: number;
  origin: CommuteOrigin;
  rainWeather: boolean;
}

export interface CommutePredictionResult {
  decision: 'TAKE_BUS' | 'DRIVE';
  confidenceScore: number; // 0 - 100%
  headline: string;
  summary: string;
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

export function predictCommuteDecision(
  carparks: Carpark[],
  busArrivals: BusArrivalInfo | null,
  input: CommutePredictionInput
): CommutePredictionResult {
  const { departureWindow, durationHours, origin, rainWeather } = input;

  const campusCarparks = carparks.filter((c) => c.category === 'campus');
  const pnrCarparks = carparks.filter((c) => c.category === 'park_and_ride');

  // SMU Basement & immediate campus lots
  const smuBasement = campusCarparks.find((c) => c.id === 'SMU-BASEMENT') || campusCarparks[0];
  const brasBasahHdb = campusCarparks.find((c) => c.id === 'HDB-BRAS-BASAH') || campusCarparks[1];

  const currentSmuLots = smuBasement.lots.car.available;
  const currentTotalCampusLots = campusCarparks.reduce((sum, c) => sum + c.lots.car.available, 0);

  // Depletion velocity modeling based on departure window
  let depletionFactor = 1.0;
  let timeOfArrivalStr = 'in 25 mins';

  if (departureWindow === 'now') {
    depletionFactor = 1.2;
    timeOfArrivalStr = 'in 20–25 mins';
  } else if (departureWindow === 'in_30m') {
    depletionFactor = 1.6;
    timeOfArrivalStr = 'in 50–55 mins';
  } else if (departureWindow === 'morning_peak') {
    depletionFactor = 2.4; // High campus rush
    timeOfArrivalStr = 'at 9:00 AM (Morning Peak)';
  } else if (departureWindow === 'lunch_rush') {
    depletionFactor = 2.0; // Waterloo / Bras Basah lunch crowd
    timeOfArrivalStr = 'at 12:30 PM (Lunch Rush)';
  } else if (departureWindow === 'evening_class') {
    depletionFactor = 1.5; // Evening part-time student rush
    timeOfArrivalStr = 'at 6:30 PM (Evening Class)';
  }

  if (rainWeather) {
    depletionFactor += 0.5; // Rain increases driving demand
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

  const directTravelTime = (recommendedCampus.walkTimeToSmuMins || 2) + 12; // drive + park
  const pnrTravelTime = (matchingPnr.connectedBus?.rideMinutesToSmu || 12) + nextBusArrivalMins + 4;
  const timeDiffMinutes = Math.max(0, pnrTravelTime - directTravelTime);

  // Weighted Scoring Formula to determine Prediction
  // Positive score favors TAKE_BUS, negative favors DRIVE
  let decisionScore = 0;

  // 1. Availability constraint (highest weight)
  if (campusRiskLevel === 'CRITICAL') decisionScore += 45;
  else if (campusRiskLevel === 'HIGH') decisionScore += 30;
  else if (campusRiskLevel === 'MEDIUM') decisionScore += 10;
  else decisionScore -= 20;

  // 2. Financial savings constraint
  if (moneySaved >= 10.0) decisionScore += 30;
  else if (moneySaved >= 6.0) decisionScore += 20;
  else if (moneySaved >= 3.0) decisionScore += 10;
  else decisionScore -= 10;

  // 3. Duration constraint (longer stays make parking prohibitively expensive)
  if (durationHours >= 4) decisionScore += 20;
  else if (durationHours === 1) decisionScore -= 25;

  // 4. Rain weather (bus transit during heavy rain has slight friction)
  if (rainWeather && campusRiskLevel !== 'CRITICAL') {
    decisionScore -= 10;
  }

  const decision: 'TAKE_BUS' | 'DRIVE' = decisionScore >= 15 ? 'TAKE_BUS' : 'DRIVE';

  // Calculate confidence score (normalized 70% to 98%)
  const rawConfidence = Math.min(98, Math.max(72, Math.round(50 + Math.abs(decisionScore) * 0.75)));

  // Generate actionable narrative & factors
  const factors: CommutePredictionResult['factors'] = [];

  factors.push({
    title: 'Predicted Lot Availability at SMU',
    impact: predictedLotsAtSmu <= 5 ? 'take_bus' : 'drive',
    detail: `Current: ${currentSmuLots} lots. Predicted upon arrival (${timeOfArrivalStr}): ~${predictedLotsAtSmu} lots remaining at SMU Basement (${campusRiskLevel} Risk).`,
  });

  factors.push({
    title: 'Financial Cost Comparison',
    impact: moneySaved > 4 ? 'take_bus' : 'neutral',
    detail: `Direct drive: S$${estimatedDirectDriveCost.toFixed(2)} (inc. S$${directErpToll.toFixed(2)} ERP) vs Park & Ride: S$${estimatedParkAndRideCost.toFixed(2)} (S$${moneySaved.toFixed(2)} cheaper).`,
  });

  factors.push({
    title: `Next Bus Connection (Service ${busServiceNo})`,
    impact: nextBusArrivalMins <= 5 ? 'take_bus' : 'neutral',
    detail: `Next Bus ${busServiceNo} arriving in ~${nextBusArrivalMins}m with ${liveBus?.NextBus.Load === 'SEA' ? 'seats available' : 'standing room'}. Direct drop-off at Stop 04121 outside Li Ka Shing Library.`,
  });

  factors.push({
    title: 'Duration & Time Efficiency',
    impact: durationHours <= 2 ? 'drive' : 'take_bus',
    detail: `For ${durationHours}h stay: Direct drive is ~${timeDiffMinutes}m quicker, but Park & Ride avoids circling for parking and ERP charges.`,
  });

  let headline = '';
  let summary = '';

  if (decision === 'TAKE_BUS') {
    headline = `PREDICTION: TAKE THE BUS (${rawConfidence}% Confidence)`;
    summary = `Campus lots are predicted to be critically tight (${predictedLotsAtSmu} lots left upon arrival). Avoid ERP tolls and the risk of a full gantry by parking at ${matchingPnr.name} and taking Bus ${busServiceNo} directly to Stop 04121. You'll save S$${moneySaved.toFixed(2)} today.`;
  } else {
    headline = `PREDICTION: DRIVE IN DIRECTLY (${rawConfidence}% Confidence)`;
    summary = `For a shorter stay of ${durationHours}h and healthy lot reserves (~${predictedLotsAtSmu} lots predicted), driving straight to ${recommendedCampus.name} saves you ${timeDiffMinutes} minutes of commute time with minimal cost penalty.`;
  }

  // Concrete Step-by-Step Itinerary
  const itinerary = decision === 'TAKE_BUS'
    ? [
        {
          stepNumber: 1,
          title: `Drive to ${matchingPnr.name}`,
          description: `Ample parking (${matchingPnr.lots.car.available} lots free). Zero ERP tolls. Rate: $${matchingPnr.rates.weekdayDayRatePerHour}/hr.`,
          estimatedTime: 'Step 1',
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
          estimatedTime: `~${matchingPnr.connectedBus?.rideMinutesToSmu} min ride`,
        },
      ]
    : [
        {
          stepNumber: 1,
          title: `Drive directly to ${recommendedCampus.name}`,
          description: `${recommendedCampus.address}. Enter via Bras Basah / Stamford Road cordon (ERP ~$${directErpToll.toFixed(2)}).`,
          estimatedTime: 'Direct Route',
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
