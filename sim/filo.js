// 40 teknelik filo: başlatma + her tur adımı. Bacak sırası: her tur için
// [orsa → üst şamandıra, apaz → alt şamandıra]; son bacak bitince tekne
// yarışı tamamlar.
import { tekneAdimla } from './fizik.js';
import { ileriGit, normalizeAci } from './geo.js';

export const AYARLAR = {
  TEKNE_SAYISI: 40,
  TUR_SAYISI: 2,
  SAMANDIRA_YARICAP_M: 12, // şamandırayı "geçti" saymak için mesafe eşiği
  BASLANGIC_HAT_GENISLIK_M: 80, // start hattı boyunca rastgele dağılım
};

function bacaklariOlustur(parkur) {
  const ust = parkur.samandiralar.find((s) => s.tip === 'ust');
  const alt = parkur.samandiralar.find((s) => s.tip === 'alt');
  const bacaklar = [];
  for (let t = 0; t < AYARLAR.TUR_SAYISI; t++) {
    bacaklar.push({ tip: 'orsa', hedef: ust });
    bacaklar.push({ tip: 'apaz', hedef: alt });
  }
  return bacaklar;
}

export function filoOlustur(parkur) {
  const alt = parkur.samandiralar.find((s) => s.tip === 'alt');
  const hatYonu = normalizeAci(parkur.ruzgar.yon + 90); // rüzgara dik start hattı
  const ts = Math.floor(Date.now() / 1000);

  const tekneler = Array.from({ length: AYARLAR.TEKNE_SAYISI }, (_, i) => {
    const ofsetM = (Math.random() - 0.5) * AYARLAR.BASLANGIC_HAT_GENISLIK_M;
    const baslangic = ileriGit(alt.lat, alt.lon, hatYonu, ofsetM);
    return {
      tekneId: `TR-${String(i + 1).padStart(3, '0')}`,
      lat: baslangic.lat,
      lon: baslangic.lon,
      cog: parkur.ruzgar.yon,
      sog: 0,
      ts,
      kontra: Math.random() < 0.5 ? 1 : -1,
      bacakIndex: 0,
      bitti: false,
      hizFaktoru: 0.92 + Math.random() * 0.16, // teknelerin performans farkı
    };
  });

  return { tekneler, bacaklar: bacaklariOlustur(parkur) };
}

export function filoAdimla(filo, dt, parkur) {
  const ts = Math.floor(Date.now() / 1000);

  const tekneler = filo.tekneler.map((tekne) => {
    if (tekne.bitti) return { ...tekne, ts };

    const bacak = filo.bacaklar[tekne.bacakIndex];
    const { mesafeKaldi, ...yeniTekne } = tekneAdimla(tekne, dt, parkur.ruzgar, bacak.hedef, bacak.tip);
    yeniTekne.ts = ts;

    if (mesafeKaldi < AYARLAR.SAMANDIRA_YARICAP_M) {
      const yeniBacakIndex = tekne.bacakIndex + 1;
      if (yeniBacakIndex >= filo.bacaklar.length) {
        yeniTekne.bitti = true;
        yeniTekne.sog = 0;
      } else {
        yeniTekne.bacakIndex = yeniBacakIndex;
      }
    }

    return yeniTekne;
  });

  return { ...filo, tekneler };
}

export function herkesBitti(filo) {
  return filo.tekneler.every((t) => t.bitti);
}
