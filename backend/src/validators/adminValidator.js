const { z } = require('zod');

const updateStatusSchema = z.object({
  isActive: z.boolean({
    required_error: 'isActive boolean flag is required',
    invalid_type_error: 'isActive must be a boolean',
  }),
});

const updateRoleSchema = z.object({
  role: z.enum(['user', 'admin'], {
    required_error: 'role is required',
    invalid_type_error: "Role must be either 'user' or 'admin'",
  }),
});

const userQuerySchema = z.object({
  page: z.string().optional().default('1').transform((val) => Math.max(1, parseInt(val, 10) || 1)),
  limit: z.string().optional().default('10').transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 10))),
  search: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
  isActive: z.string().optional().transform((val) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }),
});

module.exports = {
  updateStatusSchema,
  updateRoleSchema,
  userQuerySchema,
};
