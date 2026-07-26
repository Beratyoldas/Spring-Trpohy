// HTTP/WS kimlik doğrulama: "Authorization: Bearer <token>" başlığını çözer,
// rol kontrolü yapan Express middleware'i üretir.
import { tokenDogrula } from './token.js';

/** "Bearer abc" -> "abc"; başlık yoksa veya biçim yanlışsa null. */
export function bearerCoz(authorizationBasligi) {
  if (!authorizationBasligi) return null;
  const [sema, deger] = authorizationBasligi.split(' ');
  if (!deger || sema.toLowerCase() !== 'bearer') return null;
  return deger;
}

/** Authorization başlığından kimlik çıkarır: { kulupId, rol } veya null. */
export function basliktanKimlik(authorizationBasligi) {
  return tokenDogrula(bearerCoz(authorizationBasligi));
}

/**
 * Belirtilen role sahip geçerli token şart koşan middleware.
 * 401 = kim olduğun belli değil, 403 = kim olduğun belli ama bu iş senin değil.
 * Başarılıysa req.kimlik = { kulupId, rol }.
 */
export function gerekliRol(rol) {
  return async (req, res, next) => {
    let kimlik;
    try {
      kimlik = await basliktanKimlik(req.headers.authorization);
    } catch (hata) {
      // DB'ye ulaşılamıyor: token'ın kötü olduğunu söylemek yanıltıcı olur
      console.error('[kimlik] doğrulama yapılamadı:', hata.message);
      return res.status(503).json({ hata: 'kimlik doğrulanamadı' });
    }
    if (!kimlik) return res.status(401).json({ hata: 'geçersiz veya eksik token' });
    if (kimlik.rol !== rol) return res.status(403).json({ hata: 'bu işlem için yetkin yok' });
    req.kimlik = kimlik;
    next();
  };
}
