const fs = require('fs');
const path = require('path');
const exphbs = require('express-handlebars');

const hbs = exphbs.create({});
const partialsDir = path.join(__dirname, '..', 'views', 'partials');

hbs.handlebars.registerPartial(
	'tableOwner',
	hbs.handlebars.compile(
		fs.readFileSync(path.join(partialsDir, 'tableOwner.handlebars'), 'utf-8')
	)
);

hbs.handlebars.registerPartial(
	'tableEvent',
	hbs.handlebars.compile(
		fs.readFileSync(path.join(partialsDir, 'tableEvent.handlebars'), 'utf-8')
	)
);

module.exports = {
	createTableOwner: (allCerts) => {
		return hbs.handlebars.partials['tableOwner'](allCerts);
	},
	createTableEvent: (allCerts) => {
		return hbs.handlebars.partials['tableEvent'](allCerts);
	},
};
