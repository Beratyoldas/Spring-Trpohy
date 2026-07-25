// PostgreSQL bağlantı katmanı: tüm backend için TEK bir pg havuzu (Pool),
// basit bir sorgu yardımcısı ve sağlık kontrolü.
//
// Havuz TEMBEL kurulur (ilk sorguda), modül yüklenirken değil. Sebep: ESM'de
// import edilen dosyanın gövdesi, onu import eden dosyanın gövdesinden ÖNCE
// çalışır. sunucu.js .env'i kendi gövdesinde yüklediği için, burada modül
// tepesinde havuz kursaydık DATABASE_URL henüz tanımlı olmazdı.
import pg from 'pg';

const AYARLAR = {
  AZAMI_BAGLANTI: 10, // 40 tekne + izleyiciler için fazlasıyla yeterli
  BOSTA_ZAMAN_ASIMI_MS: 30_000,
  BAGLANTI_ZAMAN_ASIMI_MS: 3_000, // DB kapalıysa /saglik asılı kalmasın
};

let havuz = null;

/** Havuzu döndürür; ilk çağrıda kurar. */
export function havuzAl() {
  if (havuz) return havuz;

  const baglantiUrl = process.env.DATABASE_URL;
  if (!baglantiUrl) {
    throw new Error('DATABASE_URL tanımlı değil (bkz. backend/.env.example)');
  }

  havuz = new pg.Pool({
    connectionString: baglantiUrl,
    max: AYARLAR.AZAMI_BAGLANTI,
    idleTimeoutMillis: AYARLAR.BOSTA_ZAMAN_ASIMI_MS,
    connectionTimeoutMillis: AYARLAR.BAGLANTI_ZAMAN_ASIMI_MS,
  });

  // Boşta bekleyen bir bağlantı koparsa pg havuz üzerinde 'error' yayar;
  // dinlenmezse Node süreci çöker. Sunucu DB olmadan da ayakta kalmalı.
  havuz.on('error', (hata) => console.error('[db] havuz hatası:', hata.message));

  return havuz;
}

/** Parametreli sorgu çalıştırır. Örn: sorgu('select * from kulupler where id = $1', [id]) */
export function sorgu(metin, parametreler = []) {
  return havuzAl().query(metin, parametreler);
}

/** DB'ye ulaşılıyor mu? Asla fırlatmaz; { ok, hata? } döner. */
export async function saglikKontrol() {
  try {
    await sorgu('select 1');
    return { ok: true };
  } catch (hata) {
    return { ok: false, hata: hata.message };
  }
}

/** Havuzu kapatır (script'lerin ve testlerin temiz çıkması için). */
export async function kapat() {
  if (!havuz) return;
  const kapanan = havuz;
  havuz = null;
  await kapanan.end();
}
