// Küçük mesafeler için eşdikdörtgen (equirectangular) coğrafi yaklaşım.
// Boğaz ölçeğinde (birkaç km) hata ihmal edilebilir düzeyde kalır.

const METRE_PER_DERECE_LAT = 111320;

function metrePerDereceLon(latDerece) {
  return METRE_PER_DERECE_LAT * Math.cos((latDerece * Math.PI) / 180);
}

export function normalizeAci(derece) {
  return ((derece % 360) + 360) % 360;
}

// (-180, 180] aralığında işaretli açı farkı — tramola/cybe histerezisi için gerekli.
export function normalizeSigned(derece) {
  const a = normalizeAci(derece);
  return a > 180 ? a - 360 : a;
}

// 1. noktadan 2. noktaya kerteriz (0°=kuzey, 90°=doğu).
export function kerteriz(lat1, lon1, lat2, lon2) {
  const latOrt = (lat1 + lat2) / 2;
  const dx = (lon2 - lon1) * metrePerDereceLon(latOrt);
  const dy = (lat2 - lat1) * METRE_PER_DERECE_LAT;
  return normalizeAci((Math.atan2(dx, dy) * 180) / Math.PI);
}

export function mesafeMetre(lat1, lon1, lat2, lon2) {
  const latOrt = (lat1 + lat2) / 2;
  const dx = (lon2 - lon1) * metrePerDereceLon(latOrt);
  const dy = (lat2 - lat1) * METRE_PER_DERECE_LAT;
  return Math.sqrt(dx * dx + dy * dy);
}

// Verilen noktadan bir yön (derece) ve mesafe (metre) ile yeni koordinat.
export function ileriGit(lat, lon, yonDerece, mesafeM) {
  const yonRad = (yonDerece * Math.PI) / 180;
  const dy = mesafeM * Math.cos(yonRad);
  const dx = mesafeM * Math.sin(yonRad);
  return {
    lat: lat + dy / METRE_PER_DERECE_LAT,
    lon: lon + dx / metrePerDereceLon(lat),
  };
}
