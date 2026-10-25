const { z } = require('zod');

const createTaskSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title cannot be empty')
    .max(150, 'Title cannot exceed 150 characters'),
  description: z
    .string()
    .trim()
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional()
    .default(''),
  status: z
    .enum(['pending', 'in_progress', 'completed'], {
      invalid_type_error: "Status must be 'pending', 'in_progress', or 'completed'",
    })
    .optional()
    .default('pending'),
  priority: z
    .enum(['low', 'medium', 'high'], {
      invalid_type_error: "Priority must be 'low', 'medium', or 'high'",
    })
    .optional()
    .default('medium'),
  dueDate: z
    .string()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val) return true;
      const parsed = Date.parse(val);
      return !isNaN(parsed);
    }, {
      message: 'dueDate must be a valid date string or null',
    })
    .transform((val) => (val ? new Date(val) : null)),
});

const updateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title cannot be empty')
    .max(150, 'Title cannot exceed 150 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional(),
  status: z
    .enum(['pending', 'in_progress', 'completed'], {
      invalid_type_error: "Status must be 'pending', 'in_progress', or 'completed'",
    })
    .optional(),
  priority: z
    .enum(['low', 'medium', 'high'], {
      invalid_type_error: "Priority must be 'low', 'medium', or 'high'",
    })
    .optional(),
  dueDate: z
    .string()
    .optional()
    .nullable()
    .refine((val) => {
      if (val === undefined || val === null || val === '') return true;
      const parsed = Date.parse(val);
      return !isNaN(parsed);
    }, {
      message: 'dueDate must be a valid date string or null',
    })
    .transform((val) => (val ? new Date(val) : null)),
}).strict({
  message: 'Unexpected fields provided in task update. _id, owner, and system fields cannot be modified.',
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided to update',
});

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed'], {
    required_error: 'Status is required',
    invalid_type_error: "Status must be 'pending', 'in_progress', or 'completed'",
  }),
}).strict();

const taskQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => Math.max(1, parseInt(val, 10) || 1)),
  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 10))),
  search: z.string().trim().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  sortBy: z
    .enum(['createdAt', 'dueDate', 'priority', 'title'], {
      invalid_type_error: 'Invalid sort field. Allowed: createdAt, dueDate, priority, title',
    })
    .optional()
    .default('createdAt'),
  sortOrder: z
    .enum(['asc', 'desc'], {
      invalid_type_error: "Invalid sort order. Allowed: 'asc' or 'desc'",
    })
    .optional()
    .default('desc'),
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
  taskQuerySchema,
};
