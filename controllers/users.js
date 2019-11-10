var mongoose = require('./connect');

const userSchema = mongoose.Schema({
    name: String,
    password: String,
    fraudLevel: String,
    userType: String
})

const users = mongoose.model('users', userSchema);

module.exports = users;