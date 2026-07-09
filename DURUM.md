# SPRING TROPHY CANLI TAKİP PROJESİ — DURUM
Son güncelleme: 9 Temmuz 2026 (v3 — M0 tamamlandı: depo iskeleti)
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

## YAZILIM DURUMU
- Tamamlandı: M0 (repo iskeleti).
- Sırada: M1 — sim/ (40 sahte tekne, Boğaz rotaları, ±48° layline kuralı) +
  backend/ (Express + ws, "parkur"/"pozisyonlar" akışı) + hızlandırılmış
  simülasyon testi + 40 tekne × 2 sn yük testi.
- WebSocket veri formatı (kesinleşti, değişiklik önce sorulur):
  { "tekneId": "TR-001", "lat": 41.0451, "lon": 29.0341, "cog": 215, "sog": 6.4, "ts": 1720512000 }

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
