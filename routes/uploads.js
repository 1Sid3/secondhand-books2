const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, '../uploads', filename);
  
  res.sendFile(filepath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Image not found' });
    }
  });
});

module.exports = router;
