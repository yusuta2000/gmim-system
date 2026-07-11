import { z } from 'zod'
import { departmentSchema } from '@/features/calendar/schemas'

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1, 'Başlık gerekli').max(160),
  content: z.string().trim().min(1, 'İçerik gerekli').max(10_000),
  department: departmentSchema.optional(),
})

export const commentAnnouncementSchema = z.object({
  announcementId: z.string().trim().min(1),
  content: z.string().trim().min(1, 'Yorum boş olamaz').max(2_000),
})
