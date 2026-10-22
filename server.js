'use strict';

/**
 * DVARY WEB - pairing website for Render.
 * Stores NOTHING: no sessions, no database, no files. It only asks the bot server
 * (BOT_API_URL, on Pterodactyl) for a pairing code. All WhatsApp sessions live on the
 * bot server's disk (data/auth).
 */

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { callBot, configured, cleanPhone } = require('./lib/botClient');

const app = express();
app.set('trust proxy', 1); // Render puts a proxy in front

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '2kb' }));

const limiter = (windowMin, max, message) =>
    rateLimit({
        windowMs: windowMin * 60 * 1000,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message }
    });

app.get('/health', (req, res) => {
    res.json({ ok: true, configured: configured() });
});

// get a pairing code
app.post(
    '/api/pair',
    limiter(10, 5, 'Too many tries. Wait 10 minutes and try again.'),
    async (req, res) => {
        const phone = cleanPhone(req.body && req.body.phone);
        if (!phone) {
            return res.status(400).json({ success: false, message: 'Invalid number. Use the country code, no + sign. Example: 255712345678' });
        }

        const { status, json } = await callBot('pair', phone);

        // pass on only what the page needs
        if (json && json.success) {
            return res.status(200).json({ success: true, code: json.code, sessionId: json.sessionId, expiresIn: json.expiresIn || 120 });
        }
        return res.status(status >= 400 ? status : 502).json({ success: false, message: (json && json.message) || 'Pairing failed. Try again.' });
    }
);

// is the number linked yet?
app.get(
    '/api/status/:id',
    limiter(10, 250, 'Too many requests.'),
    async (req, res) => {
        const id = String(req.params.id || '');
        if (!/^[A-Za-z0-9_-]{6,80}$/.test(id)) {
            return res.status(400).json({ success: false, message: 'Invalid session id' });
        }
        const { status, json } = await callBot('status', id);
        if (json && json.success) {
            return res.json({ success: true, status: json.status, connected: !!json.connected });
        }
        return res.status(status >= 400 ? status : 502).json({ success: false, message: (json && json.message) || 'Could not check.' });
    }
);

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[DVARY WEB] listening on ${PORT}`);
    if (!configured()) {
        console.warn('[DVARY WEB] WARNING: set BOT_API_URL and REMOTE_API_SECRET (16+ characters) in the environment.');
    }
});
