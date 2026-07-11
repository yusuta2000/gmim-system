type NotificationLinkInput = {
  title: string
  type: string
  relatedId: string | null
}

export function notificationHref(item: NotificationLinkInput, role: string) {
  const context = `${item.type} ${item.title}`.toLocaleLowerCase('tr-TR')
  const manager = role === 'admin' || role === 'baskan' || role === 'dekan'

  if (context.includes('duyuru') || context.includes('announcement')) return '/announcements'
  if (context.includes('sınav') || context.includes('gözetmen') || context.includes('exam_')) return '/calendar?domain=exams'
  if (context.includes('daimi görev')) return manager ? '/management/approvals' : null
  if (context.includes('task_pending') || context.includes('onay bekleyen görev')) return manager ? '/management/approvals' : '/tasks'
  if (context.includes('görev') || context.includes('task_')) return '/tasks'
  if (manager && (context.includes('araş gör') || context.includes('personel'))) return '/people'

  return null
}
