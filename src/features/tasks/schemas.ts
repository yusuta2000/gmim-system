import { z } from 'zod'

const emptyToUndefined = (value: unknown) => value === '' || value === null ? undefined : value
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-AA-GG biçiminde olmalı')

export const taskListQuerySchema = z.object({
  department: z.enum(['GMIM', 'DUIM']).optional(),
  page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
  pageSize: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(50).default(20)),
  search: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(100).optional()),
  status: z.preprocess(emptyToUndefined, z.enum(['pending', 'assigned', 'approved', 'rejected']).optional()),
  assistantId: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(100).optional()),
  categoryId: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(100).optional()),
  dateFrom: z.preprocess(emptyToUndefined, dateString.optional()),
  dateTo: z.preprocess(emptyToUndefined, dateString.optional()),
}).refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
  message: 'Başlangıç tarihi bitiş tarihinden sonra olamaz',
  path: ['dateTo'],
})

export const createTaskSchema = z.object({
  description: z.string().trim().min(3, 'Görev açıklaması en az 3 karakter olmalı').max(1000),
  date: dateString,
  assistantId: z.string().trim().min(1).max(100),
  categoryId: z.string().trim().min(1).max(100).nullable().optional(),
  hoursWorked: z.string().trim().max(100).nullable().optional(),
  points: z.coerce.number().int().min(0).max(1000).default(0),
  notes: z.string().trim().max(1000).nullable().optional(),
  kind: z.enum(['report', 'assign']).optional(),
})

export type TaskListQuery = z.infer<typeof taskListQuerySchema>
export type CreateTaskInput = z.infer<typeof createTaskSchema>
