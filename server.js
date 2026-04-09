'use strict';

const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3002;

// Allow cross-origin requests — required so webbb's canvas can read sprite pixels.
app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
    console.log(`bbstatic running on http://localhost:${PORT}`);
});
