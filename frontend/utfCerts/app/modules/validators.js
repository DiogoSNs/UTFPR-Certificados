const mongoose = require('mongoose');

function isValidObjectId(id) {
	return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
}

function isValidUserId(userId) {
	return typeof userId === 'string' && /^user_\d+$/.test(userId);
}

function sanitizeCertCodes(rawParam, maxItems = 99) {
	let parsed;
	try {
		parsed = JSON.parse(rawParam);
	} catch {
		return null;
	}
	if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > maxItems) {
		return null;
	}
	const valid = parsed.every(
		(code) => typeof code === 'string' && /^[A-Za-z0-9._-]+$/.test(code)
	);
	return valid ? parsed : null;
}

function escapeHtml(str) {
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function escapeJsArg(str) {
	return String(str)
		.replace(/\\/g, '\\\\')
		.replace(/'/g, "\\'")
		.replace(/"/g, '\\"')
		.replace(/\r?\n/g, ' ');
}

function createRateLimiter({ windowMs = 60_000, max = 60 } = {}) {
	const hits = new Map();

	// Periodically prune expired entries to avoid memory growth
	setInterval(() => {
		const now = Date.now();
		for (const [key, entry] of hits.entries()) {
			if (now > entry.resetAt) hits.delete(key);
		}
	}, windowMs).unref();

	return (req, res, next) => {
		const ip = req.ip || req.connection?.remoteAddress || 'unknown';
		const now = Date.now();
		let entry = hits.get(ip);

		if (!entry || now > entry.resetAt) {
			entry = { count: 1, resetAt: now + windowMs };
			hits.set(ip, entry);
			return next();
		}

		entry.count += 1;
		if (entry.count > max) {
			return res.status(429).json({
				err: true,
				message: 'Muitas requisições. Aguarde um instante e tente novamente.',
			});
		}
		return next();
	};
}

module.exports = {
	isValidObjectId,
	isValidUserId,
	sanitizeCertCodes,
	escapeHtml,
	escapeJsArg,
	createRateLimiter,
};
