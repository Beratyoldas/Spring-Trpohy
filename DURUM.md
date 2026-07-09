# SPRING TROPHY CANLI TAKİP PROJESİ — DURUM
Son güncelleme: 9 Temmuz 2026 (v4 — M1 tamamlandı: simülatör + backend)
Bu dosya projenin tek gerçek kaynağıdır. Her önemli karardan sonra güncellenir,
Claude projesinin bilgi alanına yüklenir ve repo kökünde tutulur.

## PROJE ÖZETİ
Spring Trophy yelken yarış serisinin (3 ayak × 2 şamandıra yarışı + final Boğaz
Yarışı) canlı takip sistemi: yarışçılar Spring Trophy mobil uygulamasıyla konum
paylaşır; seyirciler yarışı uygulamadan ve web sitesinden 2D/3D canlı izler.
Vizyon dokümanı: docs/Spring_Trophy_Proje_Tanitim_Dosyasi.docx

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

## FAZLAR (vizyon dokümanındaki tanım)
- Faz 1 — Spring Trophy Mobil Uygulaması: ilanlar, bildirim, galeri, yarışçı
  doğrulama + tekne seçimi + telefonla canlı konum, 2D canlı izleme (app+web).
- Faz 2 — Adanmış 4G GPS tracker sistemi + 3D sahne olgunlaşması.
- Ayak hedefleri: 1. ayak pilot 2D → 2. ayak 3D ilk sürüm + sıralama →
  3. ayak animasyon/kamera/replay → 4. ayak (Boğaz Yarışı) tam yayın + embed.

## ALINAN KARARLAR
- [09.07.2026] Proje fiziksel/yazılımsal iki kol; bu chat yönetim merkezi.
- [09.07.2026] Yazılım baştan sona Claude Code ile geliştirilecek (chat'te
  prototip yerine). Çalışma tarzı: kritik açıklanır, rutin otonom; Windows.
- [09.07.2026] Vizyon "Spring Trophy" olarak genişledi: Faz 1 = mobil uygulama
  (seyirci yüzü + doğrulamalı yarışçı yüzü). Tanıtım dosyası v1.0 yazıldı.
- [09.07.2026] Mobil stack: Expo + TypeScript + expo-router + NativeWind +
  React Native Reusables; harita MapLibre RN (dev client ile). Web: maplibre-gl-js.
- [09.07.2026] Chat'te simülatör+WS sunucu prototipi yazıldı ve test edildi;
  öğrenilen ders: orsa layline kontrolü ±48° eşikle yapılmalı (işaret
  değişimiyle yapılınca sonsuz tramola bug'ı). Kod Claude Code'da yeniden
  kurulacak/temiz entegre edilecek.
- [09.07.2026] M0 tamamlandı: git deposu kuruldu, monorepo klasörleri
  (backend/, sim/, mobile/, web/) açıldı, CLAUDE.md ve DURUM.md docs/ altından
  repo köküne taşındı (CLAUDE.md'nin öngördüğü yapıya uyum için — docs/ artık
  sadece vizyon docx'ini içeriyor), .gitignore ve kök README.md eklendi.
- [09.07.2026] M1 tamamlandı: sim/ (Node.js düz JS, ESM — backend/sim'de TS
  kullanılmıyor, sadece mobile'de zorunlu) + backend/ (Express + ws) yazıldı.
  Mimari: backend yelken fiziğini bilmiyor, sadece ingest→izleyici fan-out
  yapıyor (M5'te gerçek yarışçı telefonları da aynı ingest hattını kullanacak).
  Parkur: "2 şamandıra" formatı (alt=start/bitiş, üst=rüzgar üstü dönüş),
  koordinatlar Bebek–Kandilli civarı YER TUTUCU (gerçek kulüp rotası
  netleşince `sim/parkur.js`'teki AYARLAR güncellenecek). Fizik/tramola
  mantığı `sim/fizik.js`'te tek bir genel fonksiyonla (`bacakSeyriHesapla`)
  hem orsa hem apaz bacağı için kullanılıyor; ±48° layline histerezisi
  (45°+3° tampon) bilinen sonsuz-tramola tuzağını önlüyor.
  Testler geçti: hızlandırılmış duman testi (40 tekne, ~37 dk sanal sürede
  tur tamamlanıyor, <100ms gerçek süre) ve yük testi (20 izleyici + 40 tekne,
  20 sn kesintisiz). Uçtan uca manuel doğrulama yapıldı (bağlanınca parkur,
  sonra 2 sn'de bir 40 teknelik pozisyonlar akışı).
  Not: Repo'ya `origin` remote'u (github.com/Beratyoldas/Spring-Trpohy)
  oturum dışında eklenmiş/push'lanmış görünüyor; Claude Code push yapmadı.

## YAZILIM DURUMU
- Tamamlandı: M0 (repo iskeleti), M1 (simülatör + backend).
- Sırada: M2 — web/ 2D canlı izleme (maplibre-gl-js, koyu "yayın" teması,
  tekne ikonları + iz çizgisi, şamandıra/parkur, tekneye tıklayınca kart).
- WebSocket veri formatı (kesinleşti, değişiklik önce sorulur):
  { "tekneId": "TR-001", "lat": 41.0451, "lon": 29.0341, "cog": 215, "sog": 6.4, "ts": 1720512000 }
- Backend/sim çalıştırma: bkz. kök README.md.

## FİZİKSEL DURUM
- Henüz başlanmadı. Sıradaki: tracker karşılaştırma raporu (Faz 2 hazırlığı).

## AÇIK SORULAR
- Yarışçı doğrulama Faz 1'de: e-posta kodu mu, SMS OTP mi, davet kodu mu?
  (maliyet/karmaşıklık kararı — M5'te kesinleşecek)
- Rüzgar API'si hangisi? (Open-Meteo adayı; M6'da karar)
- Harita altlığı: OpenFreeMap mı MapTiler free mı? (M2'de denenip karar)
- Sunucu/hosting; Apple Developer + Google Play hesap açılışları (en erken iş)
- Web sitesine embed yöntemi (site altyapısı öğrenilecek)

## ÇALIŞMA DÜZENİ
- Yönetim: bu Claude.ai projesi. Yazılım: Claude Code (CLAUDE.md + DURUM.md).
- Her Claude Code oturumu sonunda DURUM.md güncellenir ve Claude.ai proje
  bilgisine yeniden yüklenir.
