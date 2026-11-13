const Note = require("../models/Note");

async function createNote(req, res, next) {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: "title and content are required" });
    }
    const note = await Note.create({ title, content, owner: req.user._id });
    res.status(201).json({ message: "Note created successfully", note });
  } catch (error) {
    next(error);
  }
}

async function getNotes(req, res, next) {
  try {
    const notes = await Note.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json({ count: notes.length, notes });
  } catch (error) {
    next(error);
  }
}

async function getNoteById(req, res, next) {
  try {
    const note = await Note.findOne({ _id: req.params.id, owner: req.user._id });
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json({ note });
  } catch (error) {
    next(error);
  }
}

async function updateNote(req, res, next) {
  try {
    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.content !== undefined) updates.content = req.body.content;
    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "Provide title or content to update" });
    }

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      updates,
      { new: true, runValidators: true }
    );
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json({ message: "Note updated successfully", note });
  } catch (error) {
    next(error);
  }
}

async function deleteNote(req, res, next) {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json({ message: "Note deleted successfully", id: note._id });
  } catch (error) {
    next(error);
  }
}

module.exports = { createNote, getNotes, getNoteById, updateNote, deleteNote };
