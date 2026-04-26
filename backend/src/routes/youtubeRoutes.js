const express = require("express");
const router = express.Router();

const { uploadYoutube } = require("../controllers/youtubeController");

router.post("/upload", uploadYoutube);


module.exports = router;