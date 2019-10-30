const text = require('./text');
const dictionaries = require('./botdictionary');
const users = require('./users');
const session = require('express-session');

module.exports = (app)=>{

    app.use(session({
        secret: "Keeey",
        resave: false,
        saveUninitialized: true
    }));


    //Authentication code, at the end of the process 
    //user and recipient connection would be made

    app.get("/connect", (req, res)=>{
        res.render('connect', {
            msg: '',
            nouser: '',
            noclient: '',
            signinas: '',
            connectwith: ''
        });
    });

    app.post("/connect", (req, res)=>{
        users.findOne({name: req.body.signinas.toLowerCase()}, (err, foundUser)=>{
            if(err){
                res.render('connect', {
                    msg: 'There was a problem getting your data. Please Try again.',
                    nouser: '',
                    noclient: '',
                    signinas: req.body.signinas,
                    connectwith: req.body.connectwith
                });
            } else if(!foundUser){
                res.render('connect', {
                    msg: '',
                    nouser: 'Account for this user has not been created!',
                    noclient: '',
                    signinas: req.body.signinas,
                    connectwith: req.body.connectwith
                })
            } else if(foundUser){
                users.findOne({name: req.body.connectwith.toLowerCase()}, (err, foundClient)=>{
                    if(err){
                        res.render('connect', {
                            msg: 'There was a problem getting your data. Please Try again.',
                            nouser: '',
                            noclient: '',
                            signinas: req.body.signinas,
                            connectwith: req.body.connectwith
                        });
                    } else if (!foundClient){
                        res.render('connect', {
                            msg: '',
                            nouser: '',
                            noclient: 'Account for this user has not been created!',
                            signinas: req.body.signinas,
                            connectwith: req.body.connectwith
                        });
                    } else if(foundClient){
                        console.log('Connection between ', foundUser.name ,' and ', foundClient.name ,' has been established.')
                        req.session.user = foundUser;
                        req.session.client = foundClient;
                        
                        res.redirect('/');
                    }
                })
            }
        })
    });

    app.get('/disconnect', (req, res)=>{
        if(req.session.destroy()){
            res.redirect('/connect')
        }
    })

    app.post('/createaccount', (req, res)=>{
        if(req.session.user != null){
            var newUser = users();
            newUser.name = req.body.newuser.toLowerCase()
            newUser.fraudlevel = 'innocent';

            newUser.save((err, saved)=>{
                if(err){
                    res.render('signup',{
                        msg: 'There\'s something wrong with the connection, try again!' 
                    });
                }else if(saved){
                    res.redirect('/users');
                }
            })
        } else {
            res.redirect('/');
        }
    })


    //Chat Page loads once connection has been established

   app.get('/', (req, res)=>{
        if(req.session.user != null){
            res.render('chatroom', {
                sessionClient: req.session.client,
                sessionUser: req.session.user,
                });
        } else {
            res.redirect('/connect')
        }
   });

   var fraud_keywords = [];
   dictionaries.find({}, (err, keywords)=>{
        if(err){
            res.redirect('/disconnect')
        } else {
            fraud_keywords = keywords;
        }
   })

   var is_fraud_count = 0; 
   var detected = [];

   function fraud_detect(message){ 
        var statement = message.toLowerCase();

        for(var i = 0; i < fraud_keywords.length; i++){
            if(statement.includes(fraud_keywords[i].content) > 0 ){
                detected.push(fraud_keywords[i].content);
            }
        }
    }


   app.get('/getmessages', (req, res)=>{
        text.find({
            $and: [
                {$or : [ {from: req.session.user.name}, {from: req.session.client.name} ] },
                {$or : [ {to: req.session.user.name}, {to: req.session.client.name} ] }
            ]
        }, (err, foundData)=>{
            if(err){
                res.send({status: 'Couldn\'t get messages.. '})
            }
            else if(foundData){
                for(var i = 0; i < foundData.length; i++){
                    if(foundData[i].from == req.session.client.name){
                        fraud_detect(foundData[i].content);
                    }   
                }
                var allData, user_status;

                is_fraud_count = detected.length;

                if(is_fraud_count == 0 || is_fraud_count <= 3){
                    detected = []
                    user_status = 'innocent';
                }
                else if(is_fraud_count >= 4 &&  is_fraud_count <= 6){
                    detected = []
                    user_status = 'unsure';
                }
                else if(is_fraud_count >= 7 &&  is_fraud_count <= 9){
                    detected = []
                    user_status = 'suspect';
                }
                else if(is_fraud_count > 9){
                    detected = []
                    user_status = 'busted';
                }

                users.findOne({name: req.session.client.name}, (err, clientData)=>{
                    if(err){
                        res.redirect('/disconnect')
                    }
                    if(!clientData){
                        res.redirect('/disconnect')
                    }
                    if(clientData){
                        clientData.fraudlevel = user_status;
                        clientData.save((err, updated)=>{
                            if(err){
                                res.redirect('/disconnect')
                            } else if(updated){
                                allData = {
                                    sessionClient: req.session.client,
                                    sessionUser: req.session.user,
                                    text: foundData
                                }

                                res.send(allData);
                            }
                        })
                    }
                })

            }
        })
   });

   app.post('/sendmessage', (req, res)=>{
        const newText = text();
        newText.content = req.body.message;
        newText.from = req.session.user.name;
        newText.to = req.session.client.name;

        newText.save((err, saved)=>{
            if(err){
                res.send({status: 'There\'s was an error sending your text. Check your connection.'})
            }
            if(saved){
                res.send({status: ''})
                console.log(req.session.user.name, "has sent a message to", req.session.client.name, '.')
            }
        })
    });

   app.get('/refresh', (req, res)=>{
        text.remove({
            $and: [
                {$or : [ {from: req.session.user.name}, {from: req.session.client.name} ] },
                {$or : [ {to: req.session.user.name}, {to: req.session.client.name} ] }
            ]
        }, (err)=>{
            if(err){
                res.render('index', {
                    msg: 'Unable to refresh chat.'
                });
            }else{
                is_fraud_count = 0;
                res.redirect('/');
            }
        })
   })

    app.get("/users", (req, res)=>{
        if(req.session.user != null) {
            if(req.session.user.name == 'yande' || req.session.user.name == 'ireolu' ){
                users.find({}, (err, foundData)=>{
                    if(err){
                        res.render('users', {
                            msg: 'Couldn\'t fetch users..'
                        })
                    }else if(foundData){
                        res.render('users', {
                            sessionUser: req.session.user,
                            sessionClient: req.session.client,
                            user: foundData,
                            msg: ''
                        })
                    }
                })
            }
            else {
                res.redirect('/connect')
            }
         } else {
                res.redirect('/connect')
            }
    });

    app.post("/resetfraudlevel", (req, res)=>{
        if(req.session.user.name == 'ireolu' || req.session.user.name    == 'yande' ){
        users.findOne({name: req.body.usertoreset.toLowerCase()}, (err, foundUser)=>{
            if(err){
                res.render('users', {
                    msg: 'Couldn\'t fetch users..'
                })
            }else if(foundUser){
                console.log(foundUser)

                foundUser.fraudlevel = 'innocent';
                foundUser.save((err, saved)=>{
                    if(err){
                        res.render('users', {
                            msg: 'Couldn\'t fetch users..'
                        })      
                    } else if(saved){
                        res.redirect('/users')
                    }
                })
            }
        })
        } else {
            res.redirect('/connect')
        }
    })

    app.get("/bot", (req, res)=>{
        if(req.session.user != null) {
            if(req.session.user.name == 'yande' || req.session.user.name == 'ireolu' ){
            dictionaries.find({}, (err, foundData)=>{
                if(err){
                        res.render('bot', {
                            msg: 'There was an issue getting the data requested.',
                            keywords: ''
                        });
                } else {
                        if(!foundData){
                            res.render('bot', {
                                msg: 'There was an issue getting the data requested.',
                                keywords: ''
                            });
                        } else if(foundData){
                            res.render('bot', {
                                msg: '',
                                keywords: foundData,
                                sessionUser: req.session.user,
                                sessionClient: req.session.client
                            });
                        }
                }
            })
         } else {
            res.redirect('/')
         }
        } else {
            res.redirect('/')
        }
    });

    app.post("/removekeyword", (req, res)=>{
        dictionaries.deleteOne({content: req.body.a_keyword}, (err)=>{
            if(err){
                    res.render('bot', {
                        msg: 'There was an issue getting the deleting keyword.',
                        keywords: ''
                    });
            } else {
                        res.redirect('/bot');
            }
        })
    });
    
    app.post('/uploaddictionary', (req, res)=>{
    if(req.session.user.name == 'yande' || req.session.user.name == 'ireolu' ){
        dictionaries.findOne({content: req.body.newkeyword.toLowerCase()}, (err, found)=>{
            if(err){

            }
            if(found){
                dictionaries.find({}, (err, foundData)=>{
                    if(err){
                        res.render('bot', {
                            msg: 'There was an issue getting the data requested.',
                            keywords: ''
                        });
                    } else {
                        if(!foundData){
                            res.render('bot', {
                                msg: 'There was an issue getting the data requested.',
                                keywords: ''
                            });
                        } else if(foundData){
                            res.render('bot', {
                                msg: ' "' + found.content + '" ' + ' has previously been saved.',
                                keywords: foundData
                            });
                        }
                    }
                });
            }
            if(!found){
                var newToDictionary = dictionaries();
                newToDictionary.content = req.body.newkeyword.toLowerCase()

                newToDictionary.save((err, saved)=>{
                    if(err){
                        console.log(err);
                        res.render('bot', {
                            msg: 'There was an error saving new keyword.'
                        })
                    }else if(saved){
                        res.redirect('/bot')
                    }
                });
            }
        })
    } else {
        res.redirect('/bot');
    }
    });


    }