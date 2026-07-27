// Doğrulama aracı: pozisyon geçmişinden son N satırı basar.
// Çalıştır:  cd backend && npm run pozisyon-oku
//            npm run pozisyon-oku -- 50            (son 50 satır)
//            npm run pozisyon-oku -- 50 <yaris_id> (tek yarış)
import { existsSync } from 'node:fs';
import { AYARLAR, sonPozisyonlar } from './pozisyon.js';
import { kapat } from './db.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const satirSayisi = Number(process.argv[2]) || AYARLAR.SON_SATIR_SAYISI;
const yarisId = process.argv[3] || null;

async function calistir() {
  const satirlar = await sonPozisyonlar(yarisId, satirSayisi);
  if (satirlar.length === 0) {
    console.log('[pozisyon-oku] kayıt yok — backend ve simülatör çalışıyor mu?');
    return;
  }

  console.log(`\n[pozisyon-oku] son ${satirlar.length} satır (yeniden eskiye):\n`);
  console.log('  tekne      lat         lon         cog   sog    zaman');
  for (const s of satirlar) {
    const zaman = new Date(s.ts * 1000).toLocaleTimeString('tr-TR');
    console.log(
      `  ${String(s.tekneId).padEnd(9)}  ${String(s.lat).padEnd(10)}  ` +
        `${String(s.lon).padEnd(10)}  ${String(s.cog).padStart(3)}   ` +
        `${String(s.sog).padStart(4)}   ${zaman}`,
    );
  }
  console.log('');
}

calistir()
  .catch((hata) => {
    console.error('[pozisyon-oku] hata:', hata.message);
    process.exitCode = 1;
  })
  .finally(kapat);
