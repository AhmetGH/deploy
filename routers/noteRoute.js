var express = require("express");
var router = express.Router();

const authMiddleware = require("../middlewares");
const noteController = require("../controllers/noteController");

module.exports = function (io) {
  router.get("/", authMiddleware, noteController.getNotesToHome);

  router.put("/publish/:noteId", authMiddleware, (req, res) => {
    noteController.publishNote(req, res, io); //pub
  });

  router.get("/my", authMiddleware, noteController.getNotesByUserId);

  router.post("/favorite", authMiddleware, (req, res) => {
    noteController.addFavorite(req, res, io);
  }); //socket fav
  router.get("/favorite", authMiddleware, noteController.getByIdFavorites);
  router.get("/read/:noteId", authMiddleware, noteController.getSingleNoteById);

  router.delete("/favorite/:noteId", authMiddleware, (req, res) => {
    noteController.deleteFavorite(req, res, io); //socket fav
  });
  router.get(
    "/edit/postEdit/:noteId",
    authMiddleware,
    noteController.getAccessOfNote
  );
  router.put("/update", (req, res) => {
    noteController.updateNote(req, res, io); //update
  });

  router.post("/create", authMiddleware, (req, res) => {
    noteController.createNote(req, res, io); //create
  });

  router.delete("/:noteId", authMiddleware, (req, res) => {
    noteController.deleteNote(req, res, io); //delete
  });

  router.get("/quill", authMiddleware, noteController.editor);

  router.get("/quill/:id", authMiddleware, noteController.getEditorById);

  router.post("/", authMiddleware, noteController.createNoteByPublic); //socket

  return router;
};
