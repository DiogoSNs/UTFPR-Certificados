/* Módulos */
const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const fs = require('fs');
const { createRateLimiter } = require('../app/modules/validators');

/* Constante */
const root = path.join(__dirname, '..');
const app = express();

app.set('trust proxy', 1);

/* Cabeçalhos básicos de segurança */
app.use((req, res, next) => {
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('X-Frame-Options', 'SAMEORIGIN');
	res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
	next();
});

/* Rate limiting para proteger o servidor e a UTFPR */
const searchLimiter = createRateLimiter({ windowMs: 60_000, max: 120 });
const downloadLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

app.use('/searchOwner/ownerSearch', searchLimiter);
app.use('/searchEvent/eventSearch', searchLimiter);
app.use('/api/owners/search', searchLimiter);
app.use('/api/events/search', searchLimiter);
app.use('/searchOwner/download', downloadLimiter);
app.use('/searchEvent/download', downloadLimiter);
app.use('/api/download', downloadLimiter);

/* Definições */
app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');
app.set('views', path.join(root, 'app/views'));

const clientDist = path.join(root, 'client', 'dist');
if (fs.existsSync(clientDist)) {
	app.use(
		'/assets',
		express.static(path.join(clientDist, 'assets'), {
			maxAge: '30d',
			immutable: true,
		})
	);
	app.use(express.static(clientDist, { maxAge: '1h' }));
}
app.use(express.static(path.join(root, 'static')));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

/* Exportação */
module.exports = app;
