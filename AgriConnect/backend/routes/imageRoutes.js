const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
    uploadCropImages,
    getCropImages,
    setPrimaryImage,
    deleteCropImage,
    uploadGeneralImage
} = require("../controllers/imageController");

const router = express.Router();

const uploadDir = path.join(__dirname, "../../uploads/crops");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
        const unique = `img-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
        cb(null, unique);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (allowed.includes(file.mimetype.toLowerCase()) || file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only JPEG, PNG, and WebP images are allowed."), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 5 // max 5 files
    }
});

// Single image preview / upload
router.post("/single", upload.single("image"), uploadGeneralImage);

// Crop multi-images
router.post("/crops/:id", upload.array("images", 5), uploadCropImages);
router.post("/crops/:id/upload", upload.array("images", 5), uploadCropImages);
router.get("/crops/:id", getCropImages);
router.get("/crop/:id", getCropImages);
router.put("/crops/:id/primary/:imageId", setPrimaryImage);
router.put("/:imageId/set-primary", (req, res, next) => {
    req.params.id = req.body.crop_id;
    return setPrimaryImage(req, res, next);
});
router.delete("/crops/:id/:imageId", deleteCropImage);
router.delete("/:imageId", (req, res, next) => {
    req.params.id = req.body.crop_id || req.query.crop_id;
    return deleteCropImage(req, res, next);
});

module.exports = router;
