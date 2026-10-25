const express = require('express');
const taskController = require('../controllers/taskController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
  taskQuerySchema,
} = require('../validators/taskValidator');

const router = express.Router();

// Enforce authentication for all task operations
router.use(authenticate);

router.get('/stats', taskController.getStats);
router.get('/', validate(taskQuerySchema, 'query'), taskController.getTasks);
router.get('/:id', taskController.getTaskById);
router.post('/', validate(createTaskSchema, 'body'), taskController.createTask);
router.put('/:id', validate(updateTaskSchema, 'body'), taskController.updateTask);
router.patch('/:id/status', validate(updateStatusSchema, 'body'), taskController.updateStatus);
router.delete('/:id', taskController.deleteTask);

module.exports = router;
