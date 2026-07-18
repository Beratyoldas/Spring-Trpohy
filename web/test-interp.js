// interp.js duman testi: interpolasyon, açı geçişi, dead reckoning ve
// "yeni veri gelince zıplama yok" garantisi senaryoları.
// Çalıştır: cd web && npm test  (veya node test-interp.js)
const Interp = require('./interp.js');

const ARALIK_MS = 2000;
let hataSayisi = 0;

function dogrula(ad, kosul, detay = '') {
  if (kosul) {
    console.log(`[interp] GEÇTİ: ${ad}`);
  } else {
    hataSayisi++;
    console.error(`[interp] KALDI: ${ad} ${detay}`);
  }
}

function yaklasik(a, b, tolerans) {
  return Math.abs(a - b) <= tolerans;
}

// --- Senaryo 1: iki örnek arasında doğrusal geçiş ---
const ornekA = { lat: 41.06, lon: 29.04, cog: 40, sog: 6 };
const ornekB = { lat: 41.061, lon: 29.042, cog: 60, sog: 8 };
let durum = Interp.yeniOrnek(null, ornekA, 0, ARALIK_MS); // ilk örnek: t=0
durum = Interp.yeniOrnek(durum, ornekB, 0, ARALIK_MS); // hemen ardından hedef B

const yari = Interp.konumHesapla(durum, ARALIK_MS / 2, ARALIK_MS);
dogrula(
  'yarı yolda orta nokta',
  yaklasik(yari.lat, 41.0605, 1e-9) && yaklasik(yari.lon, 29.041, 1e-9),
  `→ ${yari.lat}, ${yari.lon}`,
);
dogrula('yarı yolda COG ortalanır', yaklasik(yari.cog, 50, 1e-9), `→ ${yari.cog}`);
dogrula('yarı yolda SOG ortalanır', yaklasik(yari.sog, 7, 1e-9), `→ ${yari.sog}`);

const varis = Interp.konumHesapla(durum, ARALIK_MS, ARALIK_MS);
dogrula('aralık sonunda hedefe varılır', yaklasik(varis.lat, ornekB.lat, 1e-12) && yaklasik(varis.lon, ornekB.lon, 1e-12));

// --- Senaryo 2: açı geçişi kısa yoldan (350° → 10°, 0° üzerinden) ---
dogrula('açı kısa yoldan döner', yaklasik(Interp.aciKarisim(350, 10, 0.5), 0, 1e-9), `→ ${Interp.aciKarisim(350, 10, 0.5)}`);

// --- Senaryo 3: veri gecikince dead reckoning ---
// Hedeften 3 sn taşma → 8 kn × 0.514444 × 3 sn ≈ 12.35 m COG yönünde
const gec = Interp.konumHesapla(durum, ARALIK_MS + 3000, ARALIK_MS);
const beklenen = Interp.ileriGit(ornekB.lat, ornekB.lon, ornekB.cog, 8 * Interp.INTERP_AYARLAR.KNOT_MS * 3);
dogrula(
  'gecikmede COG/SOG ile ileri tahmin',
  yaklasik(gec.lat, beklenen.lat, 1e-9) && yaklasik(gec.lon, beklenen.lon, 1e-9),
  `→ ${gec.lat}, ${gec.lon}`,
);

// --- Senaryo 4: dead reckoning sınırı — çok uzun kesintide tekne sabitlenir ---
const cokGec1 = Interp.konumHesapla(durum, ARALIK_MS + 60000, ARALIK_MS);
const cokGec2 = Interp.konumHesapla(durum, ARALIK_MS + 120000, ARALIK_MS);
dogrula(
  'uzun kesintide tekne sonsuza süzülmez',
  cokGec1.lat === cokGec2.lat && cokGec1.lon === cokGec2.lon,
);

// --- Senaryo 5: yeni veri gelince sert zıplama YOK ---
// 5 sn kesinti sonrası yeni örnek "gerçek" konumda gelir; geldiği anın hemen
// öncesi ve sonrasında çizilen konum aynı olmalı (süreklilik).
const kesintiAni = ARALIK_MS + 5000;
const hemenOnce = Interp.konumHesapla(durum, kesintiAni - 1, ARALIK_MS);
const ornekC = { lat: 41.0625, lon: 29.045, cog: 220, sog: 5 };
const yeniDurum = Interp.yeniOrnek(durum, ornekC, kesintiAni, ARALIK_MS);
const hemenSonra = Interp.konumHesapla(yeniDurum, kesintiAni, ARALIK_MS);
dogrula(
  'yeni veri anında süreklilik (zıplama yok)',
  yaklasik(hemenOnce.lat, hemenSonra.lat, 1e-7) && yaklasik(hemenOnce.lon, hemenSonra.lon, 1e-7),
  `→ önce ${hemenOnce.lat},${hemenOnce.lon} / sonra ${hemenSonra.lat},${hemenSonra.lon}`,
);
// ...ve bir aralık sonra tekne gerçek konuma oturur
const oturma = Interp.konumHesapla(yeniDurum, kesintiAni + ARALIK_MS, ARALIK_MS);
dogrula('düzeltme bir aralıkta tamamlanır', yaklasik(oturma.lat, ornekC.lat, 1e-12) && yaklasik(oturma.lon, ornekC.lon, 1e-12));

// --- Sonuç ---
if (hataSayisi > 0) {
  console.error(`[interp] BAŞARISIZ: ${hataSayisi} senaryo kaldı`);
  process.exit(1);
}
console.log('[interp] BAŞARILI: tüm senaryolar geçti');
