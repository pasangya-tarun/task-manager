const express = require('express');
const userController = require('../controllers/userController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { updateProfileSchema } = require('../validators/userValidator');

const router = express.Router();

router.use(authenticate);

router.get('/me', userController.getProfile);
router.patch('/me', validate(updateProfileSchema, 'body'), userController.updateProfile);

module.exports = router;
