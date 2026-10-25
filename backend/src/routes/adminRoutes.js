const express = require('express');
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  updateStatusSchema,
  updateRoleSchema,
  userQuerySchema,
} = require('../validators/adminValidator');

const router = express.Router();

// Enforce both authentication and administrator role authorization
router.use(authenticate);
router.use(authorize('admin'));

router.get('/users', validate(userQuerySchema, 'query'), adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id/status', validate(updateStatusSchema, 'body'), adminController.updateUserStatus);
router.patch('/users/:id/role', validate(updateRoleSchema, 'body'), adminController.updateUserRole);

module.exports = router;
