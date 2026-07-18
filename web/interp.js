// Tekne interpolasyonu + dead reckoning — SAF fonksiyonlar (DOM/harita yok).
// Fikir: sunucudan 2 sn'de bir gelen örnekler doğrudan çizilmez; ekran her
// karede "bir aralık geriden" akar. Yeni örnek geldiğinde eski hedef değil,
// TEKNENİN O AN ÇİZİLİ OLDUĞU KONUM yeni başlangıç yapılır — böylece sert
// zıplama yapısal olarak imkânsızdır. Veri gecikirse son hedeften COG/SOG ile
// ilerletilir (dead reckoning), sınırı aşınca tekne olduğu yerde bekler.
// Zaman ölçüsü: örneğin GELDİĞİ yerel an (saat kayması derdi olmasın diye
// mesajdaki ts değil, istemci saati kullanılır).
// Tarayıcıda klasik <script> ile global, Node duman testinde CommonJS ile yüklenir.

const INTERP_AYARLAR = {
  KNOT_MS: 0.514444, // 1 knot = 0.514444 m/s (CLAUDE.md)
  OLU_HESAP_SINIRI_SN: 10, // dead reckoning en fazla bu kadar sürdürülür
};

// Açıyı [0, 360) aralığına getirir
function normalizeAci(aci) {
  return ((aci % 360) + 360) % 360;
}

// İki açı arasındaki işaretli en kısa fark: sonuc ∈ (-180, 180]
function aciFarki(kaynak, hedef) {
  return ((hedef - kaynak + 540) % 360) - 180;
}

// Açıyı kısa yoldan karıştırır (350° → 10° geçişi 0° üzerinden döner)
function aciKarisim(kaynak, hedef, u) {
  return normalizeAci(kaynak + aciFarki(kaynak, hedef) * u);
}

// Kısa mesafe eşdikdörtgen yaklaşımı (CLAUDE.md): yön/mesafe ile yeni nokta
function ileriGit(lat, lon, yonDerece, mesafeM) {
  const rad = (yonDerece * Math.PI) / 180;
  return {
    lat: lat + (Math.cos(rad) * mesafeM) / 111320,
    lon: lon + (Math.sin(rad) * mesafeM) / (111320 * Math.cos((lat * Math.PI) / 180)),
  };
}

// Yeni sunucu örneği geldiğinde tekne durumunu üretir.
// durum: { onceki, hedef, hedefMs } — onceki/hedef: { lat, lon, cog, sog }
// İlk örnekte tekne doğrudan yerine konur (0,0'dan süzülmesin).
function yeniOrnek(durum, ornek, simdiMs, aralikMs) {
  if (!durum) {
    return { onceki: { ...ornek }, hedef: { ...ornek }, hedefMs: simdiMs };
  }
  // Sert zıplama önleme: yeni başlangıç = şu an ekranda çizili olan konum
  const cizili = konumHesapla(durum, simdiMs, aralikMs);
  return { onceki: cizili, hedef: { ...ornek }, hedefMs: simdiMs };
}

// Verilen anda çizilecek durumu döndürür: { lat, lon, cog, sog }
function konumHesapla(durum, simdiMs, aralikMs) {
  const gecenMs = simdiMs - durum.hedefMs;
  const u = gecenMs / aralikMs;

  if (u <= 0) return { ...durum.onceki };

  if (u <= 1) {
    // Normal akış: önceki çizili konumdan yeni hedefe doğrusal geçiş
    const a = durum.onceki;
    const b = durum.hedef;
    return {
      lat: a.lat + (b.lat - a.lat) * u,
      lon: a.lon + (b.lon - a.lon) * u,
      cog: aciKarisim(a.cog, b.cog, u),
      sog: a.sog + (b.sog - a.sog) * u,
    };
  }

  // Veri gecikti: hedefe varıldı, COG/SOG ile ileri tahmin (dead reckoning).
  // Sınır aşılırsa tekne son tahmin noktasında bekler (sonsuza süzülmesin).
  const b = durum.hedef;
  const tasmaSn = Math.min((gecenMs - aralikMs) / 1000, INTERP_AYARLAR.OLU_HESAP_SINIRI_SN);
  const nokta = ileriGit(b.lat, b.lon, b.cog, b.sog * INTERP_AYARLAR.KNOT_MS * tasmaSn);
  return { lat: nokta.lat, lon: nokta.lon, cog: b.cog, sog: b.sog };
}

const Interp = {
  INTERP_AYARLAR,
  normalizeAci,
  aciFarki,
  aciKarisim,
  ileriGit,
  yeniOrnek,
  konumHesapla,
};

// Node (duman testi) için dışa aktarım; tarayıcıda `module` yoktur, atlanır
if (typeof module !== 'undefined') module.exports = Interp;
