-- Geliştirme tohum verisi: bir kulüp / etkinlik / yarış ve ona bağlı bir
-- 'sosis' parkur. Tüm id'ler SABİT ve her ekleme ON CONFLICT DO NOTHING —
-- migration yeniden çalıştırılsa da (ya da elle uygulansa da) çoğalmaz.
--
-- Koordinatlar ve rüzgâr sim/parkur.js AYARLAR'ından türetildi
-- (Bebek–Kandilli YER TUTUCU, rüzgâr 30°/14 kn, pist 1300 m).
-- Üst şamandıra ve start ucu noktaları sim/geo.js ileriGit() ile hesaplandı.

insert into kulupler (id, ad) values
  ('11111111-1111-4111-8111-111111111111', 'Spring Trophy')
on conflict (id) do nothing;

insert into etkinlikler (id, kulup_id, ad, tarih) values
  ('22222222-2222-4222-8222-222222222222',
   '11111111-1111-4111-8111-111111111111',
   '1. Ayak', date '2026-08-15')
on conflict (id) do nothing;

insert into yarislar (id, etkinlik_id, kulup_id, ad, durum) values
  ('33333333-3333-4333-8333-333333333333',
   '22222222-2222-4222-8222-222222222222',
   '11111111-1111-4111-8111-111111111111',
   '1. Yarış', 'hazirlik')
on conflict (id) do nothing;

-- tur_sayisi 2 → bacaklar aşağıda 4 bacak olarak açılmış halde duruyor
insert into parkurlar (id, yaris_id, tip, ruzgar_yon, ruzgar_hiz, tur_sayisi) values
  ('44444444-4444-4444-8444-444444444444',
   '33333333-3333-4333-8333-333333333333',
   'sosis', 30, 14.0, 2)
on conflict (id) do nothing;

-- Start hattı uçları: alt şamandıradan rüzgâra dik ±40 m (120° ve 300°)
insert into samandiralar (id, parkur_id, ad, rol, lat, lon) values
  ('55555555-5555-4555-8555-555555555551',
   '44444444-4444-4444-8444-444444444444',
   'Alt Şamandıra', 'donus', 41.062000, 29.047000),
  ('55555555-5555-4555-8555-555555555552',
   '44444444-4444-4444-8444-444444444444',
   'Üst Şamandıra', 'donus', 41.072113, 29.054744),
  ('55555555-5555-4555-8555-555555555553',
   '44444444-4444-4444-8444-444444444444',
   'Start Hattı Sancak Ucu', 'start_ucu', 41.061820, 29.047413),
  ('55555555-5555-4555-8555-555555555554',
   '44444444-4444-4444-8444-444444444444',
   'Start Hattı İskele Ucu', 'start_ucu', 41.062180, 29.046587)
on conflict (id) do nothing;

-- 2 tur açılmış halde: üst → alt → üst → alt, hepsi iskele dönüşlü
insert into bacaklar (id, parkur_id, sira, hedef_samandira_id, donus_yonu) values
  ('66666666-6666-4666-8666-666666666661',
   '44444444-4444-4444-8444-444444444444', 1,
   '55555555-5555-4555-8555-555555555552', 'iskele'),
  ('66666666-6666-4666-8666-666666666662',
   '44444444-4444-4444-8444-444444444444', 2,
   '55555555-5555-4555-8555-555555555551', 'iskele'),
  ('66666666-6666-4666-8666-666666666663',
   '44444444-4444-4444-8444-444444444444', 3,
   '55555555-5555-4555-8555-555555555552', 'iskele'),
  ('66666666-6666-4666-8666-666666666664',
   '44444444-4444-4444-8444-444444444444', 4,
   '55555555-5555-4555-8555-555555555551', 'iskele')
on conflict (id) do nothing;
