// Web canlı izleme (2D) giriş noktası: MapLibre haritasını kurar.
// Altlık: OpenFreeMap "dark" stili — API anahtarı gerektirmez.
// Parkur, tekne ve WS katmanları sonraki adımlarda bu dosyaya eklenecek.

const AYARLAR = {
  STIL_URL: 'https://tiles.openfreemap.org/styles/dark',
  MERKEZ: [29.05, 41.067], // Bebek–Kandilli hattı (sim parkuruyla aynı bölge)
  ZOOM: 13.5,
  MIN_ZOOM: 9,
  MAX_ZOOM: 18,
};

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
// canlı veri katmanları (sonraki adımlar) bu bayrağı bekleyecek.
let haritaHazir = false;
harita.on('load', () => {
  haritaHazir = true;
});
