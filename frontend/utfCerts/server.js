/* Módulos */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const app = require('./configs/app');
require('./configs/database');

const apiRouter = require('./app/routes/api.route');
const downloadRouter = require('./app/routes/download.route');
const { startTempCleanupScheduler } = require('./app/modules/quotaGuard');

const PORT = process.env.PORT || 8022;
const clientIndex = path.join(__dirname, 'client', 'dist', 'index.html');

startTempCleanupScheduler();

/* Rotas da API e download */
app.use(apiRouter);
app.use(downloadRouter);

/* SPA React (fallback para todas as rotas de navegação) */
app.get('*', (req, res) => {
	if (fs.existsSync(clientIndex)) {
		return res.sendFile(clientIndex);
	}
	res.status(503).send('Frontend build não encontrado.');
});

/* Abre o servidor na porta especificada */
app.listen(PORT, () => {
	console.log(
		'\n##### -- Server Running: Success\nLink: http://localhost:' + PORT + '\n'
	);
});
