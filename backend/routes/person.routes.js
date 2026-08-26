const express = require('express');

const {
  getRoomPeople,
  renamePerson,
  getPersonMedia,
} = require('../controllers/person.controller');

const protect = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

// Get all detected people in a room
router.get('/rooms/:roomId/people', getRoomPeople);

// Rename a detected person
router.patch('/people/:id', renamePerson);

// Get all photos containing a particular person
router.get('/people/:id/media', getPersonMedia);

module.exports = router;