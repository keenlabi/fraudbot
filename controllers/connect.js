const mongoose = require('mongoose');
mongoose.connect('mongodb://labi:spectacular1@mongodb-5339-0.cloudclusters.net:10017/fraudbot?authSource=admin', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

mongoose.connection.once('open', ()=>{
    console.log('Connection to database has been made...');
}).on('error', (error)=>{
    console.log('Connection error: ', error);
})

module.exports = mongoose;