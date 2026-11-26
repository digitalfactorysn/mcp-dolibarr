/**
 * src/utils/security.ts — Utilitaires de sécurité et d'anonymisation des données sensibles
 *
 * Masque les clés secrètes présentes dans les URLs de paiement en ligne (ex: securekey, token, hash)
 * Digital Factory Senegal — https://digitalfactory.sn
 */

export function maskPaymentUrls<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    // Si la chaîne ressemble à une URL de paiement ou contient un paramètre sensible
    if (
      obj.includes('newpayment.php') ||
      obj.includes('public/payment') ||
      obj.includes('securekey=') ||
      obj.includes('payment_url') ||
      obj.includes('onlinepayment')
    ) {
      return obj.replace(
        /([?&](?:securekey|key|token|hash|sig)=)[^&#\s]+/gi,
        '$1***MASKED***'
      ) as unknown as T;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => maskPaymentUrls(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const copy: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof val === 'string') {
        const keyLower = key.toLowerCase();
        if (
          keyLower.includes('url') ||
          keyLower.includes('payment') ||
          val.includes('securekey=') ||
          val.includes('newpayment.php') ||
          val.includes('public/payment')
        ) {
          copy[key] = val.replace(
            /([?&](?:securekey|key|token|hash|sig)=)[^&#\s]+/gi,
            '$1***MASKED***'
          );
        } else {
          copy[key] = val;
        }
      } else if (typeof val === 'object' && val !== null) {
        copy[key] = maskPaymentUrls(val);
      } else {
        copy[key] = val;
      }
    }
    return copy as T;
  }

  return obj;
}
