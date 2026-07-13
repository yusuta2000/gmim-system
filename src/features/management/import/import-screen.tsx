'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, AlertTriangle, CheckCircle2, Database, FileSpreadsheet, LoaderCircle, RefreshCw, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { usePortalContext } from '@/components/app-shell/portal-context'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type PreviewRow = { rowNumber: number; status: string; message: string | null; raw: Record<string, unknown> }
type Preview = { fileHash: string; type: 'tasks' | 'exams'; rows: PreviewRow[]; warnings: Array<{ rowNumber: number; message: string }> }

async function sendImport(file: File, type: string, department: string, mode: 'preview' | 'commit', previewHash?: string) {
  const form = new FormData()
  form.append('file', file); form.append('type', type); form.append('department', department); form.append('mode', mode)
  if (previewHash) form.append('previewHash', previewHash)
  const response = await fetch('/api/import-excel', { method: 'POST', body: form })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || data.error || 'Dosya işlenemedi')
  return data
}

export function ImportScreen() {
  const { department } = usePortalContext()
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [type, setType] = useState<'tasks' | 'exams'>('tasks')
  const [preview, setPreview] = useState<Preview | null>(null)
  const previewMutation = useMutation({ mutationFn: () => sendImport(file as File, type, department, 'preview') as Promise<Preview>, onSuccess: setPreview, onError: (error) => toast.error(error.message) })
  const commitMutation = useMutation({
    mutationFn: () => sendImport(file as File, type, department, 'commit', preview?.fileHash),
    onSuccess: async (data) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['tasks', department] }), queryClient.invalidateQueries({ queryKey: ['calendar', department] }), queryClient.invalidateQueries({ queryKey: ['points', department] })])
      toast.success(data.message); setFile(null); setPreview(null)
    },
    onError: (error) => toast.error(error.message),
  })
  const hasErrors = preview?.rows.some((row) => row.status === 'error') ?? false

  return <div className="space-y-6"><header><h1 className="text-2xl font-semibold tracking-tight">Veri aktarımı</h1><p className="mt-1 text-sm text-text-secondary">CSV veya XLSX dosyasını önce önizleyin; yalnız doğrulanmış önizleme içe aktarılabilir.</p></header><Card><CardHeader><CardTitle className="text-lg">Dosya seçimi</CardTitle><CardDescription>En fazla 2 MB ve 1000 veri satırı.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-[220px_1fr_auto]"><div className="space-y-2"><Label htmlFor="import-type">Kayıt türü</Label><Select value={type} onValueChange={(value: 'tasks' | 'exams') => { setType(value); setPreview(null) }}><SelectTrigger id="import-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tasks">Görevler</SelectItem><SelectItem value="exams">Sınavlar</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="import-file">CSV veya XLSX dosyası</Label><Input id="import-file" type="file" accept=".csv,.xlsx" onChange={(event) => { setFile(event.target.files?.[0] || null); setPreview(null) }} /></div><Button className="min-h-11 self-end gap-2" disabled={!file || previewMutation.isPending} onClick={() => previewMutation.mutate()}>{previewMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}Önizle</Button></CardContent></Card>
  {preview && <Card><CardHeader><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-lg">Önizleme</CardTitle><CardDescription>{preview.rows.length} satır · {department}</CardDescription></div><Badge variant={hasErrors ? 'destructive' : 'secondary'} className="w-fit gap-1">{hasErrors ? <AlertCircle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}{hasErrors ? 'Düzeltme gerekli' : 'Aktarıma hazır'}</Badge></div></CardHeader><CardContent className="space-y-4">{preview.warnings.length > 0 && <Alert><AlertCircle className="size-4" /><AlertTitle>Uyarılar</AlertTitle><AlertDescription>{preview.warnings.map((warning) => `Satır ${warning.rowNumber}: ${warning.message}`).join(' · ')}</AlertDescription></Alert>}<div className="space-y-2">{preview.rows.map((row) => <div key={row.rowNumber} className="rounded-lg border border-border p-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">Satır {row.rowNumber}</span><Badge variant={row.status === 'error' ? 'destructive' : 'outline'}>{row.status === 'error' ? 'Hatalı' : 'Hazır'}</Badge></div>{row.message && <p role="alert" className="mt-2 text-sm text-destructive">{row.message}</p>}<dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">{Object.entries(row.raw).filter(([key]) => key !== 'rowNumber').map(([key, value]) => <div key={key} className="flex gap-1"><dt className="font-medium">{key}:</dt><dd>{value instanceof Date ? value.toLocaleDateString('tr-TR') : String(value ?? '—')}</dd></div>)}</dl></div>)}</div><div className="flex justify-end"><Button className="min-h-11 gap-2" disabled={hasErrors || commitMutation.isPending} onClick={() => commitMutation.mutate()}>{commitMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}Önizlemeyi içe aktar</Button></div></CardContent></Card>}
  <WorkbookSyncCard department={department} />
  </div>
}

type WorkbookPerson = { assistantId: string; name: string; sheet: string; newCount: number; newPoints: number; curCount: number; curPoints: number; curTotalPoints: number }
type WorkbookPreview = { fileHash: string; department: string; people: WorkbookPerson[]; totalTasks: number; totalPoints: number; unmatchedSheets: string[]; ambiguousSheets: string[]; orphansWithTasks: string[] }

async function sendWorkbook(file: File, department: string, mode: 'preview' | 'commit', previewHash?: string) {
  const form = new FormData()
  form.append('file', file); form.append('department', department); form.append('mode', mode)
  if (previewHash) form.append('previewHash', previewHash)
  const response = await fetch('/api/sync-workbook', { method: 'POST', body: form })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || data.error || 'Dosya işlenemedi')
  return data
}

function WorkbookSyncCard({ department }: { department: string }) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<WorkbookPreview | null>(null)
  const previewMutation = useMutation({ mutationFn: () => sendWorkbook(file as File, department, 'preview') as Promise<WorkbookPreview>, onSuccess: setPreview, onError: (error) => toast.error(error.message) })
  const commitMutation = useMutation({
    mutationFn: () => sendWorkbook(file as File, department, 'commit', preview?.fileHash),
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks', department] }),
        queryClient.invalidateQueries({ queryKey: ['points', department] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', department] }),
        queryClient.invalidateQueries({ queryKey: ['calendar', department] }),
      ])
      toast.success(data.message); setFile(null); setPreview(null)
    },
    onError: (error) => toast.error(error.message),
  })
  const blocked = (preview?.orphansWithTasks.length ?? 0) > 0

  return <Card className="border-amber-500/40">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg"><Database className="size-5" />Ana takip dosyası ile tam senkron</CardTitle>
      <CardDescription>15 sayfalık ana takip Excel'ini yükleyin. Kişi sayfaları okunur, önizleme sonrası onayla bu bölümün <strong>tüm görevleri</strong> Excel ile değiştirilir ve puanlar yeniden hesaplanır.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <Alert><AlertTriangle className="size-4" /><AlertTitle>Dikkat: tam yeniden-eşitleme</AlertTitle><AlertDescription>Bu işlem <strong>{department}</strong> bölümünün mevcut tüm görevlerini siler ve Excel'dekilerle değiştirir. Arayüzden girilmiş ama Excel'de olmayan görevler kaybolur. Excel her zaman ana kaynak olmalıdır.</AlertDescription></Alert>
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="space-y-2"><Label htmlFor="wb-file">Ana takip XLSX dosyası</Label><Input id="wb-file" type="file" accept=".xlsx" onChange={(event) => { setFile(event.target.files?.[0] || null); setPreview(null) }} /></div>
        <Button className="min-h-11 self-end gap-2" disabled={!file || previewMutation.isPending} onClick={() => previewMutation.mutate()}>{previewMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}Önizle</Button>
      </div>
      {preview && <div className="space-y-4">
        {preview.orphansWithTasks.length > 0 && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>Senkron engellendi</AlertTitle><AlertDescription>Şu kişilerin Excel sayfası eşleşmedi ama sistemde görevleri var (silinip geri yüklenemez): {preview.orphansWithTasks.join(', ')}. Excel sayfa adlarını kontrol edin.</AlertDescription></Alert>}
        {(preview.ambiguousSheets.length > 0) && <Alert><AlertCircle className="size-4" /><AlertTitle>Belirsiz sayfa</AlertTitle><AlertDescription>Birden fazla kişiye uyan sayfa(lar) atlandı: {preview.ambiguousSheets.join(', ')}</AlertDescription></Alert>}
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-text-secondary"><th className="py-2 pr-4 font-medium">Kişi</th><th className="py-2 pr-4 font-medium">Excel (görev/puan)</th><th className="py-2 pr-4 font-medium">Mevcut (görev/puan)</th><th className="py-2 font-medium">Puan (önce → sonra)</th></tr></thead><tbody>
          {preview.people.map((p) => <tr key={p.assistantId} className="border-b border-border/50"><td className="py-2 pr-4 font-medium">{p.name}</td><td className="py-2 pr-4">{p.newCount} / {p.newPoints}</td><td className="py-2 pr-4 text-text-secondary">{p.curCount} / {p.curPoints}</td><td className="py-2 font-semibold">{p.curTotalPoints} → {p.newPoints}</td></tr>)}
        </tbody></table></div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-text-secondary">Toplam: {preview.totalTasks} görev · {preview.totalPoints} puan{preview.unmatchedSheets.length ? ` · atlanan sayfa: ${preview.unmatchedSheets.length}` : ''}</span>
          <Button variant="destructive" className="min-h-11 gap-2" disabled={blocked || commitMutation.isPending} onClick={() => commitMutation.mutate()}>{commitMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}Senkronize et ({department})</Button>
        </div>
      </div>}
    </CardContent>
  </Card>
}
