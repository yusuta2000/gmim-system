'use client'

import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <section className="max-w-md text-center">
        <AlertCircle aria-hidden="true" className="mx-auto size-10 text-destructive" />
        <h1 className="mt-4 text-xl font-semibold text-text-primary">Bu bölüm yüklenemedi</h1>
        <p className="mt-2 text-sm text-text-secondary">Bağlantınızı kontrol edip yeniden deneyin.</p>
        <Button className="mt-5 min-h-11" onClick={reset}>Yeniden dene</Button>
      </section>
    </main>
  )
}
