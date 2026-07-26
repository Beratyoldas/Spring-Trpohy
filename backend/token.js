// Token üretimi, hash'lenmesi ve doğrulanması.
// Düz metin token ASLA saklanmaz; veritabanında yalnızca sha256 hash'i durur.
// Token kaybolursa kurtarılamaz, yenisi üretilir.
import { createHash, randomBytes } from 'node:crypto';
import { sorgu } from './db.js';

const TOKEN_BAYT = 32; // 256 bit entropi

/** Yeni bir düz metin token üretir. Çağıran onu bir kez gösterip unutmalı. */
export function tokenUret() {
  return randomBytes(TOKEN_BAYT).toString('base64url');
}

// Neden bcrypt/argon2 değil: onlar DÜŞÜK entropili parolalar için tasarlanmış,
// kasıtlı yavaş fonksiyonlardır. Buradaki token 256 bit rastgele — kaba kuvvet
// zaten imkânsız, yavaşlatmanın kazancı yok. Üstelik sha256 DETERMİNİSTİK
// olduğu için hash doğrudan indeksten aranabiliyor; bcrypt'te her satırın tuzu
// farklı olacağından her doğrulamada tüm tabloyu taramak gerekirdi.
export function tokenHashle(token) {
  return createHash('sha256').update(token).digest('hex');
}

/** Token geçerliyse { kulupId, rol }, değilse null. */
export async function tokenDogrula(token) {
  if (!token) return null;

  const { rows } = await sorgu('select id, kulup_id, rol from tokenlar where hash = $1', [
    tokenHashle(token),
  ]);
  const kayit = rows[0];
  if (!kayit) return null;

  // Son kullanım bilgisi doğrulamayı BEKLETMEZ (her istekte bir yazma turu
  // beklemenin anlamı yok); yazılamazsa sessizce geçilir.
  sorgu('update tokenlar set son_kullanim = now() where id = $1', [kayit.id]).catch(() => {});

  return { kulupId: kayit.kulup_id, rol: kayit.rol };
}
