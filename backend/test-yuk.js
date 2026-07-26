// Yük testi: sunucuyu bellek-içi başlatır, 1 sahte simülatör (ingest) +
// 20 sahte izleyici WS istemcisiyle ~20 sn gerçek zamanlı koşturur, tüm
// izleyicilerin parkur + düzenli pozisyonlar mesajı aldığını doğrular.
// İngest artık token istediği için test kendi geçici kulübünü ve ingest
// token'ını yaratır, sonunda siler. Çalıştır: node backend/test-yuk.js
import { existsSync } from 'node:fs';
import { WebSocket } from 'ws';
import { baslat } from './sunucu.js';
import { sorgu, kapat as dbKapat } from './db.js';
import { tokenUret, tokenHashle } from './token.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const PORT = 3099;
const IZLEYICI_SAYISI = 20;
const TEKNE_SAYISI = 40;
const SURE_SN = 20;
const ADIM_MS = 2000;

function sahtePozisyonlar() {
  return Array.from({ length: TEKNE_SAYISI }, (_, i) => ({
    tekneId: `TR-${String(i + 1).padStart(3, '0')}`,
    lat: 41.06 + Math.random() * 0.01,
    lon: 29.04 + Math.random() * 0.01,
    cog: Math.floor(Math.random() * 360),
    sog: Number((Math.random() * 8).toFixed(1)),
    ts: Math.floor(Date.now() / 1000),
  }));
}

// Testin kendi kiracısı: gerçek verilere karışmasın diye geçici bir kulüp
// açar. Kulüp silinince token'ı da cascade ile gider.
async function geciciIngestTokeni() {
  const { rows } = await sorgu("insert into kulupler (ad) values ('__yuk_testi__') returning id");
  const kulupId = rows[0].id;
  const token = tokenUret();
  await sorgu('insert into tokenlar (kulup_id, rol, hash, ad) values ($1, $2, $3, $4)', [
    kulupId,
    'ingest',
    tokenHashle(token),
    'yük testi',
  ]);
  return { kulupId, token };
}

// Test yarıda patlasa bile geçici kulübün silinebilmesi için dışarıda tutulur
let geciciKulupId = null;

async function temizle() {
  if (geciciKulupId) {
    await sorgu('delete from kulupler where id = $1', [geciciKulupId]).catch((hata) =>
      console.error('[yuk] geçici kulüp silinemedi:', hata.message),
    );
    geciciKulupId = null;
  }
  await dbKapat();
}

async function calistir() {
  const { kapat } = baslat(PORT);
  const { kulupId, token } = await geciciIngestTokeni();
  geciciKulupId = kulupId;

  const sim = new WebSocket(`ws://localhost:${PORT}/canli?rol=simulator`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await new Promise((resolve, reject) => {
    sim.once('open', resolve);
    sim.once('error', reject);
  });
  sim.send(JSON.stringify({ type: 'parkur', samandiralar: [], ruzgar: { yon: 30, hiz: 12 } }));

  const simInterval = setInterval(() => {
    sim.send(
      JSON.stringify({ type: 'pozisyonlar', ts: Math.floor(Date.now() / 1000), tekneler: sahtePozisyonlar() }),
    );
  }, ADIM_MS);

  const izleyiciler = [];
  const sayaclar = [];
  for (let i = 0; i < IZLEYICI_SAYISI; i++) {
    const ws = new WebSocket(`ws://localhost:${PORT}/canli`);
    const sayac = { parkur: 0, pozisyonlar: 0, hata: 0 };
    ws.on('message', (veri) => {
      const mesaj = JSON.parse(veri.toString());
      if (mesaj.type === 'parkur') sayac.parkur++;
      if (mesaj.type === 'pozisyonlar') sayac.pozisyonlar++;
    });
    ws.on('error', () => {
      sayac.hata++;
    });
    izleyiciler.push(ws);
    sayaclar.push(sayac);
  }

  await new Promise((resolve) => setTimeout(resolve, SURE_SN * 1000));

  clearInterval(simInterval);
  sim.close();
  izleyiciler.forEach((ws) => ws.close());
  await kapat();
  await temizle();

  const beklenenMinPozisyon = Math.floor((SURE_SN * 1000) / ADIM_MS) - 2; // birkaç tik toleransı
  let basarisiz = false;
  sayaclar.forEach((s, i) => {
    console.log(`[yuk] izleyici ${i + 1}: parkur=${s.parkur} pozisyonlar=${s.pozisyonlar} hata=${s.hata}`);
    if (s.parkur < 1 || s.pozisyonlar < beklenenMinPozisyon || s.hata > 0) basarisiz = true;
  });

  if (basarisiz) {
    console.error('[yuk] BAŞARISIZ: bazı izleyiciler beklenen mesajları alamadı');
    process.exit(1);
  }
  console.log(`[yuk] BAŞARILI: ${IZLEYICI_SAYISI} izleyici, ${TEKNE_SAYISI} tekne, ${SURE_SN} sn boyunca sorunsuz`);
  process.exit(0);
}

calistir().catch(async (err) => {
  console.error('[yuk] hata:', err);
  await temizle();
  process.exit(1);
});
