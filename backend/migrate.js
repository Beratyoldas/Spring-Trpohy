// Migration çalıştırıcı: migrations/ klasöründeki .sql dosyalarını dosya adına
// göre sıralar, "migrasyonlar" tablosunda kaydı olmayanları TEK transaction
// içinde uygular ve kaydeder. Biri patlarsa hiçbiri yarım kalmaz (rollback).
// Tekrar çalıştırılması güvenlidir: uygulanmışlar atlanır (idempotent).
// Çalıştırma: cd backend && npm run migrate
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { havuzAl, kapat } from './db.js';

if (existsSync('.env')) process.loadEnvFile('.env');

// Hangi klasörden çalıştırılırsa çalıştırılsın doğru yolu görsün
const MIGRATION_KLASORU = fileURLToPath(new URL('./migrations', import.meta.url));

async function calistir() {
  const istemci = await havuzAl().connect();
  try {
    // Defter tablosu: hangi dosya ne zaman uygulandı
    await istemci.query(`
      create table if not exists migrasyonlar (
        dosya      text        primary key,
        uygulandi  timestamptz not null default now()
      )
    `);

    const { rows } = await istemci.query('select dosya from migrasyonlar');
    const uygulanmis = new Set(rows.map((satir) => satir.dosya));

    const bekleyenler = readdirSync(MIGRATION_KLASORU)
      .filter((dosya) => dosya.endsWith('.sql'))
      .sort()
      .filter((dosya) => !uygulanmis.has(dosya));

    if (bekleyenler.length === 0) {
      console.log('[migrate] uygulanacak migration yok');
      return;
    }

    await istemci.query('begin');
    try {
      for (const dosya of bekleyenler) {
        console.log(`[migrate] uygulanıyor: ${dosya}`);
        const sql = readFileSync(path.join(MIGRATION_KLASORU, dosya), 'utf8');
        await istemci.query(sql);
        await istemci.query('insert into migrasyonlar (dosya) values ($1)', [dosya]);
      }
      await istemci.query('commit');
      console.log(`[migrate] ${bekleyenler.length} migration uygulandı`);
    } catch (hata) {
      await istemci.query('rollback');
      throw hata;
    }
  } finally {
    istemci.release();
  }
}

calistir()
  .catch((hata) => {
    console.error('[migrate] hata:', hata.message);
    process.exitCode = 1;
  })
  .finally(kapat);
