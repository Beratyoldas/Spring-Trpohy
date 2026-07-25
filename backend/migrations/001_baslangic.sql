-- Başlangıç şeması.
-- gen_random_uuid() PostgreSQL 13+ ile çekirdekte gelir, eklenti gerekmez.

create table if not exists kulupler (
  id           uuid        primary key default gen_random_uuid(),
  ad           text        not null,
  olusturuldu  timestamptz not null default now()
);
