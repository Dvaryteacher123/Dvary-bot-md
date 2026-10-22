'use strict';

/**
 * Request signing between the website (Render) and the bot (Pterodactyl).
 * The secret NEVER travels over the network: every request carries a timestamp and an
 * HMAC-SHA256 signature of  "<timestamp>.<action>.<value>".
 * The bot rejects a bad signature or a timestamp older than 5 minutes.
 * (This file is identical in the bot and in the website project.)
 */

const crypto = require('crypto');

const MAX_SKEW_MS = 5 * 60 * 1000;

function sign(secret, timestamp, action, value = '') {
    return crypto
        .createHmac('sha256', String(secret))
        .update(`${timestamp}.${action}.${value}`)
        .digest('hex');
}

function verify(secret, timestamp, signature, action, value = '', now = Date.now()) {
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(now - ts) > MAX_SKEW_MS) return false;
    if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;

    const expected = Buffer.from(sign(secret, timestamp, action, value), 'hex');
    const given = Buffer.from(signature, 'hex');
    return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

module.exports = { sign, verify, MAX_SKEW_MS };
