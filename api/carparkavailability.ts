import type { Request, Response } from 'express';

export interface LtaRawCarparkRecord {
  CarParkID: string;
  Area: string;
  Development: string;
  Location: string; // "lat lng", e.g. "1.29375 103.85718"
  AvailableLots: number;
  LotType: 'C' | 'H' | 'Y'; // C: Cars, H: Heavy vehicles, Y: Motorcycles
  Agency: 'LTA' | 'HDB' | 'URA';
}

export interface LtaDataMallResponse {
  'odata.metadata'?: string;
  value: LtaRawCarparkRecord[];
}

// In-memory cache to prevent exceeding LTA rate limits
interface CacheEntry {
  timestamp: number;
  data: LtaDataMallResponse;
}

const cache: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 30 * 1000; // 30 seconds cache

const LTA_CARPARK_ENDPOINT =
  'https://datamall2.mytransport.sg/ltaodataservice/CarParkAvailabilityv2';

export default async function handler(req: Request, res: Response) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, AccountKey, x-account-key');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // 1. Retrieve AccountKey from environment or request headers (no hardcoded keys)
  const headerKey =
    (req.headers['accountkey'] as string) ||
    (req.headers['x-account-key'] as string) ||
    (req.headers['account-key'] as string);

  const accountKey =
    headerKey ||
    process.env.LTA_DATAMALL_ACCOUNT_KEY ||
    process.env.LTA_ACCOUNT_KEY ||
    process.env.ACCOUNT_KEY;

  if (!accountKey) {
    return res.status(401).json({
      error: 'Missing LTA DataMall AccountKey',
      message:
        "Please provide your LTA AccountKey by configuring the 'LTA_DATAMALL_ACCOUNT_KEY' environment variable or by passing the 'AccountKey' header with your request.",
      endpoint: LTA_CARPARK_ENDPOINT,
      documentation:
        'https://datamall.lta.gov.sg/content/datamall/en/request-for-api.html',
    });
  }

  // 2. Pagination query parameters
  const skip = req.query['$skip'] ? String(req.query['$skip']) : '0';
  const fetchAll = req.query['all'] === 'true';
  const cacheKey = fetchAll ? 'all_records' : `skip_${skip}`;

  // Check cache
  const cached = cache[cacheKey];
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return res.status(200).json({
      ...cached.data,
      cached: true,
      cachedAt: new Date(cached.timestamp).toISOString(),
    });
  }

  try {
    if (fetchAll) {
      // LTA returns max 500 records per call. Iterate to fetch all active carparks across Singapore.
      let allRecords: LtaRawCarparkRecord[] = [];
      let currentSkip = 0;
      let hasMore = true;

      while (hasMore && currentSkip < 5000) {
        const targetUrl = `${LTA_CARPARK_ENDPOINT}?$skip=${currentSkip}`;
        const ltaRes = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            AccountKey: accountKey,
            accept: 'application/json',
          },
        });

        if (!ltaRes.ok) {
          const errorBody = await ltaRes.text();
          throw new Error(
            `LTA DataMall API responded with HTTP ${ltaRes.status}: ${errorBody || ltaRes.statusText}`
          );
        }

        const data: LtaDataMallResponse = await ltaRes.json();
        const records = data.value || [];
        allRecords = allRecords.concat(records);

        if (records.length < 500) {
          hasMore = false;
        } else {
          currentSkip += 500;
        }
      }

      const responsePayload: LtaDataMallResponse & {
        totalRecords: number;
        fetchedAt: string;
      } = {
        value: allRecords,
        totalRecords: allRecords.length,
        fetchedAt: new Date().toISOString(),
      };

      cache[cacheKey] = {
        timestamp: now,
        data: responsePayload,
      };

      return res.status(200).json(responsePayload);
    }

    // Single page fetch with $skip
    const targetUrl = skip && skip !== '0'
      ? `${LTA_CARPARK_ENDPOINT}?$skip=${encodeURIComponent(skip)}`
      : LTA_CARPARK_ENDPOINT;

    const ltaResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        AccountKey: accountKey,
        accept: 'application/json',
      },
    });

    if (!ltaResponse.ok) {
      const errorText = await ltaResponse.text();
      return res.status(ltaResponse.status).json({
        error: `LTA DataMall API error (HTTP ${ltaResponse.status})`,
        details: errorText || ltaResponse.statusText,
        endpoint: targetUrl,
      });
    }

    const payload: LtaDataMallResponse = await ltaResponse.json();

    cache[cacheKey] = {
      timestamp: now,
      data: payload,
    };

    return res.status(200).json({
      ...payload,
      cached: false,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error fetching LTA carpark data:', err);
    return res.status(502).json({
      error: 'Bad Gateway: Failed to fetch from LTA DataMall',
      message: err.message || 'Unknown network error',
      endpoint: LTA_CARPARK_ENDPOINT,
    });
  }
}
