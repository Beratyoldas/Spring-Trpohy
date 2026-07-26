// Canlı veri backend'i: Express (sağlık ucu + hakem API + web/ statik sunumu) + ws.
// Yelken fiziğini bilmez, sadece iletir: simülatör/gerçek yarışçı
// (rol=simulator) ingest bağlantısından gelen "parkur"/"pozisyonlar"
// mesajlarını izleyicilere (rol=izleyici) yayınlar.
// Yeni izleyiciye bağlanır bağlanmaz son bilinen "parkur" ve "pozisyonlar"
// gönderilir (izleyici bir sonraki tiki beklemeden sahneyi kurabilsin).
// İzleme ekranı tek adrestir: http://localhost:3000 → web/index.html
//
// Yetki: ingest bağlantısı ve /api/* korumalı (Bearer token), izleyici
// bağlantısı ve /saglik herkese açık.
import { existsSync } from 'node:fs';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';
import { saglikKontrol, sorgu } from './db.js';
import { basliktanKimlik, gerekliRol } from './kimlik.js';

if (existsSync('.env')) process.loadEnvFile('.env');

// web/ klasörü bu dosyaya göre bulunur; backend hangi klasörden başlatılırsa
// başlatılsın doğru yolu görür
const WEB_KLASORU = fileURLToPath(new URL('../web', import.meta.url));
const CANLI_YOLU = '/canli';

// El sıkışma tamamlanmadan reddet: istemci 101 yerine bu HTTP yanıtını görür.
// Bağlantıyı kabul edip sonra kapatmaktan farkı, yetkisiz tarafın hiçbir zaman
// açık bir WS kanalı elde edememesi.
function elSikismayiReddet(socket, kod, mesaj) {
  if (socket.destroyed) return;
  socket.write(`HTTP/1.1 ${kod} ${mesaj}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
  socket.destroy();
}

export function baslat(port = Number(process.env.PORT) || 3000) {
  const app = express();
  // Sunucu DB olmadan da ayağa kalkar ve canlı yayını sürdürür; sağlık ucu
  // sadece durumu bildirir (DB yoksa 503 ile "hata").
  app.get('/saglik', async (req, res) => {
    const db = await saglikKontrol();
    res.status(db.ok ? 200 : 503).json({ ok: true, db: db.ok ? 'ok' : 'hata' });
  });
  // Hakem API'si — yalnızca 'hakem' rollü token. Kiracı sınırı: bir hakem
  // sadece kendi kulübünün yarışlarını görür.
  app.get('/api/yarislar', gerekliRol('hakem'), async (req, res) => {
    try {
      const { rows } = await sorgu(
        `select y.id, y.ad, y.durum, y.olusturuldu,
                e.id as etkinlik_id, e.ad as etkinlik_ad
           from yarislar y
           join etkinlikler e on e.id = y.etkinlik_id
          where y.kulup_id = $1
          order by y.olusturuldu desc`,
        [req.kimlik.kulupId],
      );
      res.json({
        yarislar: rows.map((s) => ({
          id: s.id,
          ad: s.ad,
          durum: s.durum,
          olusturuldu: s.olusturuldu,
          etkinlik: { id: s.etkinlik_id, ad: s.etkinlik_ad },
        })),
      });
    } catch (hata) {
      console.error('[api] yarışlar okunamadı:', hata.message);
      res.status(503).json({ hata: 'veritabanına ulaşılamıyor' });
    }
  });

  app.use(express.static(WEB_KLASORU)); // izleme ekranı: kökten index.html

  const server = http.createServer(app);
  // noServer: el sıkışmayı BİZ yönetiyoruz. ws'in kendi upgrade işleyicisi
  // async token doğrulaması yapmamıza izin vermezdi.
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    // Biz token doğrularken soket kopabilir; dinleyicisiz 'error' süreci düşürür
    socket.on('error', () => {});

    let url;
    try {
      url = new URL(req.url, 'http://yerel');
    } catch {
      return elSikismayiReddet(socket, 400, 'Bad Request');
    }
    if (url.pathname !== CANLI_YOLU) return elSikismayiReddet(socket, 404, 'Not Found');

    // İzleyici tarafı herkese açık: yayını izlemek için token gerekmez
    if (url.searchParams.get('rol') !== 'simulator') {
      return wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
    }

    basliktanKimlik(req.headers.authorization)
      .catch((hata) => {
        console.error('[backend] ingest doğrulaması yapılamadı:', hata.message);
        return null;
      })
      .then((kimlik) => {
        if (socket.destroyed) return;
        if (!kimlik) return elSikismayiReddet(socket, 401, 'Unauthorized');
        if (kimlik.rol !== 'ingest') return elSikismayiReddet(socket, 403, 'Forbidden');
        wss.handleUpgrade(req, socket, head, (ws) => {
          ws.kimlik = kimlik; // pozisyonlar bu kulübe yazılacak (sonraki adım)
          wss.emit('connection', ws, req);
        });
      });
  });

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
      // Buraya ulaşan her ingest bağlantısı upgrade'de doğrulanmıştır
      console.log(`[backend] ingest bağlandı (kulüp ${ws.kimlik.kulupId})`);
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
      ws.on('close', () => console.log('[backend] ingest bağlantısı koptu'));
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
