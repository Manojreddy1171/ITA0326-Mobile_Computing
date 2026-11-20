const path = require("path");
const fs = require("fs");
const db = require("../db");

// =====================================================
// UPLOAD MULTIPLE IMAGES FOR A CROP
// =====================================================
const uploadCropImages = (req, res) => {
    const { id } = req.params;

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({
            success: false,
            message: "No images provided for upload."
        });
    }

    // Verify crop exists
    db.query("SELECT id, image FROM crops WHERE id = ?", [id], (cropErr, crops) => {
        if (cropErr || crops.length === 0) {
            return res.status(404).json({ success: false, message: "Crop not found." });
        }

        const crop = crops[0];
        const uploadedImages = [];

        // Normalize paths and build insert query
        const insertValues = [];
        req.files.forEach((file, index) => {
            const rawPath = String(file.path || "").replace(/\\/g, "/");
            const uploadsIdx = rawPath.indexOf("uploads/");
            const webPath = uploadsIdx >= 0 ? "/" + rawPath.substring(uploadsIdx) : "/uploads/crops/" + file.filename;

            // First image becomes primary if crop has no main image
            const isPrimary = (index === 0 && (!crop.image || crop.image === "")) ? 1 : 0;
            insertValues.push([id, webPath, isPrimary]);
            uploadedImages.push({
                image_path: webPath,
                is_primary: isPrimary,
                original_name: file.originalname,
                size: file.size
            });
        });

        const insertSql = "INSERT INTO crop_images (crop_id, image_path, is_primary) VALUES ?";
        db.query(insertSql, [insertValues], (insErr, result) => {
            if (insErr) {
                console.error("Insert crop images error:", insErr);
                return res.status(500).json({ success: false, message: "Failed to record crop images." });
            }

            // Update crops.image if not already set
            if (!crop.image || crop.image === "") {
                db.query("UPDATE crops SET image = ? WHERE id = ?", [uploadedImages[0].image_path, id]);
            }

            res.status(201).json({
                success: true,
                message: `${uploadedImages.length} image(s) uploaded successfully.`,
                images: uploadedImages
            });
        });
    });
};

// =====================================================
// GET ALL IMAGES FOR A CROP
// =====================================================
const getCropImages = (req, res) => {
    const { id } = req.params;

    db.query(
        "SELECT id, crop_id, image_path, is_primary, created_at FROM crop_images WHERE crop_id = ? ORDER BY is_primary DESC, id ASC",
        [id],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Failed to fetch images." });
            }
            res.json({ success: true, images: rows });
        }
    );
};

// =====================================================
// SET PRIMARY IMAGE FOR A CROP
// =====================================================
const setPrimaryImage = (req, res) => {
    const { id, imageId } = req.params;

    db.query("SELECT * FROM crop_images WHERE id = ? AND crop_id = ?", [imageId, id], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).json({ success: false, message: "Image not found." });
        }

        const targetImage = rows[0];

        // Reset all to 0, then set target to 1
        db.query("UPDATE crop_images SET is_primary = 0 WHERE crop_id = ?", [id], () => {
            db.query("UPDATE crop_images SET is_primary = 1 WHERE id = ?", [imageId], () => {
                // Also update main crops.image column
                db.query("UPDATE crops SET image = ? WHERE id = ?", [targetImage.image_path, id]);

                res.json({
                    success: true,
                    message: "Primary image updated successfully.",
                    image_path: targetImage.image_path
                });
            });
        });
    });
};

// =====================================================
// DELETE A CROP IMAGE
// =====================================================
const deleteCropImage = (req, res) => {
    const { id, imageId } = req.params;

    db.query("SELECT * FROM crop_images WHERE id = ? AND crop_id = ?", [imageId, id], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).json({ success: false, message: "Image not found." });
        }

        const img = rows[0];

        // Delete from database
        db.query("DELETE FROM crop_images WHERE id = ?", [imageId], () => {
            // Delete physical file if possible
            try {
                const fullDiskPath = path.join(__dirname, "../..", img.image_path);
                if (fs.existsSync(fullDiskPath)) {
                    fs.unlinkSync(fullDiskPath);
                }
            } catch (fsErr) {
                console.warn("Could not delete physical file:", fsErr.message);
            }

            // If it was primary, promote next available image
            if (img.is_primary) {
                db.query(
                    "SELECT * FROM crop_images WHERE crop_id = ? ORDER BY id ASC LIMIT 1",
                    [id],
                    (nextErr, nextRows) => {
                        if (nextRows && nextRows.length > 0) {
                            db.query("UPDATE crop_images SET is_primary = 1 WHERE id = ?", [nextRows[0].id]);
                            db.query("UPDATE crops SET image = ? WHERE id = ?", [nextRows[0].image_path, id]);
                        } else {
                            db.query("UPDATE crops SET image = NULL WHERE id = ?", [id]);
                        }
                    }
                );
            }

            res.json({ success: true, message: "Image deleted successfully." });
        });
    });
};

// =====================================================
// GENERAL SINGLE/MULTI IMAGE UPLOAD (For previews)
// =====================================================
const uploadGeneralImage = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No image file uploaded." });
    }

    const rawPath = String(req.file.path || "").replace(/\\/g, "/");
    const uploadsIdx = rawPath.indexOf("uploads/");
    const webPath = uploadsIdx >= 0 ? "/" + rawPath.substring(uploadsIdx) : "/uploads/crops/" + req.file.filename;

    res.status(201).json({
        success: true,
        message: "Image uploaded successfully.",
        image_path: webPath,
        file_name: req.file.filename,
        file_size: req.file.size
    });
};

module.exports = {
    uploadCropImages,
    getCropImages,
    setPrimaryImage,
    deleteCropImage,
    uploadGeneralImage
};
