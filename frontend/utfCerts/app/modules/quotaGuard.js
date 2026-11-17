const fs = require('fs');
const path = require('path');
const deleteDir = require('./deleteDir');

const MAX_BATCH_CERTS = parseInt(process.env.MAX_BATCH_CERTS || '30', 10);
const MAX_CONCURRENT_ZIPS = parseInt(process.env.MAX_CONCURRENT_ZIPS || '2', 10);
const DAILY_ZIP_LIMIT = parseInt(process.env.DAILY_ZIP_LIMIT || '150', 10);
const MONTHLY_MB_LIMIT = parseInt(process.env.MONTHLY_MB_LIMIT || '45000', 10);

let activeZips = 0;

function getDateKeys() {
	const now = new Date();
	const day = now.toISOString().slice(0, 10);
	const month = day.slice(0, 7);
	return { day, month };
}

const usage = {
	dayKey: getDateKeys().day,
	monthKey: getDateKeys().month,
	dailyZips: 0,
	monthlyBytes: 0,
};

function rollWindowIfNeeded() {
	const { day, month } = getDateKeys();
	if (usage.dayKey !== day) {
		usage.dayKey = day;
		usage.dailyZips = 0;
	}
	if (usage.monthKey !== month) {
		usage.monthKey = month;
		usage.monthlyBytes = 0;
	}
}

function canStartBatchDownload() {
	rollWindowIfNeeded();

	if (usage.dailyZips >= DAILY_ZIP_LIMIT) {
		return {
			allowed: false,
			status: 429,
			message:
				'A cota diária gratuita de compactação em ZIP foi atingida hoje. Você ainda pode baixar ou validar cada certificado individualmente direto pelos botões da lista.',
		};
	}

	const monthlyMb = usage.monthlyBytes / (1024 * 1024);
	if (monthlyMb >= MONTHLY_MB_LIMIT) {
		return {
			allowed: false,
			status: 429,
			message:
				'A cota mensal de tráfego em ZIP foi atingida para manter o servidor gratuito online. Os links individuais de PDF e Validação continuam funcionando normalmente.',
		};
	}

	if (activeZips >= MAX_CONCURRENT_ZIPS) {
		return {
			allowed: false,
			status: 503,
			message:
				'O servidor está compactando outros pedidos agora. Aguarde alguns segundos e tente novamente.',
		};
	}

	return { allowed: true };
}

function enterZipSlot() {
	rollWindowIfNeeded();
	activeZips += 1;
	usage.dailyZips += 1;
}

function leaveZipSlot(zipSizeBytes = 0) {
	activeZips = Math.max(0, activeZips - 1);
	if (zipSizeBytes > 0) {
		usage.monthlyBytes += zipSizeBytes;
	}
}

function getQuotaStatus() {
	rollWindowIfNeeded();
	return {
		maxBatchCerts: MAX_BATCH_CERTS,
		activeZips,
		maxConcurrentZips: MAX_CONCURRENT_ZIPS,
		dailyZipsUsed: usage.dailyZips,
		dailyZipLimit: DAILY_ZIP_LIMIT,
		monthlyMbUsed: Math.round((usage.monthlyBytes / (1024 * 1024)) * 100) / 100,
		monthlyMbLimit: MONTHLY_MB_LIMIT,
	};
}

function cleanupStaleTempDirs(maxAgeMs = 15 * 60 * 1000) {
	const tempRoot = path.join(process.cwd(), 'uploads', 'temp');
	if (!fs.existsSync(tempRoot)) return;

	const now = Date.now();
	try {
		for (const entry of fs.readdirSync(tempRoot, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;
			const fullPath = path.join(tempRoot, entry.name);
			try {
				const stat = fs.statSync(fullPath);
				if (now - stat.mtimeMs > maxAgeMs) {
					deleteDir(fullPath);
				}
			} catch {
				// ignore individual stat errors
			}
		}
	} catch {
		// ignore readdir errors
	}
}

function startTempCleanupScheduler() {
	cleanupStaleTempDirs(0);
	setInterval(() => cleanupStaleTempDirs(), 10 * 60 * 1000).unref();
}

function createTtlCache({ maxEntries = 200, ttlMs = 5 * 60 * 1000 } = {}) {
	const store = new Map();

	return {
		get(key) {
			const entry = store.get(key);
			if (!entry) return null;
			if (Date.now() > entry.expiresAt) {
				store.delete(key);
				return null;
			}
			// refresh LRU order
			store.delete(key);
			store.set(key, entry);
			return entry.value;
		},
		set(key, value) {
			if (store.size >= maxEntries) {
				const oldestKey = store.keys().next().value;
				store.delete(oldestKey);
			}
			store.set(key, { value, expiresAt: Date.now() + ttlMs });
		},
	};
}

module.exports = {
	MAX_BATCH_CERTS,
	canStartBatchDownload,
	enterZipSlot,
	leaveZipSlot,
	getQuotaStatus,
	startTempCleanupScheduler,
	createTtlCache,
};
