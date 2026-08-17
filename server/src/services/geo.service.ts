/** Great-circle distance in kilometres between two WGS-84 points. */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
}

export type GeoStatus = 'MATCH' | 'NEARBY' | 'MISMATCH';

/**
 * Classifies how far a piece of field evidence is from the project's declared
 * site. Thresholds are generous — rural projects legitimately span districts —
 * so only genuinely implausible distances are flagged.
 */
export function classifyDistance(km: number): GeoStatus {
  if (km <= 25) return 'MATCH';
  if (km <= 100) return 'NEARBY';
  return 'MISMATCH';
}

export function describeGeoStatus(status: GeoStatus, km: number): string {
  switch (status) {
    case 'MATCH':
      return `Photo location matches the project site (${km} km away).`;
    case 'NEARBY':
      return `Photo was taken ${km} km from the project site — within the same region.`;
    case 'MISMATCH':
      return `Photo was taken ${km} km from the stated project site. This needs an explanation.`;
  }
}
