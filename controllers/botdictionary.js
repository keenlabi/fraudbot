var mongoose = require('./connect');

const botDictionarySchema = mongoose.Schema({
    content: String
})

const dictionaries = mongoose.model('dictionaries', botDictionarySchema);

module.exports = dictionaries;