// Web canlı izleme (2D): MapLibre haritası + backend WS istemcisi.
// Parkur mesajından şamandıralar, start hattı ve rüzgar göstergesi;
// pozisyonlar mesajından COG yönlü, kontra renkli tekne markerları çizilir.
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
  sancak: '#22c55e', // denizcilik: sancak kontra = yeşil (CSS --sancak ile aynı)
  iskele: '#ef4444', // denizcilik: iskele kontra = kırmızı (CSS --iskele ile aynı)
  notr: '#8fa0b3', // rüzgar henüz bilinmiyorsa
  tekneKenar: '#0a0f14',
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
let bekleyenPozisyonlar = null;
let sonRuzgar = null; // kontra hesabı için son bilinen rüzgar

harita.on('load', () => {
  parkurKatmanlariniKur();
  tekneKatmaniniKur();
  haritaHazir = true;
  if (bekleyenParkur) {
    parkurCiz(bekleyenParkur);
    bekleyenParkur = null;
  }
  if (bekleyenPozisyonlar) {
    tekneleriCiz(bekleyenPozisyonlar);
    bekleyenPozisyonlar = null;
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

// Tekne ikonu: kuzeye bakan ok/üçgen (icon-rotate=COG ile döndürülür).
// Kontra başına bir kez üretilir; SDF yerine hazır renkli bitmap = keskin kenar.
function tekneIkonuOlustur(renk) {
  const boyut = 48; // 2x çözünürlük; pixelRatio: 2 ile 24 CSS px olarak çizilir
  const tuval = document.createElement('canvas');
  tuval.width = boyut;
  tuval.height = boyut;
  const cizim = tuval.getContext('2d');
  cizim.beginPath();
  cizim.moveTo(24, 3); // pruva (burun)
  cizim.lineTo(41, 43); // sancak kıç köşe
  cizim.lineTo(24, 33); // kıç çentiği
  cizim.lineTo(7, 43); // iskele kıç köşe
  cizim.closePath();
  cizim.fillStyle = renk;
  cizim.fill();
  cizim.lineWidth = 3;
  cizim.strokeStyle = RENKLER.tekneKenar;
  cizim.lineJoin = 'round';
  cizim.stroke();
  return cizim.getImageData(0, 0, boyut, boyut);
}

function tekneKatmaniniKur() {
  harita.addImage('tekne-sancak', tekneIkonuOlustur(RENKLER.sancak), { pixelRatio: 2 });
  harita.addImage('tekne-iskele', tekneIkonuOlustur(RENKLER.iskele), { pixelRatio: 2 });
  harita.addImage('tekne-notr', tekneIkonuOlustur(RENKLER.notr), { pixelRatio: 2 });

  harita.addSource('tekneler', { type: 'geojson', data: BOS_GEOJSON });
  harita.addLayer({
    id: 'tekneler',
    type: 'symbol',
    source: 'tekneler',
    layout: {
      'icon-image': ['concat', 'tekne-', ['get', 'kontra']],
      'icon-rotate': ['get', 'cog'],
      'icon-rotation-alignment': 'map', // COG haritanın kuzeyine göre
      'icon-allow-overlap': true, // filo sıkışınca tekne gizlenmesin
      'icon-ignore-placement': true,
    },
  });
}

// Kontra: rüzgarın geldiği taraf. Bağıl açı = rüzgar yönü − COG normalize
// edilir; (0,180] → rüzgar sancaktan (yeşil), (-180,0) → iskeleden (kırmızı).
function kontraBul(cog) {
  if (!sonRuzgar) return 'notr';
  const fark = ((sonRuzgar.yon - cog + 540) % 360) - 180;
  return fark >= 0 ? 'sancak' : 'iskele';
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

// --- Tekne çizimi: kaynak bir kez kurulur, her mesajda sadece veri güncellenir ---
function pozisyonlarIsle(mesaj) {
  if (!haritaHazir) {
    bekleyenPozisyonlar = mesaj;
    return;
  }
  tekneleriCiz(mesaj);
}

function tekneleriCiz(mesaj) {
  const tekneler = {
    type: 'FeatureCollection',
    features: mesaj.tekneler.map((t) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [t.lon, t.lat] },
      properties: { tekneId: t.tekneId, cog: t.cog, sog: t.sog, kontra: kontraBul(t.cog) },
    })),
  };
  harita.getSource('tekneler').setData(tekneler);
}

// Rüzgar HUD'u: ok akış yönünü gösterir (meteorolojik yön = estiği yön → +180°)
function ruzgarGuncelle(ruzgar) {
  if (!ruzgar) return;
  sonRuzgar = ruzgar;
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
    if (mesaj.type === 'pozisyonlar') pozisyonlarIsle(mesaj);
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
