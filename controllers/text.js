var mongoose = require('./connect');

const textSchema = mongoose.Schema({
    content: String,
    from: String,
    to: String
})

const text = mongoose.model('texts', textSchema);

module.exports = text;