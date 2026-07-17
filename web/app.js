// Web canlı izleme (2D): MapLibre haritası + backend WS istemcisi.
// Parkur mesajından şamandıralar, start hattı ve rüzgar göstergesi çizilir.
// Bağlantı koparsa 2 sn'de bir yeniden denenir; durum rozette gösterilir.
// Altlık: OpenFreeMap "dark" stili — API anahtarı gerektirmez.

const AYARLAR = {
  STIL_URL: 'https://tiles.openfreemap.org/styles/dark',
  MERKEZ: [29.05, 41.067], // Bebek–Kandilli hattı (sim parkuruyla aynı bölge)
  ZOOM: 13.5,
  MIN_ZOOM: 9,
  MAX_ZOOM: 18,
  // Adım 7'de web/ backend'den sunulunca aynı adrese döner; şimdilik sabit.
  WS_ADRES: 'ws://localhost:3000/canli',
  YENIDEN_BAGLAN_MS: 2000,
  START_HATTI_YARIM_M: 125, // start hattının ALT şamandıradan her iki yana uzunluğu
};

// Harita katmanları CSS değişkeni okuyamaz → katman renkleri burada, tek yerde.
const RENKLER = {
  samandira: '#fbbf24',
  samandiraKenar: '#0a0f14',
  startHatti: '#e8eef5',
  etiket: '#e8eef5',
  etiketHale: '#0a0f14',
};

const YAZI_TIPI = ['Noto Sans Regular']; // OpenFreeMap glyph setindeki tek aile

const BOS_GEOJSON = { type: 'FeatureCollection', features: [] };

// --- Geometri: kısa mesafe eşdikdörtgen yaklaşımı (CLAUDE.md) ---
function ileriGit(lat, lon, yonDerece, mesafeM) {
  const rad = (yonDerece * Math.PI) / 180;
  const dKuzey = Math.cos(rad) * mesafeM;
  const dDogu = Math.sin(rad) * mesafeM;
  return {
    lat: lat + dKuzey / 111320,
    lon: lon + dDogu / (111320 * Math.cos((lat * Math.PI) / 180)),
  };
}

// --- Harita kurulumu ---
const harita = new maplibregl.Map({
  container: 'harita',
  style: AYARLAR.STIL_URL,
  center: AYARLAR.MERKEZ,
  zoom: AYARLAR.ZOOM,
  minZoom: AYARLAR.MIN_ZOOM,
  maxZoom: AYARLAR.MAX_ZOOM,
  attributionControl: { compact: true },
});

harita.addControl(new maplibregl.NavigationControl(), 'top-right');

// CLAUDE.md tuzağı: map.loaded() hareket sırasında false döner ve 'load'
// ömürde BİR kez ateşlenir → hazırlık durumu kendi bayrağımızla tutulur;
// harita hazır olmadan gelen parkur bekletilir, hazır olunca uygulanır.
let haritaHazir = false;
let bekleyenParkur = null;

harita.on('load', () => {
  parkurKatmanlariniKur();
  haritaHazir = true;
  if (bekleyenParkur) {
    parkurCiz(bekleyenParkur);
    bekleyenParkur = null;
  }
});

// Boş kaynaklarla katmanları bir kez kurar; sonrası hep setData ile güncelleme.
function parkurKatmanlariniKur() {
  harita.addSource('start-hatti', { type: 'geojson', data: BOS_GEOJSON });
  harita.addLayer({
    id: 'start-hatti',
    type: 'line',
    source: 'start-hatti',
    paint: {
      'line-color': RENKLER.startHatti,
      'line-width': 2,
      'line-dasharray': [2, 2],
      'line-opacity': 0.8,
    },
  });

  harita.addSource('samandiralar', { type: 'geojson', data: BOS_GEOJSON });
  harita.addLayer({
    id: 'samandiralar',
    type: 'circle',
    source: 'samandiralar',
    paint: {
      'circle-radius': 7,
      'circle-color': RENKLER.samandira,
      'circle-stroke-width': 2,
      'circle-stroke-color': RENKLER.samandiraKenar,
    },
  });
  harita.addLayer({
    id: 'samandira-etiketleri',
    type: 'symbol',
    source: 'samandiralar',
    layout: {
      'text-field': ['get', 'id'],
      'text-font': YAZI_TIPI,
      'text-size': 11,
      'text-offset': [0, 1.3],
      'text-anchor': 'top',
    },
    paint: {
      'text-color': RENKLER.etiket,
      'text-halo-color': RENKLER.etiketHale,
      'text-halo-width': 1.5,
    },
  });
}

// --- Parkur çizimi ---
function parkurIsle(mesaj) {
  ruzgarGuncelle(mesaj.ruzgar);
  if (!haritaHazir) {
    bekleyenParkur = mesaj;
    return;
  }
  parkurCiz(mesaj);
}

function parkurCiz(mesaj) {
  const samandiralar = {
    type: 'FeatureCollection',
    features: mesaj.samandiralar.map((s) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      properties: { id: s.id, tip: s.tip },
    })),
  };
  harita.getSource('samandiralar').setData(samandiralar);

  // Start hattı: ALT (start/bitiş) şamandırasında rüzgara dik kesik çizgi
  const alt = mesaj.samandiralar.find((s) => s.tip === 'alt');
  const hat = { type: 'FeatureCollection', features: [] };
  if (alt && mesaj.ruzgar) {
    const birUc = ileriGit(alt.lat, alt.lon, mesaj.ruzgar.yon - 90, AYARLAR.START_HATTI_YARIM_M);
    const digerUc = ileriGit(alt.lat, alt.lon, mesaj.ruzgar.yon + 90, AYARLAR.START_HATTI_YARIM_M);
    hat.features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [birUc.lon, birUc.lat],
          [digerUc.lon, digerUc.lat],
        ],
      },
      properties: {},
    });
  }
  harita.getSource('start-hatti').setData(hat);
}

// Rüzgar HUD'u: ok akış yönünü gösterir (meteorolojik yön = estiği yön → +180°)
function ruzgarGuncelle(ruzgar) {
  if (!ruzgar) return;
  const panel = document.getElementById('ruzgar');
  panel.hidden = false;
  document.getElementById('ruzgar-ok').style.transform = `rotate(${ruzgar.yon + 180}deg)`;
  document.getElementById('ruzgar-deger').textContent = `${ruzgar.yon}° · ${ruzgar.hiz} kn`;
}

// --- WS istemcisi: kopunca 2 sn'de bir yeniden dener ---
function rozetAyarla(durum) {
  const rozet = document.getElementById('rozet');
  rozet.className = durum;
  rozet.textContent = durum === 'canli' ? 'CANLI' : 'BAĞLANIYOR';
}

function baglan() {
  rozetAyarla('bekliyor');
  const ws = new WebSocket(AYARLAR.WS_ADRES);

  ws.addEventListener('open', () => rozetAyarla('canli'));

  ws.addEventListener('message', (olay) => {
    let mesaj;
    try {
      mesaj = JSON.parse(olay.data);
    } catch {
      return;
    }
    if (mesaj.type === 'parkur') parkurIsle(mesaj);
    // 'pozisyonlar' → adım 4'te tekne markerları
  });

  // Başarısız bağlantı denemesi de 'close' üretir → tek yeniden-deneme noktası
  ws.addEventListener('close', () => {
    rozetAyarla('bekliyor');
    setTimeout(baglan, AYARLAR.YENIDEN_BAGLAN_MS);
  });
}

baglan();

// Hata ayıklama / duman testi tutamacı (konsoldan erişim için)
window.izleme = { harita };
