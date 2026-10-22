'use strict';

/**
 * Talks to the bot server (Pterodactyl). Signs every request with REMOTE_API_SECRET.
 * Pure functions (no express) so they are easy to test.
 */

const { sign } = require('./sign');

function cfg(env = process.env) {
    return {
        baseUrl: String(env.BOT_API_URL || '').trim().replace(/\/+$/, ''),
        secret: String(env.REMOTE_API_SECRET || '')
    };
}

function configured(env = process.env) {
    const c = cfg(env);
    return /^https?:\/\//i.test(c.baseUrl) && c.secret.length >= 16;
}

/**
 * action: 'pair' | 'status' | 'health'
 * returns { status, json }  (never throws)
 */
async function callBot(action, value, { env = process.env, fetchImpl = fetch, now = Date.now, timeoutMs = 55000 } = {}) {
    const { baseUrl, secret } = cfg(env);

    if (!configured(env)) {
        return { status: 503, json: { success: false, message: 'The website is not configured yet (BOT_API_URL / REMOTE_API_SECRET).' } };
    }

    const ts = String(now());
    const headers = {
        'x-timestamp': ts,
        'x-signature': sign(secret, ts, action, value),
        'content-type': 'application/json'
    };

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
        let res;
        if (action === 'pair') {
            res = await fetchImpl(`${baseUrl}/remote/pair`, {
                method: 'POST', headers, body: JSON.stringify({ phone: value }), signal: ctrl.signal
            });
        } else if (action === 'status') {
            res = await fetchImpl(`${baseUrl}/remote/status/${encodeURIComponent(value)}`, { headers, signal: ctrl.signal });
        } else {
            res = await fetchImpl(`${baseUrl}/remote/health`, { headers, signal: ctrl.signal });
        }

        let json;
        try { json = await res.json(); } catch (_) { json = { success: false, message: 'Bad answer from the bot server.' }; }

        return { status: res.status, json };
    } catch (err) {
        const timeout = err && err.name === 'AbortError';
        return {
            status: 502,
            json: { success: false, message: timeout ? 'The bot server took too long. Try again.' : 'Cannot reach the bot server. Try again in a moment.' }
        };
    } finally {
        clearTimeout(timer);
    }
}

function cleanPhone(value) {
    const phone = String(value || '').replace(/\D/g, '');
    return phone.length >= 8 && phone.length <= 15 ? phone : '';
}

module.exports = { callBot, configured, cleanPhone };
