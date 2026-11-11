import type { Request, Response } from 'express';

export interface NextBusInfo {
  OriginCode: string;
  DestinationCode: string;
  EstimatedArrival: string; // ISO date string
  Latitude: string;
  Longitude: string;
  VisitNumber: string;
  Load: 'SEA' | 'SDA' | 'LSD'; // Seats Available, Standing Available, Limited Standing
  Feature: 'WAB' | ''; // Wheelchair Accessible Bus
  Type: 'SD' | 'DD' | 'BD'; // Single Deck, Double Deck, Bendy
}

export interface BusServiceArrival {
  ServiceNo: string;
  Operator: 'SBST' | 'SMRT' | 'TTS' | 'GAS';
  NextBus: NextBusInfo;
  NextBus2?: NextBusInfo;
  NextBus3?: NextBusInfo;
  // Computed helpers for front-end
  minutesToArrival?: number;
  minutesToArrival2?: number;
  originParkAndRide?: string;
  suggestedCarparkId?: string;
}

export interface BusArrivalResponse {
  BusStopCode: string;
  BusStopDescription: string;
  RoadName: string;
  Services: BusServiceArrival[];
  timestamp: string;
  isSimulated?: boolean;
}

// Default Bus Stop 04121: SMU (Stamford Road, Singapore 178908)
const DEFAULT_BUS_STOP_CODE = '04121';
const LTA_BUS_ARRIVAL_ENDPOINT =
  'https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival';

// Fallback/Simulated live bus arrival board for SMU (Stop 04121)
function generateSimulatedBusArrivals(busStopCode: string): BusArrivalResponse {
  const now = new Date();

  // Bus services serving SMU Stop 04121 with their connected Park & Ride zones
  const busServiceConfigs = [
    { no: '7', op: 'SBST' as const, mins: 3, mins2: 12, origin: 'Geylang / Guillemard MSCP', cpId: 'HDB-GEYLANG' },
    { no: '14', op: 'SBST' as const, mins: 5, mins2: 16, origin: 'Mountbatten / Old Airport MSCP', cpId: 'HDB-OLD-AIRPORT' },
    { no: '16', op: 'SBST' as const, mins: 4, mins2: 14, origin: 'Kallang Riverside Carpark', cpId: 'URA-KALLANG' },
    { no: '36', op: 'GAS' as const, mins: 7, mins2: 19, origin: 'Marine Parade Central MSCP', cpId: 'HDB-MARINE-PARADE' },
    { no: '77', op: 'TTS' as const, mins: 9, mins2: 21, origin: 'Bukit Timah / Beauty World', cpId: 'HDB-TOH-YI' },
    { no: '106', op: 'TTS' as const, mins: 2, mins2: 11, origin: 'Commonwealth / Queenstown MSCP', cpId: 'HDB-COMMONWEALTH' },
    { no: '111', op: 'SBST' as const, mins: 8, mins2: 18, origin: 'Ghim Moh / Holland MSCP', cpId: 'HDB-GHIM-MOH' },
    { no: '131', op: 'SBST' as const, mins: 6, mins2: 15, origin: 'Balestier / Whampoa MSCP', cpId: 'HDB-WHAMPOA' },
    { no: '167', op: 'SMRT' as const, mins: 10, mins2: 22, origin: 'Novena / Thomson MSCP', cpId: 'HDB-THOMSON' },
    { no: '175', op: 'SBST' as const, mins: 4, mins2: 13, origin: 'Bukit Merah Central MSCP', cpId: 'HDB-BM-CENTRAL' },
    { no: '857', op: 'TTS' as const, mins: 6, mins2: 17, origin: 'Yishun / Khatib Ring MSCP', cpId: 'HDB-KHATIB' },
  ];

  const loads: Array<'SEA' | 'SDA' | 'LSD'> = ['SEA', 'SEA', 'SDA', 'SEA', 'SDA'];
  const types: Array<'SD' | 'DD'> = ['SD', 'DD', 'DD', 'SD'];

  const services: BusServiceArrival[] = busServiceConfigs.map((cfg, index) => {
    // Add minor minute variance
    const arrivalDate1 = new Date(now.getTime() + cfg.mins * 60 * 1000);
    const arrivalDate2 = new Date(now.getTime() + cfg.mins2 * 60 * 1000);

    return {
      ServiceNo: cfg.no,
      Operator: cfg.op,
      minutesToArrival: cfg.mins,
      minutesToArrival2: cfg.mins2,
      originParkAndRide: cfg.origin,
      suggestedCarparkId: cfg.cpId,
      NextBus: {
        OriginCode: '84009',
        DestinationCode: '02049',
        EstimatedArrival: arrivalDate1.toISOString(),
        Latitude: '1.2985',
        Longitude: '103.8512',
        VisitNumber: '1',
        Load: loads[index % loads.length],
        Feature: 'WAB',
        Type: types[index % types.length],
      },
      NextBus2: {
        OriginCode: '84009',
        DestinationCode: '02049',
        EstimatedArrival: arrivalDate2.toISOString(),
        Latitude: '1.3021',
        Longitude: '103.8550',
        VisitNumber: '1',
        Load: loads[(index + 1) % loads.length],
        Feature: 'WAB',
        Type: types[(index + 1) % types.length],
      },
    };
  });

  return {
    BusStopCode: busStopCode || DEFAULT_BUS_STOP_CODE,
    BusStopDescription: 'SMU (Singapore Management University)',
    RoadName: 'Stamford Road',
    Services: services,
    timestamp: now.toISOString(),
    isSimulated: true,
  };
}

export default async function handler(req: Request, res: Response) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, AccountKey, x-account-key');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const busStopCode = (req.query.busStopCode as string) || DEFAULT_BUS_STOP_CODE;

  const headerKey =
    (req.headers['accountkey'] as string) ||
    (req.headers['x-account-key'] as string) ||
    (req.headers['account-key'] as string);

  const accountKey =
    headerKey ||
    process.env.LTA_DATAMALL_ACCOUNT_KEY ||
    process.env.LTA_ACCOUNT_KEY ||
    process.env.ACCOUNT_KEY;

  // If no API key configured yet, return realistic live bus board for Stop 04121 (SMU)
  if (!accountKey) {
    const simulated = generateSimulatedBusArrivals(busStopCode);
    return res.status(200).json(simulated);
  }

  // Call LTA DataMall BusArrival API
  try {
    const targetUrl = `${LTA_BUS_ARRIVAL_ENDPOINT}?BusStopCode=${encodeURIComponent(busStopCode)}`;
    const ltaResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        AccountKey: accountKey,
        accept: 'application/json',
      },
    });

    if (!ltaResponse.ok) {
      console.warn(`LTA BusArrival returned ${ltaResponse.status}, falling back to simulated board.`);
      const simulated = generateSimulatedBusArrivals(busStopCode);
      return res.status(200).json(simulated);
    }

    const data = await ltaResponse.json();

    // Enrich with computed arrival minutes
    const now = Date.now();
    const enrichedServices = (data.Services || []).map((srv: any) => {
      let minutesToArrival: number | undefined;
      let minutesToArrival2: number | undefined;

      if (srv.NextBus?.EstimatedArrival) {
        const diffMs = new Date(srv.NextBus.EstimatedArrival).getTime() - now;
        minutesToArrival = Math.max(0, Math.round(diffMs / (60 * 1000)));
      }
      if (srv.NextBus2?.EstimatedArrival) {
        const diffMs = new Date(srv.NextBus2.EstimatedArrival).getTime() - now;
        minutesToArrival2 = Math.max(0, Math.round(diffMs / (60 * 1000)));
      }

      return {
        ...srv,
        minutesToArrival,
        minutesToArrival2,
      };
    });

    return res.status(200).json({
      BusStopCode: busStopCode,
      BusStopDescription: 'SMU (Singapore Management University)',
      RoadName: 'Stamford Road',
      Services: enrichedServices,
      timestamp: new Date().toISOString(),
      isSimulated: false,
    });
  } catch (err: any) {
    console.error('Error fetching LTA Bus Arrival:', err);
    // Graceful fallback to simulated SMU arrivals so user experience is uninterrupted
    const simulated = generateSimulatedBusArrivals(busStopCode);
    return res.status(200).json(simulated);
  }
}
