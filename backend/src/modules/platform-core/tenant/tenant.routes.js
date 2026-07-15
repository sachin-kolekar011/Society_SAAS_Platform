const express = require('express');
const asyncHandler = require('../../../utils/asyncHandler');

const router = express.Router();

// Another small gap found while building the frontend (Phase 10): the
// login page needs to show the tenant's logo/name/colors BEFORE anyone
// logs in (see the login mockup in Phase 8). req.tenant is already
// populated by the tenant resolver middleware at this point -- this route
// just exposes the safe subset of it publicly.
router.get('/public-info', asyncHandler(async (req, res) => {
  const { id, name, slug, logoUrl, primaryColor, secondaryColor } = req.tenant;
  res.status(200).json({ success: true, data: { id, name, slug, logoUrl, primaryColor, secondaryColor } });
}));

module.exports = router;
