// CLI: bir kulüp için token üretir, HASH'ini kaydeder, düz metni BİR KEZ basar.
// Kullanım:
//   npm run token-olustur -- <kulup_id> <rol: hakem|ingest> [ad]
//   node token-olustur.js <kulup_id> <rol> [ad]
import { existsSync } from 'node:fs';
import { sorgu, kapat } from './db.js';
import { tokenUret, tokenHashle } from './token.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const ROLLER = ['hakem', 'ingest'];

async function calistir() {
  const [kulupId, rol, ...adParcalari] = process.argv.slice(2);
  const ad = adParcalari.join(' ') || null;

  if (!kulupId || !rol) {
    throw new Error('kullanım: npm run token-olustur -- <kulup_id> <rol: hakem|ingest> [ad]');
  }
  if (!ROLLER.includes(rol)) {
    throw new Error(`rol "${rol}" geçersiz; şunlardan biri olmalı: ${ROLLER.join(', ')}`);
  }

  const { rows } = await sorgu('select ad from kulupler where id = $1', [kulupId]);
  if (!rows[0]) throw new Error(`kulüp bulunamadı: ${kulupId}`);

  const token = tokenUret();
  await sorgu('insert into tokenlar (kulup_id, rol, hash, ad) values ($1, $2, $3, $4)', [
    kulupId,
    rol,
    tokenHashle(token),
    ad,
  ]);

  console.log('');
  console.log(`  Kulüp : ${rows[0].ad}`);
  console.log(`  Rol   : ${rol}`);
  if (ad) console.log(`  Ad    : ${ad}`);
  console.log('');
  console.log(`  Token : ${token}`);
  console.log('');
  console.log('  !! Bu değer bir daha GÖSTERİLMEYECEK — şimdi güvenli bir yere kaydet.');
  console.log("     Veritabanında yalnızca sha256 hash'i tutuluyor.");
  console.log('');
}

calistir()
  .catch((hata) => {
    console.error('[token-olustur] hata:', hata.message);
    process.exitCode = 1;
  })
  .finally(kapat);
