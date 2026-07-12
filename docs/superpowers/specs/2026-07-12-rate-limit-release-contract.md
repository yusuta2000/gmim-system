# Login ve AI Rate-Limit Yayın Sözleşmesi

## Kapsam

Bu sözleşme `/api/login` ve `/api/ai-classify` uçlarının kötüye kullanım sınırlarını tanımlar. Mevcut uygulamada iki uçta da üretime uygun rate limit yoktur.

## Zorunlu davranış

- Limit aşımında HTTP `429` döner.
- Yanıt gövdesi `{ "error": "RATE_LIMITED", "retryAfterSeconds": number }` biçimindedir.
- `Retry-After` başlığı gövdedeki saniye değeriyle aynıdır.
- Login anahtarı hesabın varlığını açığa çıkarmaz; normalize edilmiş e-posta ile güvenilir istemci kimliğinin tek yönlü özetinden türetilir.
- Başarısız login denemeleri pahalı Argon2 doğrulamasından önce sınırlandırılır.
- AI sınıflandırma anahtarı doğrulanmış kullanıcı kimliğine göre tutulur ve limit kontrolü LLM çağrısından önce yapılır.
- Rate-limit deposu bütün Vercel instance'ları arasında ortak ve kalıcıdır.
- Ham IP, e-posta, parola, prompt veya oturum tokenı rate-limit kaydına yazılmaz.

## Kabul testleri

- Pencere içindeki izinli istekler geçer.
- Eşik üzerindeki istek `429` ve `Retry-After` döndürür.
- Süre dolduktan sonra istek yeniden geçer.
- Login limiti aşıldığında `verifyPassword` çağrılmaz.
- AI limiti aşıldığında kategori sorgusu ve LLM istemcisi çağrılmaz.
- Aynı kullanıcının GMİM/DUİM görünüm değiştirmesi AI kotasını sıfırlamaz.
- Farklı kullanıcıların AI kotaları birbirinden ayrıdır.

## Yayın kapısı

Vercel serverless instance belleğinde tutulan sayaç üretim koruması sayılmaz. Uygulama ancak aşağıdaki ortak depolardan biri açıkça seçilip yapılandırıldıktan sonra route'lara bağlanabilir:

1. Gözden geçirilmiş migration ile PostgreSQL rate-limit tablosu.
2. Kurum tarafından onaylanmış yönetilen rate-limit/Redis servisi.

Bu depolardan hiçbiri mevcut repo veya ortamda onaylanmış değildir. Bu nedenle kabul sözleşmesi tamamlanmış, üretim uygulaması ise `shared durable storage` kapısında blokludur. Depolama sağlanmadan sahte güven veren in-memory fallback eklenmez.
