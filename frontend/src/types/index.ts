export interface Endpoint {
  id: string;
  url: string;
  slug: string;
  createdAt: number;
}

export interface GeoLocation {
  country: string;
  region: string;
  city: string;
  timezone: string;
  coordinates: [number, number];
}

export interface RequestLog {
  id: string;
  method: string;
  headers: Record<string, string | string[]>;
  body: string | null;
  queryParams: Record<string, string> | null;
  sourceIp: string;
  geoLocation: GeoLocation | null;
  userAgent: string | null;
  timestamp: number;
}
