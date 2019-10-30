const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/fraudbot', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

mongoose.connection.once('open', ()=>{
    console.log('Connection to database has been made...');
}).on('error', (error)=>{
    console.log('Connection error: ', error);
})

module.exports = mongoose;