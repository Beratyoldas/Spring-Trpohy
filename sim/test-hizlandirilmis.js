// Duman testi: ağ/gerçek zaman kullanmadan filoyu sanal zamanda ileri
// sarar, ~40 dk'lık yarışın makul bir sürede tamamlandığını doğrular.
// Çalıştır: node sim/test-hizlandirilmis.js
import { parkurUret } from './parkur.js';
import { filoOlustur, filoAdimla, herkesBitti, AYARLAR as FILO_AYARLARI } from './filo.js';

const DT_SN = 2;
const SANAL_SURE_TAVANI_SN = 60 * 60; // güvenlik tavanı: 60 dk
const BEKLENEN_MIN_SN = 15 * 60;
const BEKLENEN_MAX_SN = 55 * 60;

const parkur = parkurUret();
let filo = filoOlustur(parkur);
let sanalSure = 0;

const basZaman = process.hrtime.bigint();
while (sanalSure < SANAL_SURE_TAVANI_SN && !herkesBitti(filo)) {
  filo = filoAdimla(filo, DT_SN, parkur);
  sanalSure += DT_SN;
}
const bitZaman = process.hrtime.bigint();
const gercekMs = Number(bitZaman - basZaman) / 1e6;

console.log(`[test] rüzgar: ${parkur.ruzgar.yon}° / ${parkur.ruzgar.hiz} kn`);
console.log(
  `[test] filo (${FILO_AYARLARI.TEKNE_SAYISI} tekne, ${FILO_AYARLARI.TUR_SAYISI} tur) ` +
    `sanal süre: ${(sanalSure / 60).toFixed(1)} dk, gerçek süre: ${gercekMs.toFixed(0)} ms`,
);

const tamamlandi = herkesBitti(filo);
if (!tamamlandi) {
  console.error('[test] BAŞARISIZ: filo tavan süre içinde turu tamamlayamadı');
  process.exit(1);
}
if (sanalSure < BEKLENEN_MIN_SN || sanalSure > BEKLENEN_MAX_SN) {
  console.error(
    `[test] BAŞARISIZ: tamamlanma süresi beklenen aralığın (${BEKLENEN_MIN_SN / 60}-${BEKLENEN_MAX_SN / 60} dk) dışında`,
  );
  process.exit(1);
}
console.log('[test] BAŞARILI: filo turu tamamladı');
