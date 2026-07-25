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

/**
 * Bir yarışın parkurunu şamandıraları ve sıralı bacaklarıyla birlikte tek
 * nesne olarak döndürür. Şekil, WebSocket "parkur" mesajına yakın tutuldu.
 * Parkur yoksa null döner.
 *
 * NOT: pg, numeric sütunları STRING döndürür (kayan noktada hassasiyet
 * kaybetmemek için). lat/lon/sog'u burada tek yerde sayıya çeviriyoruz ki
 * çağıranlar string ile uğraşmasın.
 */
export async function parkurGetir(yarisId) {
  const { rows: parkurlar } = await sorgu(
    `select id, yaris_id, tip, ruzgar_yon, ruzgar_hiz, tur_sayisi
       from parkurlar
      where yaris_id = $1`,
    [yarisId],
  );
  const parkur = parkurlar[0];
  if (!parkur) return null;

  const { rows: samandiralar } = await sorgu(
    `select id, ad, rol, lat, lon
       from samandiralar
      where parkur_id = $1
      order by rol, ad`,
    [parkur.id],
  );

  const { rows: bacaklar } = await sorgu(
    `select sira, hedef_samandira_id, ikinci_samandira_id, donus_yonu
       from bacaklar
      where parkur_id = $1
      order by sira`,
    [parkur.id],
  );

  return {
    type: 'parkur',
    parkurId: parkur.id,
    yarisId: parkur.yaris_id,
    tip: parkur.tip,
    turSayisi: parkur.tur_sayisi,
    ruzgar: { yon: parkur.ruzgar_yon, hiz: Number(parkur.ruzgar_hiz) },
    samandiralar: samandiralar.map((s) => ({
      id: s.id,
      ad: s.ad,
      rol: s.rol,
      lat: Number(s.lat),
      lon: Number(s.lon),
    })),
    bacaklar: bacaklar.map((b) => ({
      sira: b.sira,
      hedefSamandiraId: b.hedef_samandira_id,
      ikinciSamandiraId: b.ikinci_samandira_id,
      donusYonu: b.donus_yonu,
    })),
  };
}

/** Havuzu kapatır (script'lerin ve testlerin temiz çıkması için). */
export async function kapat() {
  if (!havuz) return;
  const kapanan = havuz;
  havuz = null;
  await kapanan.end();
}
