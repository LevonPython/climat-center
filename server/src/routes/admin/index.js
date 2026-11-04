const express = require('express');
const { body } = require('express-validator');

const { describeBlockTypes } = require('../../contentSchemas/blockTypes');
const { verifyToken, requireAnyRole } = require('../../middleware/auth');
const { asyncRoute, validateRequest } = require('../../middleware/validate');
const { serviceRepository } = require('../../repositories/serviceRepository');
const { adminGalleriesRouter } = require('./galleries');
const { adminMediaRouter } = require('./media');
const { adminNavigationRouter } = require('./navigation');
const { adminPagesRouter, adminSectionsRouter } = require('./pages');
const { adminTranslationsRouter } = require('./translations');

const adminRouter = express.Router();

adminRouter.use(verifyToken, requireAnyRole(['admin', 'editor']));

adminRouter.get('/schemas', (req, res) => {
  res.json({ ok: true, block_types: describeBlockTypes() });
});

adminRouter.put(
  '/services/order',
  body('ids').isArray({ min: 1 }),
  body('ids.*').isUUID(),
  validateRequest,
  asyncRoute(async (req, res) => {
    await serviceRepository.reorder(req.body.ids);
    res.json({ ok: true });
  })
);

adminRouter.use('/pages', adminPagesRouter);
adminRouter.use('/sections', adminSectionsRouter);
adminRouter.use('/navigation', adminNavigationRouter);
adminRouter.use('/media', adminMediaRouter);
adminRouter.use('/galleries', adminGalleriesRouter);
adminRouter.use('/translations', adminTranslationsRouter);

module.exports = { adminRouter };
