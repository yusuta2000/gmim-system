# 2026-07-12 — Dependency audit ve doğrudan paket temizliği

## Context

Portal closeout sırasında dependency audit çıktısının runtime riski ile yalnız build/test/lint araç riskini ayırması gerekiyordu.

## Objectives

Kullanılmayan doğrudan paketleri kaldırmak, kalan advisories için erişilebilirlik sınıflandırması yapmak ve kör toplu upgrade uygulamamak.

## Starting state

Audit yollarının bir bölümü kaynak kodda tüketilmeyen editör, syntax-highlighter, hook ve chart paketlerinden geliyordu.

## Work completed

- `@mdxeditor/editor`, `react-syntax-highlighter`, `@reactuses/core`, `next-auth` ve `recharts` kaldırıldı.
- Kullanılmayan `src/components/ui/chart.tsx` wrapper'ı kaldırıldı.
- `diff`, `js-cookie`, `lodash`, `lodash-es`, `prismjs`, `uuid` ve editör tarafındaki `js-yaml` audit yolları kaldırıldı.
- Kalan advisories runtime/build/dev-only olarak sınıflandırıldı.

## Why these choices were made

Doğrudan tüketicisi olmayan paketleri kaldırmak düşük riskliydi. Prisma, ESLint, Vitest veya Next.js transitive sürümlerini override etmek ise araç zincirini bozabilirdi ve doğrulanmış production request yolu bulunmadı.

## How it was implemented

`bun audit --json`, her paket ailesi için `bun pm why <package>` ve kaynak tüketicileri için `rg` kullanıldı. `bun update --latest` veya package override uygulanmadı.

## Verification and evidence

Kalan sınıflandırma:

| Packages | Severity | Path | Classification |
|---|---|---|---|
| `defu`, `effect` | High | Prisma config/CLI | Transitive build/migration tooling |
| `flatted` | High | ESLint cache | Transitive dev-only |
| `minimatch`, `brace-expansion`, `ajv`, `@babel/core`, `js-yaml` | Low–High | ESLint/TS lint | Transitive dev-only |
| `picomatch` | Moderate–High | ESLint/Vitest/Vite | Transitive dev-only |
| `postcss@8.4.31` | Moderate | Next.js CSS build | Transitive build-time |

Temizlik sonrası test, typecheck, lint ve production build kapıları geçti.

## Data, security, and environment impact

Production verisi, şeması veya environment değerleri değiştirilmedi. Kalan advisories izlenir; doğrulanmamış “risk yok” sonucu çıkarılmaz.

## Commits and deployments

- `71f0f00` — unused portal packages kaldırıldı ve `main` dalına push edildi.

## Decisions created or superseded

Transitive paketlere kör override uygulanmaması kararı bu kayıtta tutulur.

## Remaining work and explicit blockers

Normal Prisma/Next.js/ESLint/Vitest yükseltmelerinden sonra `bun audit --json` yeniden çalıştırılmalı. Her doğrudan araç tek tek yükseltilmeli ve tam kalite kapıları zorunlu olmalı.

## Instructions for the next session

Eski audit sayısını güncel gerçek gibi kullanma. Yeni audit al, dependency yolunu ve runtime erişilebilirliğini yeniden sınıflandır; `bun update --latest` çalıştırma.

## Addenda

Yok.

