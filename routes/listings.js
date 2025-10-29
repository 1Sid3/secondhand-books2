const express = require('express');
const router = express.Router();
const listingsController = require('../controllers/listingsController');
const authGuard = require('../middleware/authGuard');
const { createListingValidator, searchValidator } = require('../middleware/validators');
const { upload, createThumbnails } = require('../controllers/uploadsController');

router.get('/', searchValidator, listingsController.getListings);
router.get('/:id', listingsController.getListing);
router.post('/', 
  authGuard, 
  upload.array('images', 5),
  createThumbnails,
  createListingValidator,
  listingsController.createListing
);
router.delete('/:id', authGuard, listingsController.deleteListing);

module.exports = router;
