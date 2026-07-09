// Yarış parkuru üretimi: alt/üst şamandıra + rüzgar. "2 şamandıra yarışı"
// (Spring Trophy formatı) — alt şamandıra start/bitiş bölgesi, üst şamandıra
// rüzgar üstü dönüş noktası.
import { ileriGit, normalizeAci } from './geo.js';

export const AYARLAR = {
  // Bebek–Kandilli hattı civarı, Boğaz içinde YER TUTUCU koordinat —
  // gerçek kulüp rotası netleşince güncellenecek.
  ALT_SAMANDIRA: { lat: 41.062, lon: 29.047 },
  RUZGAR_YONU_TEMEL: 30, // derece, rüzgarın estiği yön (KKD)
  RUZGAR_HIZI_TEMEL: 14, // knot
  RUZGAR_YON_SAPMA_MAX: 8, // parkur üretilirken rastgele sapma (± derece)
  RUZGAR_HIZ_SAPMA_MAX: 2, // knot
  PIST_UZUNLUK_M: 1300, // alt-üst şamandıra arası mesafe
};

export function parkurUret() {
  const yon = normalizeAci(
    AYARLAR.RUZGAR_YONU_TEMEL + (Math.random() * 2 - 1) * AYARLAR.RUZGAR_YON_SAPMA_MAX,
  );
  const hiz = Math.max(
    4,
    AYARLAR.RUZGAR_HIZI_TEMEL + (Math.random() * 2 - 1) * AYARLAR.RUZGAR_HIZ_SAPMA_MAX,
  );
  const alt = AYARLAR.ALT_SAMANDIRA;
  const ust = ileriGit(alt.lat, alt.lon, yon, AYARLAR.PIST_UZUNLUK_M);

  return {
    samandiralar: [
      { id: 'ALT', ad: 'Alt Şamandıra (Start/Bitiş)', lat: alt.lat, lon: alt.lon, tip: 'alt' },
      { id: 'UST', ad: 'Üst Şamandıra', lat: ust.lat, lon: ust.lon, tip: 'ust' },
    ],
    ruzgar: { yon: Math.round(yon), hiz: Number(hiz.toFixed(1)) },
  };
}
