# 2026-07-12 — Portal program closeout ve staging rol matrisi

## Context

P00–P08 portal iyileştirme programının repository-actionable işleri, mobil taşma sorunları, tam rol/bölüm matrisi ve tekrar kullanılabilir test ortamı aynı gün kapatıldı. Eski master plan kutuları canlı durumla uyumlu değildi; bu kayıt doğrulanmış tarihsel kanıttır.

## Objectives

- Güvenlik, session, authorization, görev/dönem/import ve portal UI fazlarını tamamlamak.
- Dashboard ve görevler sayfasındaki mobil yatay taşmayı gerçekçi dar viewportlarda düzeltmek.
- GMİM/DUİM ve dört rolü production verisini kirletmeden doğrulamak.
- Kalan dış operasyonları açık release gate olarak bırakmak.

## Starting state

Repository tek `main` dalında ortak kullanılıyordu. Production Chrome oturumu yalnız GMİM kullanıcı rolünü kapsıyordu. Playwright/Chrome DevTools kurulumu istenmiyordu. Production veritabanı yazımı, migration ve credential rotation ayrı yetki gerektiriyordu.

## Work completed

- P00–P02: tracked connection material kaldırma, Vitest/typecheck/build kapıları, migration/build ayrımı, Argon2 ve HttpOnly session, merkezi rol/bölüm authorization.
- P03–P04: transactional task akışları, period guards, gerçek CSV/XLSX preview/import/rollback ve migration draft.
- P05–P07: responsive AppShell, route-based dashboard/tasks/points/calendar/announcements/people/management yüzeyleri.
- P08: erişilebilirlik, görev reddetme gerekçesi, notification yönlendirmesi ve puan önceliği açıklaması.
- Mobil dashboard ve tasks intrinsic-width taşmaları `min-w-0` containment ile düzeltildi; `/exams` hedefi `/calendar?domain=exams` oldu.
- 16-case role/department authorization matrisi ve navigation/query testleri tamamlandı.
- Literal seed parolaları kaldırıldı; environment-driven Argon2 helper eklendi.
- Kullanılmayan doğrudan bağımlılıklar kaldırıldı ve rate-limit release contract yazıldı.
- Ayrı Neon `e2e-staging` branch, ayrı `itudfportal-staging` Vercel projesi ve yedi test hesabı oluşturuldu.

## Why these choices were made

Mobil sorun global overflow gizleme ile maskelenmedi; taşan grid/flex çocukları kendi sınırlarında düzeltildi. Production rol ve veri sınırlarını test verisiyle kirletmemek için schema-only Neon branch ve ayrı deployment seçildi. Serverless ortamda in-memory rate limiter sahte güvenlik vereceği için dayanıklı store onayına kadar yalnız kabul sözleşmesi tutuldu.

## How it was implemented

Repository değişiklikleri küçük commitlere ayrıldı. Responsive source-contract testleri, tam authorization matrisi ve E2E account manifest testi eklendi. Chrome'un mevcut oturum/viewport yetenekleri kullanıldı; yeni Playwright kurulmadı. Staging hesabı parolaları ve reset SQL yalnız ignored local dosyalarda tutuldu.

## Verification and evidence

- `bun run test`: 35 dosya, 169 test geçti.
- `bun run typecheck`, `bun run lint`, `bun run build`: geçti; build 43 rota üretti.
- Yedi staging hesabının tamamı giriş yaptı.
- `user` yönetim yüzeyine erişemedi; `admin`/`baskan` kendi bölümünde kaldı; `dekan` GMİM/DUİM arasında geçti.
- Dashboard ve tasks 320, 375, 390, 768, 1024 ve 1440 px genişliklerde yatay document overflow üretmedi.
- GMİM staging kullanıcısı 2 puanlık görev gönderdi, GMİM temsilcisi onayladı ve puan 2 oldu.

## Data, security, and environment impact

Production verisi, şeması, rolü veya migration durumu değiştirilmedi. Staging test verisi izole branch'te oluşturuldu. Parola/hash/connection string commit edilmedi. Geçmişte tracked olmuş giriş ve connection bilgilerinin dış rotation/revocation durumu repository içinden doğrulanamaz.

## Commits and deployments

Temsilî commitler: `1bfc14d`, `285b979`, `0370ed2`, `8b39bae`, `ecfa242`, `9c45d7a`, `7f31b35`, `a004de2`, `5fa0e25`, `3a6f39b`, `71f0f00`, `5e746c8`, `59ba81f`, `31be35c`.

Değişiklikler `origin/main` dalına push edildi; production Vercel otomatik deployment akışı tetiklendi. Staging ayrı Vercel projesi olarak doğrulandı.

## Decisions created or superseded

- Katmanlı proje hafızası kararı: [`ADR-0001`](../../decisions/ADR-0001-project-memory-system.md).
- Eski program handoff güncel durum kaynağı olmaktan çıkarıldı; `docs/status/CURRENT.md` geçerlidir.

## Remaining work and explicit blockers

- Keyboard-only focus/dialog/live-region derin testi.
- Production Core Web Vitals için uygun DevTools aracı.
- Login/AI rate limiting için dayanıklı ortak store.
- Tarihsel credential rotation/revocation ve Neon access log doğrulaması.
- Backup-derived anonim staging üzerinde migration provası ve ayrı production-write onayı.
- Production deploy sonrası gerçek hesapla altı viewport tekrar kontrolü.

## Instructions for the next session

Önce `docs/INDEX.md`, `docs/status/CURRENT.md` ve ilgili runbook'u oku. Bu kayıttaki tamamlanmış fazları eski plan checkbox'ları nedeniyle tekrar uygulama. Rol/veri yazma testlerini production üzerinde yapma; [`staging-e2e.md`](../../runbooks/staging-e2e.md) kullan.

## Addenda

Yok.

