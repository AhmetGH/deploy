const express = require('express');
const router = express.Router();
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../swaggerConfig');

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerSpec));

module.exports = router;