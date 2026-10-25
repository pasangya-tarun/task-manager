const { z } = require('zod');

const updateProfileSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
}).strict({
  message: 'Only permitted profile fields (name) may be updated',
});

module.exports = {
  updateProfileSchema,
};
