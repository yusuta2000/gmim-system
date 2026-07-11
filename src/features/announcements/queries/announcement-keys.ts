export const announcementKeys = {
  all: ['announcements'] as const,
  list: (department: string) => [...announcementKeys.all, department] as const,
}
