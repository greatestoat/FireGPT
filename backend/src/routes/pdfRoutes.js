const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pdfController = require("../controllers/pdfController");

// ✅ Create uploads folder inside backend
const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Multer config — store inside backend/uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, `pdf_${Date.now()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed"), false);
  },
});

// Routes
router.post("/upload", upload.single("pdf"), pdfController.uploadPDF);
router.post("/ask", pdfController.askQuestion);
router.get("/documents", pdfController.listDocuments);
router.delete("/documents/:docId", pdfController.deleteDocument);

module.exports = router;