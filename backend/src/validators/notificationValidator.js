const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const notificationIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Notification ID is required' })
    .regex(objectIdRegex, 'Invalid notification ID format'),
});

const notificationQuerySchema = z.object({
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
  isRead: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
});

module.exports = {
  notificationIdParamSchema,
  notificationQuerySchema,
};
