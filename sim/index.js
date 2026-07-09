// Üretim çalıştırıcı: backend'e ingest WS bağlantısı açar, "parkur"'u bir kez,
// "pozisyonlar"'ı 2 sn'de bir yollar. Filo turu tamamlayınca 5 sn sonra yeni
// bir yarış üretip devam eder (sürekli demo/test akışı).
// Çalıştır: node sim/index.js
import { existsSync } from 'node:fs';
import { WebSocket } from 'ws';
import { parkurUret } from './parkur.js';
import { filoOlustur, filoAdimla, herkesBitti, AYARLAR as FILO_AYARLARI } from './filo.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const BACKEND_WS_URL = process.env.BACKEND_WS_URL || 'ws://localhost:3000/canli';
const ADIM_ARALIGI_MS = 2000;

function yarisBaslat(ws) {
  const parkur = parkurUret();
  let filo = filoOlustur(parkur);

  ws.send(JSON.stringify({ type: 'parkur', ...parkur }));
  console.log(
    `[sim] yeni yarış: rüzgar ${parkur.ruzgar.yon}° / ${parkur.ruzgar.hiz} kn, ${FILO_AYARLARI.TEKNE_SAYISI} tekne`,
  );

  const interval = setInterval(() => {
    filo = filoAdimla(filo, ADIM_ARALIGI_MS / 1000, parkur);
    ws.send(
      JSON.stringify({
        type: 'pozisyonlar',
        ts: Math.floor(Date.now() / 1000),
        tekneler: filo.tekneler.map(({ tekneId, lat, lon, cog, sog, ts }) => ({
          tekneId,
          lat: Number(lat.toFixed(6)),
          lon: Number(lon.toFixed(6)),
          cog: Math.round(cog),
          sog,
          ts,
        })),
      }),
    );

    if (herkesBitti(filo)) {
      clearInterval(interval);
      console.log('[sim] filo turu tamamladı, 5 sn sonra yeni yarış başlıyor');
      setTimeout(() => {
        if (ws.readyState === ws.OPEN) yarisBaslat(ws);
      }, 5000);
    }
  }, ADIM_ARALIGI_MS);

  ws.once('close', () => clearInterval(interval));
}

function baglan() {
  const ws = new WebSocket(`${BACKEND_WS_URL}?rol=simulator`);

  ws.on('open', () => {
    console.log('[sim] backend\'e bağlandı');
    yarisBaslat(ws);
  });
  ws.on('close', () => {
    console.log('[sim] bağlantı koptu, 2 sn sonra tekrar denenecek');
    setTimeout(baglan, 2000);
  });
  ws.on('error', (err) => console.error('[sim] hata:', err.message));
}

baglan();
