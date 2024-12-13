const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const ANNOUNCEMENT_FILE = path.join(__dirname, '../data/announcement.json');

// Initialize announcement file if it doesn't exist
async function initializeAnnouncementFile() {
    try {
        await fs.access(ANNOUNCEMENT_FILE);
    } catch {
        const defaultData = { message: '', active: false };
        await fs.mkdir(path.dirname(ANNOUNCEMENT_FILE), { recursive: true });
        await fs.writeFile(ANNOUNCEMENT_FILE, JSON.stringify(defaultData));
    }
}

// Get current announcement
router.get('/', async (req, res) => {
    try {
        await initializeAnnouncementFile();
        const data = await fs.readFile(ANNOUNCEMENT_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading announcement:', error);
        res.status(500).json({ error: 'Failed to read announcement' });
    }
});

// Update announcement
router.post('/', async (req, res) => {
    try {
        const { message, active } = req.body;
        await initializeAnnouncementFile();
        await fs.writeFile(ANNOUNCEMENT_FILE, JSON.stringify({ message, active }));
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating announcement:', error);
        res.status(500).json({ error: 'Failed to update announcement' });
    }
});

module.exports = router;
