// Duman testi: token'ın istekten çıkarılması (saf mantık, DB gerekmez).
// Çalıştır: cd backend && npm test
import { bearerCoz, istektenToken } from './kimlik.js';

let basarisiz = 0;

function esit(ad, bulunan, beklenen) {
  const gecti = bulunan === beklenen;
  console.log(`  ${gecti ? 'GECTI' : 'KALDI'}  ${ad}${gecti ? '' : ` (bulunan: ${bulunan}, beklenen: ${beklenen})`}`);
  if (!gecti) basarisiz++;
}

/** Testte gerçek URL nesnesi kullanıyoruz; sunucu.js de aynısını veriyor. */
function adres(sorguDizesi) {
  return new URL(`http://yerel/canli${sorguDizesi}`);
}

console.log('\n--- bearerCoz ---');
esit('normal Bearer', bearerCoz('Bearer abc123'), 'abc123');
esit('küçük harf şema', bearerCoz('bearer abc123'), 'abc123');
esit('başlık yok', bearerCoz(undefined), null);
esit('boş başlık', bearerCoz(''), null);
esit('şema yanlış', bearerCoz('Basic abc123'), null);
esit('değer yok', bearerCoz('Bearer'), null);

console.log('\n--- istektenToken ---');
esit('yalnız başlık', istektenToken('Bearer basliktan', adres('?rol=simulator')), 'basliktan');
esit('yalnız query', istektenToken(undefined, adres('?rol=simulator&token=queryden')), 'queryden');
// Başlık daha güvenli taşıyıcı: ikisi de varsa o kazanmalı
esit('ikisi de varsa başlık kazanır', istektenToken('Bearer basliktan', adres('?token=queryden')), 'basliktan');
esit('ikisi de yok', istektenToken(undefined, adres('?rol=simulator')), null);
esit('boş query token', istektenToken(undefined, adres('?token=')), null);
esit('url verilmemiş', istektenToken(undefined, undefined), null);
esit('bozuk başlık + geçerli query', istektenToken('Basic xyz', adres('?token=queryden')), 'queryden');

console.log(basarisiz === 0 ? '\n[kimlik] BAŞARILI\n' : `\n[kimlik] BAŞARISIZ: ${basarisiz} kontrol\n`);
process.exit(basarisiz === 0 ? 0 : 1);
