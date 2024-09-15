// routes/upload.js
const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/', auth, upload.single('image'), async (req, res) => {
    try {
        const result = await cloudinary.uploader.upload_stream(
            { resource_type: 'image' },
            (error, result) => {
                if (error) {
                    return res.status(500).json({ message: 'Upload to Cloudinary failed', error });
                }
                res.json({ imageUrl: result.secure_url });
            }
        ).end(req.file.buffer);
    } catch (err) {
        res.status(500).json({ message: 'Server error', err });
    }
});

module.exports = router;
