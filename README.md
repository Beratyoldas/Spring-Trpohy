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
Şu an `backend/`, `sim/`, `mobile/`, `web/` boş; henüz çalıştırılabilir kod yok.

## Gereksinimler

- Node.js LTS + npm
- Mobil test için: Expo Go / dev client (telefon)

## Kurulum

```bash
git clone <repo-url>
cd spring-trophy
```

### Backend + Simülatör (M1)

İki ayrı terminalde:

```bash
cd backend
npm install
cp .env.example .env   # gerekirse PORT'u değiştir
npm start
```

```bash
cd sim
npm install
cp .env.example .env   # gerekirse BACKEND_WS_URL'i değiştir
npm start
```

Backend `ws://localhost:3000/canli` üzerinde dinler; simülatör bağlanınca
40 sahte tekne 2 saniyede bir konum yayınlamaya başlar. Bir WebSocket
istemcisiyle `ws://localhost:3000/canli` adresine bağlanırsan önce `parkur`,
ardından düzenli aralıklarla `pozisyonlar` mesajları alırsın.

### Testler

```bash
cd sim && npm test              # hızlandırılmış fizik/rota duman testi
cd backend && npm run yuk-testi # 20 izleyici + 40 tekne yük testi
```

Paketlerin kalanı (mobile/, web/) ilgili milestone'lar tamamlandıkça buraya eklenecek.
