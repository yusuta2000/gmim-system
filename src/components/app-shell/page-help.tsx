'use client'

import { CircleHelp } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { pageHelpFor } from '@/components/app-shell/page-help-content'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export function PageHelpButton() {
  const help = pageHelpFor(usePathname())
  if (!help) return null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`${help.title} ekranı nasıl kullanılır`}>
          <CircleHelp aria-hidden="true" className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{help.title} · Nasıl kullanılır?</DialogTitle>
          <DialogDescription>Bu ekrandaki yönetim özellikleri</DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-secondary">
          {help.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
