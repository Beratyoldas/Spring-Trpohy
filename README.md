# Spring Trophy — Canlı Yarış Takip

İstanbul Boğazı'ndaki kulüp yelken yarışları için canlı yarış takip sistemi
ve mobil uygulama. Detaylar için [CLAUDE.md](CLAUDE.md) (çalışma kuralları)
ve [DURUM.md](DURUM.md) (proje durumu, kararlar, yol haritası) dosyalarına bakın.

## Depo yapısı (monorepo)

```
backend/   Node.js + Express + ws + PostgreSQL — canlı veri sunucusu
sim/       Sahte tekne simülatörü (backend'e test verisi basar)
mobile/    Expo (React Native + TypeScript) uygulaması
web/       Web canlı izleme (MapLibre GL JS)
docs/      Vizyon dosyası, ekran tasarım notları
```

Her paket kendi milestone'unda kurulacak (bkz. DURUM.md — Yazılım Durumu).
Şu an çalışır durumda: `backend/` (M1), `sim/` (M1), `web/` (M2).
`mobile/` henüz boş.

## Gereksinimler

- Node.js LTS + npm
- Mobil test için: Expo Go / dev client (telefon)

## Kurulum

```bash
git clone <repo-url>
cd spring-trophy
```

### Veritabanı (M3)

PostgreSQL 17 Docker ile ayağa kalkar. Şifreyi kök `.env` dosyasına yaz
(`backend/.env` içindeki `DATABASE_URL` ile aynı olmalı):

```bash
cp .env.example .env    # POSTGRES_PASSWORD'u doldur
docker compose up -d
```

Şemayı kur (tekrar çalıştırmak güvenlidir, uygulanmışlar atlanır):

```bash
cd backend && npm run migrate
```

`http://localhost:3000/saglik` → `{"ok":true,"db":"ok"}` dönmeli. DB kapalıysa
sunucu çalışmaya devam eder, sağlık ucu `db:"hata"` + HTTP 503 döner.

### Backend + Simülatör (M1)

İki ayrı terminalde:

```bash
cd backend
npm install
cp .env.example .env   # PORT ve DATABASE_URL'i kendine göre ayarla
npm start
```

Simülatör backend'e **ingest** bağlantısı açar ve bu bağlantı token ister.
Önce bir token üret (kulüp id'sini tohum veriden ya da `kulupler` tablosundan
al), sonra çıkan değeri `sim/.env` içine yaz — token bir daha gösterilmez:

```bash
cd backend && npm run token-olustur -- <kulup_id> ingest "simülatör"
```

```bash
cd sim
npm install
cp .env.example .env   # BACKEND_TOKEN'ı doldur, gerekirse BACKEND_WS_URL'i değiştir
npm start
```

### Yetkilendirme

- `ws://localhost:3000/canli?rol=simulator` (ingest) → **`ingest` rollü token**
  şart; `Authorization: Bearer <token>` başlığı yoksa el sıkışma 401 ile
  reddedilir (bağlantı hiç açılmaz).
- `/api/*` → **`hakem` rollü token** şart. Bir hakem yalnızca kendi kulübünün
  kayıtlarını görür.
- `ws://localhost:3000/canli` (izleyici) ve `/saglik` → herkese açık.

Token'ın düz metni hiçbir yerde saklanmaz, veritabanında yalnızca sha256
hash'i durur. Kaybolursa kurtarılamaz; `npm run token-olustur` ile yenisi
üretilir.

Backend `ws://localhost:3000/canli` üzerinde dinler; simülatör bağlanınca
40 sahte tekne 2 saniyede bir konum yayınlamaya başlar. Bir WebSocket
istemcisiyle `ws://localhost:3000/canli` adresine bağlanırsan önce `parkur`,
ardından düzenli aralıklarla `pozisyonlar` mesajları alırsın.

### Web canlı izleme (M2)

Backend, `web/` klasörünü kendisi sunar — ayrı bir sunucu/build aracı yoktur
(maplibre-gl CDN'den gelir). Backend + simülatör çalışırken tarayıcıda aç:

```
http://localhost:3000
```

Görecekleriniz: koyu "yayın" temalı Boğaz haritası (OpenFreeMap dark, API
anahtarı gerektirmez), şamandıralar + start hattı + rüzgar göstergesi,
COG yönlü ve kontra renkli (sancak yeşil / iskele kırmızı) 40 tekne,
interpolasyonlu akıcı hareket (veri kesilirse dead reckoning), son 60 sn'lik
solan iz çizgileri ve tekneye tıklayınca canlı SOG/COG kartı. Bağlantı koparsa
sayfa 2 sn'de bir yeniden dener (sol üst rozet: CANLI / BAĞLANIYOR).

### Testler

```bash
cd sim && npm test              # hızlandırılmış fizik/rota duman testi
cd backend && npm run yuk-testi # 20 izleyici + 40 tekne yük testi
cd web && npm test              # interpolasyon / dead reckoning duman testi
```

Paketlerin kalanı (mobile/) ilgili milestone'lar tamamlandıkça buraya eklenecek.
