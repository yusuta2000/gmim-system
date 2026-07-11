import { describe, expect, it } from 'vitest'
import { notificationHref } from './notification-link'

const item = (title: string, type = 'info') => ({ title, type, relatedId: 'related-1' })

describe('notificationHref', () => {
  it('routes announcements, tasks and exams to their related pages', () => {
    expect(notificationHref(item('Yeni Duyuru'), 'user')).toBe('/announcements')
    expect(notificationHref(item('Yeni Görev Atandı', 'task_assigned'), 'user')).toBe('/tasks')
    expect(notificationHref(item('Gözetmenlik Ataması', 'exam_assigned'), 'user')).toBe('/calendar?domain=exams')
  })

  it('routes pending manager work to approvals', () => {
    expect(notificationHref(item('Onay Bekleyen Görev', 'task_pending'), 'admin')).toBe('/management/approvals')
    expect(notificationHref(item('Daimi Görev Değişikliği Onayı'), 'baskan')).toBe('/management/approvals')
  })

  it('does not invent a destination for informational account notices', () => {
    expect(notificationHref(item('Şifreniz Sıfırlandı', 'warning'), 'user')).toBeNull()
  })
})
