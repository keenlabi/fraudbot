var mongoose = require('./connect');

const userSchema = mongoose.Schema({
    name: String,
    fraudlevel: String
})

const users = mongoose.model('users', userSchema);

module.exports = users;