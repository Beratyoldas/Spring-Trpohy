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

Paketlerin kurulum ve çalıştırma adımları ilgili milestone tamamlandıkça
buraya eklenecek (M1'den itibaren `sim/` ve `backend/` için).
