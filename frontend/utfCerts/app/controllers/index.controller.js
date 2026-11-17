const Event = require('../models/Event.model');
const Owner = require('../models/Owner.model');

module.exports = {
	get: async (req, res) => {
		try {
			const [eventsCount, ownersCount] = await Promise.all([
				Event.estimatedDocumentCount(),
				Owner.estimatedDocumentCount(),
			]);
			res.render('index', {
				eventsFormatted: eventsCount.toLocaleString('pt-BR'),
				ownersFormatted: ownersCount.toLocaleString('pt-BR'),
			});
		} catch {
			res.render('index', {
				eventsFormatted: '13.900+',
				ownersFormatted: '180.000+',
			});
		}
	},
};
