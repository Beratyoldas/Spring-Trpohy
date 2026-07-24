# SPRING TROPHY CANLI TAKİP PROJESİ — DURUM
Son güncelleme: 25 Temmuz 2026 (v6 — M2 tamamlandı: web 2D canlı izleme çalışıyor)
Bu dosya projenin tek gerçek kaynağıdır. Her önemli karardan sonra güncellenir,
Claude projesinin bilgi alanına yüklenir ve repo kökünde tutulur.

## PROJE ÖZETİ
Spring Trophy yelken yarış serisinin (3 ayak × 2 şamandıra yarışı + final Boğaz
Yarışı) canlı takip sistemi: yarışçılar Spring Trophy mobil uygulamasıyla konum
paylaşır; seyirciler yarışı uygulamadan ve web sitesinden 2D/3D canlı izler.
Vizyon dokümanı: docs/Spring_Trophy_Proje_Tanitim_Dosyasi.docx

## TİCARİ HEDEF (17.07.2026'da eklendi)
- Sistem yalnızca Spring Trophy için değil; SATILABİLİR ÜRÜN olarak
  paketlenecek. İki ayrı paket: (A) 2D canlı takip paketi, (B) 3D paket
  (GeoRacing'in "3D seçili etkinliklerde" modeline benzer katmanlı satış).
- Referans/kıyas ürünü: GeoRacing (player.georacing.com). Türkiye'de Eker
  Olympos Regatta'da kullanılmış — yerel pazarda rakip/emsal mevcut.
- Ürünleşmenin getirdiği yeni gereksinimler (mimaride erken düşünülecek):
  çoklu etkinlik/çoklu müşteri (multi-tenant) veri modeli — en geç PostgreSQL
  girerken (M4) tasarlanacak; etkinlik arşivi; sponsor/beyaz etiket katmanı
  (logo, banner, tema); embed edilebilir oynatıcı.
- Satış öncesi hukuki kontrol (lisans/marka, yarışçı konum verisi/KVKK)
  uzmanla yapılacak — açık iş.

## HEDEF ÖZELLİK LİSTESİ (GeoRacing eşleniği; hangi fazda)
- Canlı 2D harita takibi → M2 (şimdi)
- Yarışmacı listesi + tekne kartı (hız/yön) → M2 temel, zenginleşmesi Faz 3
- 3D izleme → Faz 2 (Three.js)
- Sıralama: şamandıra/gate/finiş + CMG bazlı ara sıralama → Faz 3
- Ara nokta zaman çizelgeleri (time charts) → Faz 3
- Avantaj hattı (advantage line), bitişe kalan mesafe → Faz 3
- Replay (canlı sonrası tekrar izleme; jüri/protesto kanıtı modu) → Faz 3
  (replay için pozisyon geçmişinin DB'ye yazılması → M4 şartı)
- PDF sonuç çıktısı → Faz 3
- Tam ekran / büyük ekran modu, siteye embed → M2'de temel, Faz 3'te cila
- Sponsor gösterimi + özelleştirilebilir altlık → ürünleşme aşaması

## ÖLÇEK VE HEDEFLER
- Yarış başına 15-40 tekne; tekne başına 1-5 sn'de bir lat/lon + COG + SOG
- Yarış süresi 2-3 saat; izleyici: uygulama + web (kurulumsuz)
- İlk canlı pilot: Spring Trophy 1. ayak (5-10 gönüllü tekne)

## MİMARİ (KARARLAŞTIRILAN)
- Monorepo: backend/ (Node+Express+ws+PostgreSQL), sim/ (simülatör),
  mobile/ (Expo RN + TS + NativeWind + RN Reusables + MapLibre RN),
  web/ (maplibre-gl-js canlı izleme; Faz 2'de Three.js)
- Yelken dinamikleri ölçülmez, TWA'dan hesaplanır (rüzgar yönü − tekne yönü)
- Rüzgar: Faz 1 açık meteo API; ileride anemometre
- 40 tekne 3D performansı: low-poly + instancing (Faz 2'de)

## KOD DEPOSU
- GitHub: https://github.com/Beratyoldas/Spring-Trpohy (private)
- Kod, Claude.ai proje bilgisine GitHub entegrasyonuyla senkronize edilir;
  önemli oturumlardan önce senkron yenilenir. Claude kod durumunu
  değerlendirirken önce repodaki güncel dosyalara bakar.

## REFERANS ANALİZLERİ
- SailGP (15.07.2026): İki ayrı ürünleri var. (1) LiveLine FX = video üzerine
  AR bindirme (RTK GPS ~2 cm, 125 sensör/tekne, ~30Hz, dev ekip) — hedefimiz
  DEĞİL. (2) Uygulamadaki 3D Race Viewer / Tabletop = GPS'ten render edilen
  3D sahne — hedefimiz BU; Three.js + WebSocket mimarisiyle ulaşılabilir.
  Kritik fark veri sıklığı (onlar ~30Hz, biz 1-5 sn): interpolasyon + dead
  reckoning katmanı zorunlu (M2 adım 5'te giriyor). Telefon GPS hatası
  (3-10 m) smoothing ile yönetilir. TWA'dan hesaplama kararı doğrulandı.
- GeoRacing (17.07.2026): Özellik seti yukarıdaki hedef listesine çıkarıldı.
  Player sayfası robots engelli; analiz resmi dokümantasyondan yapıldı.
  UI detayı gerekirse ekran görüntüsüyle ayrıca incelenecek.

## FAZLAR (vizyon dokümanındaki tanım)
- Faz 1 — Spring Trophy Mobil Uygulaması: ilanlar, bildirim, galeri, yarışçı
  doğrulama + tekne seçimi + telefonla canlı konum, 2D canlı izleme (app+web).
- Faz 2 — Adanmış 4G GPS tracker sistemi + 3D sahne olgunlaşması.
- Ayak hedefleri: 1. ayak pilot 2D → 2. ayak 3D ilk sürüm + sıralama →
  3. ayak animasyon/kamera/replay → 4. ayak (Boğaz Yarışı) tam yayın + embed.

## ALINAN KARARLAR
- [25.07.2026] HARİTA ALTLIĞI KARARI: **OpenFreeMap** (hazır "dark" stili:
  tiles.openfreemap.org/styles/dark). Gerekçe: API anahtarı/kayıt istemiyor,
  koyu yayın estetiğini doğrudan veriyor, kota derdi yok. MapTiler'a gerek
  kalmadı → .env'de harita anahtarı YOK. (Ürünleşmede özel altlık istenirse
  stil URL'si tek yerde: web/app.js → AYARLAR.STIL_URL.)
- [25.07.2026] M2 tamamlandı: 7 adım, her adım ayrı commit'le main'e
  push'landı (M2-1 … M2-7). Çalışma branch'siz, doğrudan main üzerinde
  yürütüldü (CLAUDE.md Git bölümü buna göre güncellendi).
- [25.07.2026] İnterpolasyon mimarisi: görüntü bilerek bir veri aralığı
  (2 sn) geriden akar. Alternatif olan "anlık tahmin + düzeltme" sürekli
  seğirme üretirdi; seçilen yaklaşımda yeni örnek gelince başlangıç noktası
  teknenin O AN ÇİZİLİ konumu olduğu için ışınlanma imkânsız.
- [25.07.2026] Eski m2-web-canli-izleme branch'i (önceki M2 denemesi:
  parkur otoritesi backend'de + parkur düzenleme arayüzü + 3D denemesi)
  BİRLEŞTİRİLMEDİ, silinmedi de. İçindeki "parkur düzenleme arayüzü" fikri
  yukarıdaki açık soruya (parkuru kim girecek) aday çözüm olarak duruyor.
- [17.07.2026] Ticari hedef netleşti: sistem 2D ve 3D olmak üzere iki ayrı
  paket halinde satılabilir ürün olacak; GeoRacing referans/kıyas ürünü.
  Hedef özellik listesi fazlara dağıtıldı (yukarıda).
- [17.07.2026] M2 uygulaması Claude Code'a 7 adımlık prompt ile devredildi
  (backend pozisyon önbelleği → harita → WS → markerlar → interpolasyon →
  iz/kart → cila+static sunum). Adım adım doğrulama + adım başına commit.
- [17.07.2026] Ürünleşme gereksinimi: multi-tenant veri modeli M4'te
  (PostgreSQL girişinde) tasarlanacak; replay için pozisyon geçmişi DB'ye
  yazılacak.
- [15.07.2026] Hedef netleştirildi: LiveLine tarzı video-üstü AR değil,
  SailGP uygulamasındaki 3D izleyici tarzı render edilen sahne hedefleniyor.
- [15.07.2026] Faz 2 kapsamına interpolasyon/dead reckoning eklendi; M2'de
  web tarafında ilk sürümü yapılacak.
- [09.07.2026] Proje fiziksel/yazılımsal iki kol; bu chat yönetim merkezi.
- [09.07.2026] Yazılım baştan sona Claude Code ile geliştirilecek. Çalışma
  tarzı: kritik açıklanır, rutin otonom; Windows.
- [09.07.2026] Vizyon "Spring Trophy" olarak genişledi: Faz 1 = mobil uygulama
  (seyirci yüzü + doğrulamalı yarışçı yüzü). Tanıtım dosyası v1.0 yazıldı.
- [09.07.2026] Mobil stack: Expo + TypeScript + expo-router + NativeWind +
  React Native Reusables; harita MapLibre RN (dev client). Web: maplibre-gl-js.
- [09.07.2026] Chat'te simülatör+WS prototipi yazılıp test edildi; ders:
  orsa layline kontrolü ±48° eşikle (işaret değişimi = sonsuz tramola bug'ı).
- [09.07.2026] M0 tamamlandı: git deposu, monorepo klasörleri, CLAUDE.md ve
  DURUM.md repo kökünde, .gitignore + README.
- [09.07.2026] M1 tamamlandı: sim/ + backend/ (ayrıntı önceki sürümlerde ve
  commit geçmişinde). Duman testi + yük testi geçti; uçtan uca doğrulandı.

## YAZILIM DURUMU
- Tamamlandı: M0 (repo iskeleti), M1 (simülatör + backend), M2 (web 2D canlı
  izleme — 7 adım, her adım ayrı commit'le main'e push'landı).
- M2'de ne var (çalışır durumda, tek adres: http://localhost:3000):
  - backend son "parkur" + son "pozisyonlar" mesajını önbellekler; yeni
    izleyici tik beklemeden sahneyi kurar. Backend web/'i express.static
    ile sunar (ayrı web sunucusu/build aracı YOK, maplibre-gl CDN'den).
  - Koyu "yayın" temalı MapLibre haritası; şamandıralar, start hattı
    (ALT şamandırada rüzgara dik), rüzgar göstergesi.
  - 40 tekne tek GeoJSON kaynağı + symbol katmanı (marker yeniden
    yaratılmaz, setData ile güncellenir); COG yönlü ok, kontra rengi
    (sancak yeşil / iskele kırmızı).
  - web/interp.js: interpolasyon + dead reckoning, saf fonksiyon modülü,
    9 senaryoluk duman testi (`cd web && npm test`). Ekran bir aralık
    geriden akar; yeni veri gelince başlangıç = o an ÇİZİLİ konum, bu
    yüzden zıplama yapısal olarak imkânsız. Veri gecikirse COG/SOG ile
    tahmin, 10 sn sınırından sonra tekne bekler.
  - Son 60 sn'lik solan iz çizgisi (line-gradient) + tekneye tıklayınca
    canlı SOG/COG/kontra gösteren kart.
- M2'ye bilinçli olarak DAHİL DEĞİL: sıralama, replay, zaman çizelgesi (Faz 3).
- Sırada (M2 sonrası): M3 — mobil iskelet VEYA M4 — PostgreSQL + kalıcılık +
  multi-tenant tasarım (sıra bir sonraki yönetim oturumunda netleşecek).
- WebSocket veri formatı (kesin, değişiklik önce sorulur):
  { "tekneId": "TR-001", "lat": 41.0451, "lon": 29.0341, "cog": 215, "sog": 6.4, "ts": 1720512000 }
- Güvenlik açık işi: ?rol=simulator ingest ucu korumasız; pilot yarıştan (M5)
  önce basit token doğrulaması eklenecek.

## FİZİKSEL DURUM
- Henüz başlanmadı. Sıradaki: tracker karşılaştırma raporu (Faz 2 hazırlığı).

## AÇIK SORULAR
- 2D/3D paket ayrımının teknik sınırı: 3D paket ayrı build mi, feature flag
  mi? (Faz 2 başında karar)
- Parkur şu an sim tarafından üretiliyor (yer tutucu Bebek–Kandilli
  koordinatları). Gerçek kulüp rotası ve parkuru kimin gireceği (yarış
  yönetimi arayüzü) M4/M5'te tasarlanacak.
- İz çizgisi şu an sadece tarayıcı belleğinde (sayfa yenilenince sıfırlanır);
  kalıcı iz/replay için pozisyon geçmişi DB'ye yazılmalı (M4).
- 40 tekne performansı orta seviye masaüstünde sorunsuz; düşük güçlü telefon
  tarayıcısında ölçülmedi (pilot öncesi test edilecek).
- Fiyatlama/lisans modeli (etkinlik başına vs yıllık) — ürünleşme aşamasında.
- Hukuki kontrol: marka, lisans, KVKK/konum verisi — uzmana danışılacak.
- Yarışçı doğrulama Faz 1'de: e-posta kodu mu, SMS OTP mi, davet kodu mu? (M5)
- Rüzgar API'si hangisi? (Open-Meteo adayı; M6'da karar)
- Sunucu/hosting; Apple Developer + Google Play hesap açılışları (en erken iş)
- Web sitesine embed yöntemi (site altyapısı öğrenilecek)

## ÇALIŞMA DÜZENİ
- Yönetim: bu Claude.ai projesi. Yazılım: Claude Code (CLAUDE.md + DURUM.md).
- Her Claude Code oturumu sonunda DURUM.md güncellenir ve Claude.ai proje
  bilgisine yeniden yüklenir.
- NOT: Bu v6 hem Claude.ai proje bilgisine hem repo köküne konulmalı
  (eski sürüm silinerek).

## NASIL ÇALIŞTIRILIR (M2 sonu)
İki terminal, sonra tarayıcıda tek adres:
```
cd backend && npm start      # http://localhost:3000 (izleme ekranı + ws /canli)
cd sim && npm start          # 40 tekne, 2 sn'de bir pozisyon
```
Testler: `cd sim && npm test`, `cd backend && npm run yuk-testi`,
`cd web && npm test` — 25.07.2026 itibarıyla üçü de yeşil.
