// Tekne fiziği: TWA'ya bağlı basit polar hız + orsa/apaz bacaklarında
// tramola/cybe kararı. Saf fonksiyonlar (I/O yok) — hem gerçek zamanlı
// çalıştırmada hem hızlandırılmış testte aynı kod kullanılır.
import { kerteriz, mesafeMetre, ileriGit, normalizeAci, normalizeSigned } from './geo.js';

export const AYARLAR = {
  ORSA_KAPANMA_ACISI: 45, // optimal orsa (closehauled) TWA'sı
  APAZ_KAPANMA_ACISI: 30, // pupa kilitli bölgenin dead-run'a göre yarı açısı
  TAMPON_ACISI: 3, // tramola/cybe histerezis tamponu — BİLİNEN TUZAK FIX'İ:
  // layline kontrolü işaret değişimiyle (0°'de) yapılırsa sonsuz tramola
  // döngüsüne girilir. Doğrusu: diğer kontranın ±(kapanma+tampon)=±48°
  // hattına geçince tramola.
  KNOT_MPS: 0.514444,
};

// TWA (mutlak, 0-180°) → tekne hızı (knot). Basit polar eğri, doğrusal
// enterpolasyonla. Rüzgar hızı etkisi M1'de modellenmiyor (basitleştirme).
const POLAR_TABLO = [
  { twa: 0, kn: 1.5 },
  { twa: 30, kn: 3.5 },
  { twa: 45, kn: 6.2 },
  { twa: 60, kn: 7.0 },
  { twa: 80, kn: 7.6 },
  { twa: 100, kn: 7.8 },
  { twa: 120, kn: 7.4 },
  { twa: 150, kn: 6.4 },
  { twa: 165, kn: 5.6 },
  { twa: 180, kn: 5.0 },
];

export function polarHiz(twaAbsDerece) {
  const twa = Math.min(180, Math.max(0, twaAbsDerece));
  for (let i = 0; i < POLAR_TABLO.length - 1; i++) {
    const a = POLAR_TABLO[i];
    const b = POLAR_TABLO[i + 1];
    if (twa >= a.twa && twa <= b.twa) {
      const oran = (twa - a.twa) / (b.twa - a.twa);
      return a.kn + (b.kn - a.kn) * oran;
    }
  }
  return POLAR_TABLO[POLAR_TABLO.length - 1].kn;
}

// Bir bacakta (orsa veya apaz) hedef şamandıraya göre kontra + sailing
// yönü kararı. "tip" 'orsa' ise merkez rüzgarın geldiği yön (0° TWA),
// 'apaz' ise tam pupa (180° TWA) — kilitli bölge bu merkezin etrafında.
export function bacakSeyriHesapla({ pos, hedef, ruzgarYonu, tip, mevcutKontra }) {
  const merkezAci = tip === 'orsa' ? ruzgarYonu : normalizeAci(ruzgarYonu + 180);
  const bolgeYariAcisi = tip === 'orsa' ? AYARLAR.ORSA_KAPANMA_ACISI : AYARLAR.APAZ_KAPANMA_ACISI;
  const kerterizHedef = kerteriz(pos.lat, pos.lon, hedef.lat, hedef.lon);
  const fark = normalizeSigned(kerterizHedef - merkezAci);

  if (Math.abs(fark) >= bolgeYariAcisi) {
    // Kilitli bölge dışı: hedefe doğrudan gidilebilir.
    return { kontra: mevcutKontra, hedefYonu: kerterizHedef };
  }

  const esik = bolgeYariAcisi + AYARLAR.TAMPON_ACISI;
  let kontra = mevcutKontra;
  if (mevcutKontra >= 0 && fark <= -esik) kontra = -1;
  else if (mevcutKontra < 0 && fark >= esik) kontra = 1;

  const hedefYonu = normalizeAci(merkezAci + kontra * bolgeYariAcisi);
  return { kontra, hedefYonu };
}

// Bir teknenin dt saniyelik adımını hesaplar; yeni pozisyon/COG/SOG/kontra
// ve hedefe kalan mesafeyi döner.
export function tekneAdimla(tekne, dt, ruzgar, hedef, tip) {
  const { kontra, hedefYonu } = bacakSeyriHesapla({
    pos: tekne,
    hedef,
    ruzgarYonu: ruzgar.yon,
    tip,
    mevcutKontra: tekne.kontra,
  });

  const twaAbs = Math.abs(normalizeSigned(hedefYonu - ruzgar.yon));
  const hizKnot = polarHiz(twaAbs) * (tekne.hizFaktoru ?? 1);
  const mesafeM = hizKnot * AYARLAR.KNOT_MPS * dt;
  const yeniPos = ileriGit(tekne.lat, tekne.lon, hedefYonu, mesafeM);
  const mesafeKaldi = mesafeMetre(yeniPos.lat, yeniPos.lon, hedef.lat, hedef.lon);

  return {
    ...tekne,
    lat: yeniPos.lat,
    lon: yeniPos.lon,
    cog: hedefYonu,
    sog: Number(hizKnot.toFixed(2)),
    kontra,
    mesafeKaldi,
  };
}
