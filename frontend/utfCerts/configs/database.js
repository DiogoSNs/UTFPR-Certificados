const mongoose = require('mongoose');

mongoose.set('useFindAndModify', false);

module.exports = mongoose
	.connect(process.env.MONGODB_KEY, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		maxPoolSize: 10,
		serverSelectionTimeoutMS: 5000,
	})
	.then(() => {
		console.log('##### -- MongoDB Connect: Success\n');
	})
	.catch((err) => {
		console.log('##### -- MongoDB Connect: Error\n' + err + '\n');
	});
