const express = require("express");
const {
  createNote, getNotes, getNoteById, updateNote, deleteNote
} = require("../controllers/noteController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Every Notes API route requires a valid JWT.
router.use(protect);

router.route("/")
  .post(createNote)
  .get(getNotes);

router.route("/:id")
  .get(getNoteById)
  .put(updateNote)
  .delete(deleteNote);

module.exports = router;
