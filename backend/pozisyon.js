// Pozisyon geçmişi: ingest'ten gelen "pozisyonlar" mesajlarını DB'ye yazar,
// replay/iz için geri okur.
//
// TASARIM KURALI: bu modül canlı yayını ASLA yavaşlatmaz ve ASLA düşürmez.
// yaz() hiçbir zaman fırlatmaz; DB kapalıysa 0 döner, sunucu yayına devam eder.
import { sorgu } from './db.js';

export const AYARLAR = {
  SON_SATIR_SAYISI: 20, // pozisyon-oku.js varsayılan satır sayısı
  YARIS_COZUM_ARALIGI_MS: 30_000, // yarış bulunamazsa yeniden deneme aralığı
  HATA_LOG_ARALIGI_MS: 30_000, // aynı hatayı her tikte basmamak için
};

/**
 * Kulübün pozisyon yazılacak yarışı: önce 'canli' olan, yoksa en yeni yarış.
 * Kulübün hiç yarışı yoksa null.
 *
 * NOT: (durum = 'canli') bir boolean; desc sıralamada true önce gelir, yani
 * canlı yarış varsa o kazanır, yoksa liste tarihe göre iner.
 */
export async function aktifYarisBul(kulupId) {
  const { rows } = await sorgu(
    `select id, ad, durum
       from yarislar
      where kulup_id = $1
      order by (durum = 'canli') desc, olusturuldu desc
      limit 1`,
    [kulupId],
  );
  return rows[0] ?? null;
}

/**
 * Bir "pozisyonlar" mesajındaki tüm tekneleri TEK sorguyla yazar.
 * 40 tekne için 40 ayrı insert yerine bir unnest: tek gidiş-dönüş.
 * Yazılan satır sayısını döner.
 *
 * ts alanı WebSocket formatında epoch SANİYE, tabloda timestamptz —
 * çeviri to_timestamp() ile burada, tek yerde yapılır.
 */
export async function pozisyonlariYaz(yarisId, kulupId, tekneler, mesajTs) {
  const gecerli = tekneler.filter((t) => t && t.tekneId);
  if (gecerli.length === 0) return 0;

  const { rowCount } = await sorgu(
    `insert into pozisyonlar (yaris_id, kulup_id, tekne_id, lat, lon, cog, sog, ts)
     select $1, $2, t.tekne_id, t.lat, t.lon, t.cog, t.sog, to_timestamp(t.ts)
       from unnest($3::text[], $4::numeric[], $5::numeric[], $6::int[],
                   $7::numeric[], $8::double precision[])
            as t(tekne_id, lat, lon, cog, sog, ts)`,
    [
      yarisId,
      kulupId,
      gecerli.map((t) => String(t.tekneId)),
      gecerli.map((t) => t.lat ?? null),
      gecerli.map((t) => t.lon ?? null),
      gecerli.map((t) => (t.cog == null ? null : Math.round(t.cog))),
      gecerli.map((t) => t.sog ?? null),
      // Tekne kendi ts'ini vermezse mesajın ts'i, o da yoksa şu an
      gecerli.map((t) => Number(t.ts ?? mesajTs ?? Math.floor(Date.now() / 1000))),
    ],
  );
  return rowCount;
}

/**
 * En son yazılan pozisyonları döner (yeniden eskiye). yarisId verilmezse
 * tüm yarışlardan. pg numeric'i string döndürür; sayıya burada çevriliyor.
 */
export async function sonPozisyonlar(yarisId, limit = AYARLAR.SON_SATIR_SAYISI) {
  const { rows } = await sorgu(
    `select id, yaris_id, tekne_id, lat, lon, cog, sog,
            extract(epoch from ts)::bigint as ts, olusturuldu
       from pozisyonlar
      where $1::uuid is null or yaris_id = $1
      order by id desc
      limit $2`,
    [yarisId ?? null, limit],
  );
  return rows.map((s) => ({
    id: Number(s.id),
    yarisId: s.yaris_id,
    tekneId: s.tekne_id,
    lat: s.lat == null ? null : Number(s.lat),
    lon: s.lon == null ? null : Number(s.lon),
    cog: s.cog,
    sog: s.sog == null ? null : Number(s.sog),
    ts: Number(s.ts),
    olusturuldu: s.olusturuldu,
  }));
}

/**
 * Bir ingest BAĞLANTISI için pozisyon yazıcısı üretir.
 *
 * Neden bağlantı başına bir nesne: yarışın hangisi olduğu her mesajda değil
 * bir kez çözülür (2 sn'de bir fazladan sorgu atmayalım), ve DB kapalıyken
 * hata logu boğulmasın diye kısılır.
 */
export function yaziciOlustur(kulupId) {
  let yaris = null;
  let sonDenemeZamani = 0;
  let sonHataZamani = 0;
  let sessizHata = 0;

  function hataBildir(onEk, mesaj) {
    const simdi = Date.now();
    if (simdi - sonHataZamani < AYARLAR.HATA_LOG_ARALIGI_MS) {
      sessizHata++;
      return;
    }
    const ek = sessizHata > 0 ? ` (+${sessizHata} benzer hata bastırıldı)` : '';
    console.error(`[pozisyon] ${onEk}: ${mesaj}${ek}`);
    sonHataZamani = simdi;
    sessizHata = 0;
  }

  /** Yarışı çözer; bulunamazsa belirli aralıkla yeniden dener (DB sonradan açılabilir). */
  async function yarisCoz() {
    if (yaris) return yaris;
    const simdi = Date.now();
    if (simdi - sonDenemeZamani < AYARLAR.YARIS_COZUM_ARALIGI_MS) return null;
    sonDenemeZamani = simdi;

    const bulunan = await aktifYarisBul(kulupId);
    if (!bulunan) {
      hataBildir('yarış bulunamadı', `kulüp ${kulupId} için kayıtlı yarış yok, pozisyonlar yazılmıyor`);
      return null;
    }
    yaris = bulunan;
    console.log(`[pozisyon] geçmiş şu yarışa yazılıyor: "${yaris.ad}" (${yaris.durum}, ${yaris.id})`);
    return yaris;
  }

  return {
    /** Mesajı yazar, yazılan satır sayısını döner. ASLA fırlatmaz. */
    async yaz(mesaj) {
      const tekneler = Array.isArray(mesaj?.tekneler) ? mesaj.tekneler : [];
      if (tekneler.length === 0) return 0;
      try {
        const hedef = await yarisCoz();
        if (!hedef) return 0;
        return await pozisyonlariYaz(hedef.id, kulupId, tekneler, mesaj.ts);
      } catch (hata) {
        hataBildir('yazılamadı', hata.message);
        return 0;
      }
    },
  };
}
