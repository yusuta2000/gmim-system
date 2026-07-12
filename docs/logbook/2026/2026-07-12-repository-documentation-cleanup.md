# 2026-07-12 — Repository ve dokümantasyon temizliği

## Context

Projenin kökünde canonical README/index yoktu; güncel durum ile tarihsel plan/loglar birbirine karışmıştı. Değerli eski plan ve analizler untracked kalmış, yerel araç state'i ile üretilmiş analiz/upload dosyaları proje ağacını kirletmişti. Tracked teknik doküman gerçek giriş ve veritabanı bağlantı bilgileri içeriyordu.

## Objectives

Katmanlı proje hafızasını kurmak, tarihsel kanıtı korumak, güncel durumu tek kaynağa indirmek, kök artifactleri sınıflandırmak, secret-bearing dokümantasyonu temizlemek ve yapıyı çalıştırılabilir kurallarla korumak.

## Starting state

- `README.md`, `docs/INDEX.md` ve `docs/status/CURRENT.md` yoktu.
- `docs/superpowers/logs/` hem geçmiş hem güncel durum için kullanılıyordu.
- Yedi önemli plan/spec/rapor untracked durumdaydı.
- `.impeccable/` ve `.superpowers/` yerel araç state'i untracked görünüyordu.
- Upload, local DB ve tool/AI analysis çıktıları tracked proje ağacındaydı.
- Teknik dokümantasyonda gerçek giriş ve database connection değerleri vardı.

## Work completed

- Root `README.md`, merkezi index, current status, architecture router, logbook/ADR/runbook şablonları ve AI protokolü oluşturuldu.
- Legacy program logları `docs/archive/legacy-logs/`; tamamlanmış tracked plan/spec'ler `docs/archive/completed-work/` altına taşındı.
- Daha önce untracked kalan beş güvenlik/authorization/master planı `docs/archive/legacy-plans/` altında korundu.
- Teknik analiz, hibrit UI spec'i, iki UI critique ve dört brainstorm HTML'i `docs/archive/legacy-analysis/` altında korundu.
- Staging rol talimatı `docs/runbooks/staging-e2e.md`; program closeout ve dependency audit standard logbook kayıtları oldu.
- Beş AI/analysis JSON, dokuz tool-result, yedi upload kaynağı, local SQLite DB, legacy generated DOCX ve dev PID Git'ten çıkarılıp ignored `local-*` klasörlerinde fiziksel olarak korundu.
- `.impeccable/`, `.superpowers/`, eski upload/download/tool-results/local DB ve analysis çıktı yolları ignore kurallarıyla sınırlandı.
- `SISTEM_DOKUMANTASYONU.md` içindeki gerçek rol girişleri ve database connection değerleri kaldırıldı.
- İki kullanım kılavuzu üreticisi gerçek/default giriş örnekleri üretmeyecek şekilde temizlendi; secret içeren eski DOCX tracked tree'den çıkarıldı.

## Why these choices were made

Değerli tarihsel kayıtlar silinmek yerine archive altına taşındı. Yerel veri ve üretilmiş artifactler Git'ten çıkarılırken çalışma makinesinde ignored klasörlerde korunur. Secret değerleri archive edilmez veya yeni kayıtta tekrarlanmaz.

## How it was implemented

Geçiş küçük Git commitlerine ayrıldı: giriş noktaları, AI protokolü, tarih/log/runbook taşıması, artifact/security temizliği, executable validation ve closeout.

## Verification and evidence

- Yerel credential/reset, local artifact/data/source, `.superpowers` ve `.impeccable` yollarının ignored olduğu doğrulandı.
- Repository dokümanları ve guide generatorları üzerinde gerçek database URL ve email/parola satırı taraması temiz çıktı; `.env.example` yalnız placeholder örneği olarak ayrı değerlendirildi.
- `AGENTS.md` ve `CLAUDE.md` değişiklikleri aynı uygulandı; final byte kontrolü kapanış kapısındadır.

## Data, security, and environment impact

Production verisine, şemaya, role veya environment'a yazılmadı. Repository current tree içindeki plaintext credential/connection değerleri kaldırıldı. Git geçmişindeki değerlerin dış rotation/revocation durumu doğrulanmamıştır ve açık güvenlik kapısıdır.

## Commits and deployments

- `af71835` — canonical proje giriş noktaları.
- `507eef5` — AI proje hafızası oturum protokolü.
- `eac70c4` — geçmişin logbook/runbook/archive yapısına taşınması.
- Artifact/security temizliği ve final doğrulama commitleri kapanışta eklenecektir.

## Decisions created or superseded

- [`ADR-0001 — Katmanlı proje hafızası`](../../decisions/ADR-0001-project-memory-system.md)
- `docs/superpowers/logs/` güncel durum kaynağı olmaktan çıkarıldı.

## Remaining work and explicit blockers

Documentation validator, full test/typecheck/lint/build ve Git/invariant kontrolü henüz final kapanış kapısındadır. Dış credential rotation/revocation ve Git history cleanup bu repository değişikliğinin kapsamı dışındadır.

## Instructions for the next session

Önce `README.md`, `docs/INDEX.md` ve `docs/status/CURRENT.md` dosyalarını oku. Archive dosyalarını güncel iş listesi sayma. Yerel ignored artifactleri açık kullanıcı talebi olmadan silme veya içeriğini yazdırma.

## Addenda

### 2026-07-12 — Final doğrulama ve kapanış

- `004d703` artifact sınıflandırmasını, tracked credential temizliğini ve root organizasyonunu tamamladı.
- `d4a699b` executable document/link/secret invariant doğrulamasını ekledi.
- `bun run docs:check` 0 hata ile geçti.
- `bun run test` 36 dosyada 172 test ile geçti.
- `bun run typecheck` ve `bun run lint` geçti.
- `bun run build` Next.js 16.2.10 ile 43 rota üretti.
- `AGENTS.md` ve `CLAUDE.md` byte düzeyinde eşleşti; local credential/reset ve taşınan local artifact yolları ignored kaldı.
- Repository içi proje hafızası geçişinde açık iş kalmadı. Dış credential rotation/revocation, Neon log incelemesi ve Git history cleanup ayrı operasyonlardır.
- Keyboard-only derin test, production Core Web Vitals, durable rate-limit store ve production migration provası ürün release gate'i olarak `CURRENT.md` içinde açık kalır.
