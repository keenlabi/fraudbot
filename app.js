const express = require('express')
const app  = express();
const bodyParser = require('body-parser');

//template engine , for sending output to interface.
app.set('view engine', 'ejs');

//setup middleware for static files
app.use(express.static('./public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var controller = require('./controllers/control.js')
controller(app);

app.listen(process.env.PORT || 3000, ()=>{
    console.log('Chat Bot is running on port ' + 3000);
});