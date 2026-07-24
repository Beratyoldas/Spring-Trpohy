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
  // Sayfa backend'den sunuluyorsa (tek adres: localhost:3000) aynı hosta
  // bağlanır; file:// ile açılırsa geliştirme varsayılanına düşer.
  WS_ADRES: location.protocol.startsWith('http')
    ? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/canli`
    : 'ws://localhost:3000/canli',
  YENIDEN_BAGLAN_MS: 2000,
  START_HATTI_YARIM_M: 125, // start hattının ALT şamandıradan her iki yana uzunluğu
  VERI_ARALIGI_MS: 2000, // sim/gerçek kaynak pozisyonları bu aralıkla yollar
  IZ_SURESI_MS: 60000, // iz çizgisi bu kadar geçmişi gösterir
  IZ_ORNEK_MS: 1000, // ize en fazla bu sıklıkta nokta eklenir
  IZ_CIZIM_MS: 100, // iz kaynağı bu sıklıkta yeniden çizilir (her kare pahalı)
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
  izEski: 'rgba(53, 195, 240, 0)', // iz kuyruğu: tamamen solmuş
  izYeni: 'rgba(53, 195, 240, 0.65)', // iz başı: vurgu rengi (CSS --vurgu)
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
let sonRuzgar = null; // kontra hesabı için son bilinen rüzgar

// tekneId → interpolasyon durumu (interp.js). Çizim rAF döngüsünde yapılır;
// harita hazır olmadan gelen pozisyonlar da burada birikir.
const tekneDurumlari = new Map();

// tekneId → iz noktaları [{lon, lat, tMs}] (çizilen konumdan ~1 sn'de bir örnek)
const izler = new Map();
let sonIzCizimMs = 0;

// Kartta gösterilen tekne (null = kart kapalı)
let seciliTekneId = null;

harita.on('load', () => {
  parkurKatmanlariniKur();
  tekneKatmaniniKur();
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

  // İz katmanı teknelerin ALTINA çizilir; lineMetrics solan gradyan için şart
  harita.addSource('izler', { type: 'geojson', data: BOS_GEOJSON, lineMetrics: true });
  harita.addLayer({
    id: 'izler',
    type: 'line',
    source: 'izler',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-width': 2,
      // Kuyruktan (0) başa (1) doğru saydamdan vurgu rengine solan iz
      'line-gradient': [
        'interpolate',
        ['linear'],
        ['line-progress'],
        0,
        RENKLER.izEski,
        1,
        RENKLER.izYeni,
      ],
    },
  });

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

  // Tekneye tıklayınca kart açılır; imleç tekne üstünde işaretçiye döner
  harita.on('click', 'tekneler', (olay) => {
    if (olay.features.length > 0) tekneSec(olay.features[0].properties.tekneId);
  });
  harita.on('mouseenter', 'tekneler', () => {
    harita.getCanvas().style.cursor = 'pointer';
  });
  harita.on('mouseleave', 'tekneler', () => {
    harita.getCanvas().style.cursor = '';
  });
}

// Kart açma/kapama. Seçili tekne ikonla da vurgulanır (biraz büyür).
function tekneSec(tekneId) {
  seciliTekneId = tekneId;
  document.getElementById('kart').hidden = false;
  document.getElementById('kart-tekne').textContent = tekneId;
  if (haritaHazir) {
    harita.setLayoutProperty('tekneler', 'icon-size', [
      'case',
      ['==', ['get', 'tekneId'], tekneId],
      1.25,
      1,
    ]);
  }
  kartGuncelle();
}

function kartKapat() {
  seciliTekneId = null;
  document.getElementById('kart').hidden = true;
  if (haritaHazir) harita.setLayoutProperty('tekneler', 'icon-size', 1);
}

// Kartı seçili teknenin O ANKİ interpolasyonlu durumuyla doldurur.
// rAF döngüsünden her karede çağrılır → değerler canlı akar.
function kartGuncelle() {
  if (!seciliTekneId) return;
  const durum = tekneDurumlari.get(seciliTekneId);
  if (!durum) {
    kartKapat(); // tekne yayından düştüyse kart açık kalmasın
    return;
  }
  const k = Interp.konumHesapla(durum, performance.now(), AYARLAR.VERI_ARALIGI_MS);
  document.getElementById('kart-sog').textContent = `${k.sog.toFixed(1)} kn`;
  document.getElementById('kart-cog').textContent = `${Math.round(k.cog)}°`;
  const kontra = kontraBul(k.cog);
  const kontraAlani = document.getElementById('kart-kontra');
  kontraAlani.textContent = kontra === 'notr' ? '—' : kontra.toUpperCase();
  kontraAlani.className = `deger ${kontra}`;
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
  izler.clear(); // yeni yarış/parkur = eski yarışın izleri temizlenir
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

// --- Tekne verisi: her mesaj interpolasyon durumlarını günceller (interp.js).
// Çizim mesajda DEĞİL, aşağıdaki rAF döngüsünde her karede yapılır. ---
function pozisyonlarIsle(mesaj) {
  const simdi = performance.now();
  const gelenIdler = new Set();
  for (const t of mesaj.tekneler) {
    gelenIdler.add(t.tekneId);
    const ornek = { lat: t.lat, lon: t.lon, cog: t.cog, sog: t.sog };
    tekneDurumlari.set(
      t.tekneId,
      Interp.yeniOrnek(tekneDurumlari.get(t.tekneId), ornek, simdi, AYARLAR.VERI_ARALIGI_MS),
    );
  }
  // Artık gelmeyen tekneler haritada hayalet kalmasın (izleriyle birlikte)
  for (const id of tekneDurumlari.keys()) {
    if (!gelenIdler.has(id)) {
      tekneDurumlari.delete(id);
      izler.delete(id);
    }
  }
}

// rAF döngüsü: her karede tüm teknelerin o anki interpolasyonlu konumu çizilir.
// Tek kaynak + setData = 40 tekne için nesne yaratmadan akıcı güncelleme.
function kareCiz() {
  if (haritaHazir && tekneDurumlari.size > 0) {
    const simdi = performance.now();
    const tekneOzellikleri = [];

    for (const [tekneId, durum] of tekneDurumlari) {
      const k = Interp.konumHesapla(durum, simdi, AYARLAR.VERI_ARALIGI_MS);
      tekneOzellikleri.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [k.lon, k.lat] },
        properties: { tekneId, cog: k.cog, sog: k.sog, kontra: kontraBul(k.cog) },
      });
      izeNoktaEkle(tekneId, k, simdi);
    }

    harita.getSource('tekneler').setData({ type: 'FeatureCollection', features: tekneOzellikleri });
    izleriCiz(simdi);
    kartGuncelle();
  }
  requestAnimationFrame(kareCiz);
}
requestAnimationFrame(kareCiz);

// Çizilen konumdan ~1 sn'de bir iz noktası alınır; 60 sn'den eskiler atılır
function izeNoktaEkle(tekneId, k, simdiMs) {
  let iz = izler.get(tekneId);
  if (!iz) {
    iz = [];
    izler.set(tekneId, iz);
  }
  if (iz.length === 0 || simdiMs - iz[iz.length - 1].tMs >= AYARLAR.IZ_ORNEK_MS) {
    iz.push({ lon: k.lon, lat: k.lat, tMs: simdiMs });
  }
  while (iz.length > 0 && simdiMs - iz[0].tMs > AYARLAR.IZ_SURESI_MS) iz.shift();
}

// İz kaynağı 10 Hz'de güncellenir (her karede yeniden üçgenlemek pahalı).
// Her izin başına teknenin o anki çizili konumu eklenir ki iz tekneye yapışık dursun.
function izleriCiz(simdiMs) {
  if (simdiMs - sonIzCizimMs < AYARLAR.IZ_CIZIM_MS) return;
  sonIzCizimMs = simdiMs;

  const ozellikler = [];
  for (const [tekneId, iz] of izler) {
    const durum = tekneDurumlari.get(tekneId);
    if (!durum || iz.length < 2) continue;
    const bas = Interp.konumHesapla(durum, simdiMs, AYARLAR.VERI_ARALIGI_MS);
    const koordinatlar = iz.map((n) => [n.lon, n.lat]);
    koordinatlar.push([bas.lon, bas.lat]);
    ozellikler.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: koordinatlar },
      properties: { tekneId },
    });
  }
  harita.getSource('izler').setData({ type: 'FeatureCollection', features: ozellikler });
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

document.getElementById('kart-kapat').addEventListener('click', kartKapat);

// Hata ayıklama / duman testi tutamacı (konsoldan erişim için)
window.izleme = { harita };
