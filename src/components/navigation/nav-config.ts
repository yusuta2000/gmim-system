import type { SessionUser } from '@/lib/auth/session-repository'

export type NavigationIcon =
  | 'dashboard'
  | 'tasks'
  | 'calendar'
  | 'announcements'
  | 'people'
  | 'approvals'
  | 'import'
  | 'categories'
  | 'periods'

export type NavigationItem = {
  id: NavigationIcon
  label: string
  href: string
  icon: NavigationIcon
  section: 'work' | 'management'
  mobile: 'primary' | 'more'
}

const workItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Ana Sayfa', href: '/dashboard', icon: 'dashboard', section: 'work', mobile: 'primary' },
  { id: 'tasks', label: 'Görevler', href: '/tasks', icon: 'tasks', section: 'work', mobile: 'primary' },
  { id: 'calendar', label: 'Takvim', href: '/calendar', icon: 'calendar', section: 'work', mobile: 'primary' },
  { id: 'announcements', label: 'Duyurular', href: '/announcements', icon: 'announcements', section: 'work', mobile: 'more' },
]

const managementItems: NavigationItem[] = [
  { id: 'people', label: 'Personel', href: '/people', icon: 'people', section: 'management', mobile: 'more' },
  { id: 'approvals', label: 'Onaylar', href: '/management/approvals', icon: 'approvals', section: 'management', mobile: 'more' },
  { id: 'import', label: 'Veri Aktarımı', href: '/management/import', icon: 'import', section: 'management', mobile: 'more' },
  { id: 'categories', label: 'Puan Baremleri', href: '/management/categories', icon: 'categories', section: 'management', mobile: 'more' },
  { id: 'periods', label: 'Dönem Yönetimi', href: '/management/periods', icon: 'periods', section: 'management', mobile: 'more' },
]

export function isManager(user: SessionUser): boolean {
  return user.role === 'admin' || user.role === 'baskan' || user.role === 'dekan'
}

export function getNavigationItems(user: SessionUser): NavigationItem[] {
  return isManager(user) ? [...workItems, ...managementItems] : [...workItems]
}

export function getPrimaryMobileItems(user: SessionUser): NavigationItem[] {
  return getNavigationItems(user).filter((item) => item.mobile === 'primary')
}

export function getMoreMobileItems(user: SessionUser): NavigationItem[] {
  return getNavigationItems(user).filter((item) => item.mobile === 'more')
}
