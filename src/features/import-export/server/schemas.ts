import { z } from 'zod'

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024
export const MAX_IMPORT_ROWS = 1000

export const importTypeSchema = z.enum(['tasks', 'exams'])

export const parsedTaskRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  description: z.string().min(1),
  assistantName: z.string().min(1),
  date: z.date(),
  points: z.number().int().default(0),
  hoursWorked: z.string().nullable().default(null),
})

export const parsedExamRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  courseCode: z.string().min(1),
  courseName: z.string().min(1),
  instructor: z.string().default(''),
  date: z.date(),
  day: z.string().default(''),
  timeSlot: z.string().default(''),
  requiredSupervisors: z.number().int().positive().default(1),
})

export type ImportType = z.infer<typeof importTypeSchema>
export type ParsedTaskRow = z.infer<typeof parsedTaskRowSchema>
export type ParsedExamRow = z.infer<typeof parsedExamRowSchema>

export type ImportParseWarning = {
  rowNumber: number
  code: string
  message: string
}

export type ParsedImport =
  | { type: 'tasks'; rows: ParsedTaskRow[]; warnings: ImportParseWarning[] }
  | { type: 'exams'; rows: ParsedExamRow[]; warnings: ImportParseWarning[] }
