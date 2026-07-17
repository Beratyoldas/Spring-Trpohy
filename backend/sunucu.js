// Canlı veri backend'i: Express (sağlık ucu) + ws. Yelken fiziğini bilmez,
// sadece iletir: simülatör/gerçek yarışçı (rol=simulator) ingest bağlantısından
// gelen "parkur"/"pozisyonlar" mesajlarını izleyicilere (rol=izleyici) yayınlar.
// Yeni izleyiciye bağlanır bağlanmaz son bilinen "parkur" ve "pozisyonlar"
// gönderilir (izleyici bir sonraki tiki beklemeden sahneyi kurabilsin).
import { existsSync } from 'node:fs';
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';

if (existsSync('.env')) process.loadEnvFile('.env');

export function baslat(port = Number(process.env.PORT) || 3000) {
  const app = express();
  app.get('/saglik', (req, res) => res.json({ ok: true }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/canli' });

  let sonParkur = null;
  let sonPozisyonlar = null;
  const izleyiciler = new Set();

  function yayinla(mesaj) {
    const veri = JSON.stringify(mesaj);
    for (const izleyici of izleyiciler) {
      if (izleyici.readyState === izleyici.OPEN) izleyici.send(veri);
    }
  }

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://yerel');
    const rol = url.searchParams.get('rol') === 'simulator' ? 'simulator' : 'izleyici';

    if (rol === 'simulator') {
      console.log('[backend] simülatör (ingest) bağlandı');
      ws.on('message', (veri) => {
        let mesaj;
        try {
          mesaj = JSON.parse(veri.toString());
        } catch {
          return;
        }
        if (mesaj.type === 'parkur') sonParkur = mesaj;
        if (mesaj.type === 'pozisyonlar') sonPozisyonlar = mesaj;
        if (mesaj.type === 'parkur' || mesaj.type === 'pozisyonlar') yayinla(mesaj);
      });
      ws.on('close', () => console.log('[backend] simülatör bağlantısı koptu'));
    } else {
      izleyiciler.add(ws);
      console.log(`[backend] izleyici bağlandı (toplam ${izleyiciler.size})`);
      if (sonParkur) ws.send(JSON.stringify(sonParkur));
      if (sonPozisyonlar) ws.send(JSON.stringify(sonPozisyonlar));
      ws.on('close', () => {
        izleyiciler.delete(ws);
        console.log(`[backend] izleyici ayrıldı (toplam ${izleyiciler.size})`);
      });
    }
  });

  server.listen(port, () => console.log(`[backend] dinleniyor: http://localhost:${port} (ws: /canli)`));

  return {
    server,
    wss,
    kapat: () =>
      new Promise((resolve) => {
        wss.clients.forEach((c) => c.terminate());
        wss.close(() => server.close(resolve));
      }),
  };
}

const dogrudanCalistiriliyor =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (dogrudanCalistiriliyor) baslat();
