# SPRING TROPHY — Claude Code Proje Kuralları

## Proje
Spring Trophy: İstanbul Boğazı'ndaki kulüp yelken yarışları için canlı yarış
takip sistemi + mobil uygulama (SailGP / Virtual Regatta tarzı).
Güncel durum, kararlar, yol haritası: **DURUM.md** — her oturumun başında oku.
Vizyonun tamamı: **docs/Spring_Trophy_Proje_Tanitim_Dosyasi.docx** (özet DURUM.md'de).

## Çalışma tarzı (ÖNEMLİ)
- Kullanıcı öğrenerek ilerliyor. **Kritik mantığı** (mimari, geometri/yelken
  hesapları, WebSocket akışı, auth, performans) kısaca açıkla; **rutini**
  (boilerplate, config, kurulum) açıklamadan kendin yap.
- Küçük, test edilebilir adımlarla ilerle. Bir adım ÇALIŞIP DOĞRULANMADAN
  sonrakine geçme. Her adım sonunda kullanıcıya TEK cümlelik doğrulama tarifi ver
  ("telefonda şu ekranı aç, şunu görmelisin").
- Önemsiz olmayan her iş için önce kısa plan sun, onay al, uygula.
- İki yaklaşım arasında kararsızsan ikisini tek cümleyle anlat, kullanıcıya seçtir.
- İlgisiz kodu refactor etme; minimal değişiklik yap.

## Ortam
- Windows (PowerShell). Komutlar Windows uyumlu; unix-only kalıp kullanma.
- Node.js LTS, npm. Mobil test: kullanıcının telefonunda Expo Go / dev client.

## Depo yapısı (monorepo)
```
spring-trophy/
  backend/   Node.js + Express + ws + PostgreSQL
  sim/       Sahte tekne simülatörü (backend'e veri basar)
  mobile/    Expo (React Native + TypeScript) uygulaması
  web/       Web canlı izleme (MapLibre GL JS) + siteye embed
  docs/      Vizyon dosyası, ekran tasarım notları
  DURUM.md   Tek gerçek kaynak
```

## Teknoloji kararları (değiştirme; değişiklik gerekiyorsa önce sor)
- Mobil: **Expo + TypeScript + expo-router + NativeWind + React Native Reusables**
  (shadcn tarzı bileşenler). Harita: **@maplibre/maplibre-react-native**
  (Expo config plugin + dev client gerektirir — Expo Go'da çalışmaz, kullanıcıya
  dev client kurulumunu adım adım yaptır).
- Web izleme: **maplibre-gl-js** (Faz 2'de Three.js sahnesi eklenecek).
- Harita altlığı: ücretsiz katman (OpenFreeMap / MapTiler free); API anahtarı
  gerekiyorsa kullanıcıdan iste, asla koda gömme (.env kullan).
- Backend: Node.js + Express + `ws`. Kalıcılık: PostgreSQL. Auth: JWT.
- Bildirim: Expo push. Konum: expo-location + expo-task-manager + keep-awake.
- Yelken dinamikleri ÖLÇÜLMEZ, HESAPLANIR: TWA = rüzgâr yönü − tekne yönü.

## Veri formatı (WebSocket — değiştirmeden önce mutlaka sor)
```json
{ "type": "parkur", "samandiralar": [...], "ruzgar": { "yon": 40, "hiz": 12 } }
{ "type": "pozisyonlar", "ts": 1720512000, "tekneler": [
  { "tekneId": "TR-001", "lat": 41.0451, "lon": 29.0341, "cog": 215, "sog": 6.4, "ts": 1720512000 } ] }
```

## UI standartları
- Tasarım sistemi tek yerde: `mobile/lib/theme.ts` + NativeWind config.
  Renk/spacing hard-code YASAK; her ekran temadan beslenir.
- Dark-first "yayın" estetiği (SailGP hissi). Canlı ekranlar koyu zemin.
- Renk kodu denizcilikten: sancak=yeşil, iskele=kırmızı (kontra göstergesi).
- Türkçe arayüz. Erişilebilirlik: dokunma hedefleri ≥44pt, kontrast AA.

## Kod kuralları
- Yorumlar Türkçe. Alan terimleri tutarlı: tekne, kontra, tramola, samandira,
  kerteriz, orsa, apaz, pupa.
- Dosya başına kısa "ne yapar" bloğu. Sihirli sayılar AYARLAR sabitlerinde.
- Her modüle en az bir duman testi / hızlandırılmış simülasyon scripti.
- Gizli bilgiler (.env) asla commit edilmez; .gitignore ilk commit'te kurulur.

## Git
- Yeni branch AÇMA. Tüm çalışma doğrudan main üzerinde.
- Her doğrulanan adımdan sonra Türkçe mesajlı commit at ve main'e PUSH'la.
  Tek dev commit yasak.
- Commit mesajı formatı: "<milestone>-<adım no>: <ne yapıldı>"
  (örn. "M2-3: parkur ve rüzgar oku çizimi"). Kullanıcı ilerlemeyi commit
  mesajlarından takip eder; mesaj tek başına anlaşılır olmalı.

## Oturum kapanışı (HER OTURUMDA)
1. DURUM.md'yi güncelle: kararlar, biten adımlar, açık sorular, sıradaki iş.
2. Kullanıcıya hatırlat: "DURUM.md'yi Claude.ai proje bilgisine yeniden yükle."

## Bilinen tuzaklar (tekrar düşme)
- Orsa simülasyonunda layline kontrolü işaret değişimiyle YAPILMAZ (sonsuz
  tramola döngüsü). Doğrusu: şamandıra rüzgâra göre diğer kontranın ±48°
  hattına geçince tramola (45° + 3° tampon).
- 1 knot = 0.514444 m/s. Kısa mesafede eşdikdörtgen yaklaşım yeterli
  (lat: m/111320, lon: m/(111320·cos(lat))).
- MapLibre RN, Expo Go'da ÇALIŞMAZ → expo-dev-client ile build şart.
- iOS/Android arka plan GPS kısıtları: seyir modu = ekran açık + keep-awake;
  arka plan konum izni onboarding'de istenir.
