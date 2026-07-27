// Duman testi: pozisyon geçmişi uçtan uca — geçici bir kulüp/etkinlik/yarış
// kurar, yazıcıyla sahte pozisyon yazar, geri okur, alanları karşılaştırır ve
// ne olursa olsun kendi verisini siler.
// Çalıştır: cd backend && npm run test-pozisyon
//
// DB kapalıysa test BAŞARISIZ SAYILMAZ, ATLANIR — böylece `npm test`
// veritabanı olmayan bir makinede de yeşil kalır (atlandığı ekranda yazar).
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { kapat, saglikKontrol, sorgu } from './db.js';
import { sonPozisyonlar, yaziciOlustur } from './pozisyon.js';

if (existsSync('.env')) process.loadEnvFile('.env');

let basarisiz = 0;

function esit(ad, bulunan, beklenen) {
  const gecti = bulunan === beklenen;
  console.log(`  ${gecti ? 'GECTI' : 'KALDI'}  ${ad}${gecti ? '' : ` (bulunan: ${bulunan}, beklenen: ${beklenen})`}`);
  if (!gecti) basarisiz++;
}

// Sabit değil rastgele id'ler: test gerçek verinin yanında çalışsa da çakışmaz
const kulupId = randomUUID();
const etkinlikId = randomUUID();
const yarisId = randomUUID();

const TS = 1720512000; // sabit epoch saniye — zaman çevirisini de doğrular
const SAHTE_TEKNELER = [
  { tekneId: 'TEST-001', lat: 41.045123, lon: 29.034156, cog: 215, sog: 6.4, ts: TS },
  { tekneId: 'TEST-002', lat: 41.046789, lon: 29.035987, cog: 42, sog: 5.1, ts: TS + 1 },
];

async function kur() {
  await sorgu('insert into kulupler (id, ad) values ($1, $2)', [kulupId, 'TEST Kulüp']);
  await sorgu('insert into etkinlikler (id, kulup_id, ad) values ($1, $2, $3)', [
    etkinlikId,
    kulupId,
    'TEST Etkinlik',
  ]);
  await sorgu('insert into yarislar (id, etkinlik_id, kulup_id, ad, durum) values ($1, $2, $3, $4, $5)', [
    yarisId,
    etkinlikId,
    kulupId,
    'TEST Yarış',
    'canli',
  ]);
}

async function temizle() {
  // Sıra önemli: pozisyonlar.kulup_id ve yarislar.kulup_id kulüplere
  // cascade'siz bağlı — kulüp en sonda silinmeli
  await sorgu('delete from pozisyonlar where yaris_id = $1', [yarisId]);
  await sorgu('delete from yarislar where id = $1', [yarisId]);
  await sorgu('delete from etkinlikler where id = $1', [etkinlikId]);
  await sorgu('delete from kulupler where id = $1', [kulupId]);
}

async function calistir() {
  const saglik = await saglikKontrol();
  if (!saglik.ok) {
    console.log('\n[pozisyon] ATLANDI — veritabanına ulaşılamıyor.');
    console.log('           Başlatmak için: docker compose up -d, sonra cd backend && npm run migrate\n');
    return;
  }

  await kur();
  try {
    const yazici = yaziciOlustur(kulupId);

    console.log('\n--- yazma ---');
    const yazilan = await yazici.yaz({ type: 'pozisyonlar', ts: TS, tekneler: SAHTE_TEKNELER });
    esit('2 tekne yazıldı', yazilan, 2);

    console.log('\n--- geri okuma ---');
    const satirlar = await sonPozisyonlar(yarisId, 10);
    esit('2 satır geri okundu', satirlar.length, 2);

    // Yazma sırası korunmadığı için tekneId ile eşleştiriyoruz
    for (const beklenen of SAHTE_TEKNELER) {
      const bulunan = satirlar.find((s) => s.tekneId === beklenen.tekneId);
      if (!bulunan) {
        esit(`${beklenen.tekneId} bulundu`, false, true);
        continue;
      }
      esit(`${beklenen.tekneId} lat`, bulunan.lat, beklenen.lat);
      esit(`${beklenen.tekneId} lon`, bulunan.lon, beklenen.lon);
      esit(`${beklenen.tekneId} cog`, bulunan.cog, beklenen.cog);
      esit(`${beklenen.tekneId} sog`, bulunan.sog, beklenen.sog);
      esit(`${beklenen.tekneId} ts (epoch sn gidip geldi)`, bulunan.ts, beklenen.ts);
      esit(`${beklenen.tekneId} doğru yarışa yazıldı`, bulunan.yarisId, yarisId);
    }

    console.log('\n--- sınır durumları ---');
    esit('boş tekne listesi 0 döner', await yazici.yaz({ type: 'pozisyonlar', tekneler: [] }), 0);
    esit('tekneler alanı yoksa 0 döner', await yazici.yaz({ type: 'pozisyonlar' }), 0);

    // Kulübün hiç yarışı yoksa yazıcı sessizce 0 dönmeli, çökmemeli
    const bosYazici = yaziciOlustur(randomUUID());
    esit(
      'yarışsız kulüp: çökmeden 0',
      await bosYazici.yaz({ type: 'pozisyonlar', ts: TS, tekneler: SAHTE_TEKNELER }),
      0,
    );
  } finally {
    await temizle();
  }

  console.log(basarisiz === 0 ? '\n[pozisyon] BAŞARILI\n' : `\n[pozisyon] BAŞARISIZ: ${basarisiz} kontrol\n`);
}

calistir()
  .catch((hata) => {
    console.error('[pozisyon] hata:', hata.message);
    basarisiz++;
  })
  .finally(async () => {
    await kapat();
    process.exit(basarisiz === 0 ? 0 : 1);
  });
