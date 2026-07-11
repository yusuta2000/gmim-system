import { z } from 'zod'

export const departmentSchema = z.enum(['GMIM', 'DUIM'])

export const createExamSchema = z.object({
  courseCode: z.string().trim().min(1, 'Ders kodu gerekli').max(30),
  courseName: z.string().trim().min(1, 'Ders adı gerekli').max(160),
  instructor: z.string().trim().max(160).default(''),
  date: z.coerce.date(),
  day: z.string().trim().min(1, 'Gün gerekli').max(20),
  timeSlot: z.string().trim().regex(/^\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}$/, 'Saat aralığı 09:00-11:00 biçiminde olmalı'),
  classroom: z.string().trim().max(80).nullable().optional(),
  requiredSupervisors: z.number().int().min(1).max(20).default(1),
  notes: z.string().trim().max(500).nullable().optional(),
  department: departmentSchema.optional(),
})

export const createScheduleSchema = z.object({
  assistantId: z.string().trim().min(1),
  dayOfWeek: z.number().int().min(1).max(7),
  timeSlot: z.string().trim().regex(/^\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}$/, 'Saat aralığı 09:00-11:00 biçiminde olmalı'),
  description: z.string().trim().min(1, 'Ders veya açıklama gerekli').max(200),
})
