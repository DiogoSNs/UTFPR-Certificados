const express = require('express');
const router = express.Router();
const controller = require('../controllers/api.controller');

router.get('/api/health', controller.health);
router.get('/api/overview', controller.getOverview);
router.get('/api/owners/search', controller.searchOwners);
router.get('/api/owners/:id', controller.getOwnerById);
router.get('/api/events/search', controller.searchEvents);
router.get('/api/events/:id', controller.getEventById);
router.post('/api/download', controller.prepareDownload);

module.exports = router;
