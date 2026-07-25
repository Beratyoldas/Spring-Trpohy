-- Şema v1: çok kiracılı (multi-tenant) omurga + parkur modeli.
-- Kiracı = kulüp. Zincir: kulupler -> etkinlikler -> yarislar -> parkurlar
-- -> samandiralar / bacaklar. Pozisyonlar yarışa asılır.
-- Tüm zaman alanları timestamptz; id'ler uuid (hacimli pozisyonlar hariç).

create table if not exists etkinlikler (
  id           uuid        primary key default gen_random_uuid(),
  kulup_id     uuid        not null references kulupler (id) on delete cascade,
  ad           text        not null,
  tarih        date,
  olusturuldu  timestamptz not null default now()
);

create table if not exists yarislar (
  id           uuid        primary key default gen_random_uuid(),
  etkinlik_id  uuid        not null references etkinlikler (id) on delete cascade,
  -- kulup_id BİLEREK denormalize: "bu kulübün yarışları" sorgusu
  -- etkinlikler üzerinden join zincirine girmesin.
  kulup_id     uuid        not null references kulupler (id),
  ad           text        not null,
  durum        text        not null default 'hazirlik'
                           check (durum in ('hazirlik', 'canli', 'bitti', 'iptal')),
  olusturuldu  timestamptz not null default now()
);

create table if not exists parkurlar (
  id           uuid        primary key default gen_random_uuid(),
  -- unique: yarış başına tek parkur
  yaris_id     uuid        not null unique references yarislar (id) on delete cascade,
  tip          text        not null check (tip in ('sosis', 'serbest')),
  ruzgar_yon   int         not null check (ruzgar_yon between 0 and 359),
  ruzgar_hiz   numeric(4, 1) not null,
  -- yalnızca bilgi amaçlı: bacaklar zaten turlar açılmış halde tutulur
  tur_sayisi   int         not null default 1,
  olusturuldu  timestamptz not null default now()
);

create table if not exists samandiralar (
  id           uuid        primary key default gen_random_uuid(),
  parkur_id    uuid        not null references parkurlar (id) on delete cascade,
  ad           text        not null,
  rol          text        not null check (rol in ('donus', 'start_ucu', 'finis_ucu')),
  lat          numeric(9, 6) not null,
  lon          numeric(9, 6) not null,
  olusturuldu  timestamptz not null default now()
);

-- Bacak = parkurun bir ayağı. Bacak TİPİ (orsa/apaz/serbest) BİLEREK
-- saklanmıyor: rüzgâr yönü değişince bayatlar, çalışma anında hedef
-- şamandıranın kerterizinden hesaplanır.
create table if not exists bacaklar (
  id                   uuid        primary key default gen_random_uuid(),
  parkur_id            uuid        not null references parkurlar (id) on delete cascade,
  sira                 int         not null,
  hedef_samandira_id   uuid        not null references samandiralar (id),
  -- kapı / hat hedefleri için ileriye dönük (tek şamandırada NULL)
  ikinci_samandira_id  uuid        references samandiralar (id),
  donus_yonu           text        check (donus_yonu in ('iskele', 'sancak')),
  olusturuldu          timestamptz not null default now(),
  unique (parkur_id, sira)
);

-- Hacim yüksek: uuid yerine bigserial (dar satır, sıralı index).
create table if not exists pozisyonlar (
  id           bigserial   primary key,
  yaris_id     uuid        not null references yarislar (id) on delete cascade,
  kulup_id     uuid        not null references kulupler (id),
  tekne_id     text        not null,
  lat          numeric(9, 6),
  lon          numeric(9, 6),
  cog          int,
  sog          numeric(4, 1),
  ts           timestamptz not null,
  olusturuldu  timestamptz not null default now()
);

-- Replay ve canlı sorgunun tek erişim deseni: bir yarışın zaman aralığı
create index if not exists pozisyonlar_yaris_ts_idx on pozisyonlar (yaris_id, ts);

-- Ham token asla saklanmaz, yalnızca hash'i. Doğrulama mantığı M3-3'te.
create table if not exists tokenlar (
  id            uuid        primary key default gen_random_uuid(),
  kulup_id      uuid        not null references kulupler (id) on delete cascade,
  rol           text        not null check (rol in ('hakem', 'ingest')),
  hash          text        not null,
  ad            text,
  son_kullanim  timestamptz,
  olusturuldu   timestamptz not null default now()
);
