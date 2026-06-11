const express = require("express");

const {
  getArtists,
  getArtistById,
  createArtist,
  updateArtist,
  deleteArtist,
} = require("../controllers/artist.controller");

const router = express.Router();

router.get("/", getArtists);
router.post("/", createArtist);

router.get("/:id", getArtistById);
router.patch("/:id", updateArtist);
router.put("/:id", updateArtist);
router.delete("/:id", deleteArtist);

module.exports = router;