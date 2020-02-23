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

    app.get("/signin", (req, res)=>{
        res.render('signin', {
            msg: '',
            nouser: '',
            wrongpassword: '',
            signinas: '',
            password: '',
        });
    });

    app.post("/signin", (req, res)=>{
        users.findOne({name: req.body.signinas.toLowerCase()}, (err, foundUser)=>{
            if(err){
                res.render('signin', {
                    msg: 'There was a problem getting your data. Please Try again.',
                    nouser: '',
                    wrongpassword: '',
                    signinas: req.body.signinas,
                    password: req.body.password
                });
            } else if(!foundUser){
                res.render('signin', {
                    msg: '',
                    nouser: 'Account for this user has not been created !',
                    wrongpassword: '',
                    signinas: req.body.signinas,
                    password: req.body.password
                })
            } else if(foundUser){
                if(foundUser.password == req.body.password){
                    console.log(foundUser.name ,' has successfully logged in.');
                    req.session.user = foundUser;
                    
                    res.redirect('/users');
                }else {
                    res.render('signin', {
                        msg: '',
                        nouser: '',
                        wrongpassword: 'Password is incorrect.',
                        signinas: req.body.signinas,
                        password: req.body.password
                    });
                }
            }
        })
    });

    app.get("/users", (req, res)=>{
        if(req.session.user != null) {
                users.find({}, (err, foundData)=>{
                    if(err){
                        res.render('users', {
                            msg: 'Couldn\'t fetch users.'
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
         } else {
                res.redirect('/signin')
        }
    });

    app.get("/signup", (req, res)=>{
        res.render('signup', {
            msg: '',
            userexists: '',
            username: '',
            password: ''
        });
    });

    app.post('/createaccount', (req, res)=>{
        var userInputName = req.body.username.trim();

        users.findOne({name: userInputName.toLowerCase()}, (err, exist)=>{
            if(err){
                res.render('signup', {
                    msg: 'There was a problem saving your data. Please Try again.',
                    userexists: '',
                    username: userInputName,
                    password: req.body.password
                });
            } else if(exist){
                res.render('signup', {
                    msg: '',
                    userexists: 'User name has been taken !',
                    username: userInputName,
                    password: req.body.password
                })
            } else {
                var newUser = users();

                newUser.name = userInputName.toLowerCase()
                newUser.password = req.body.password;
                newUser.fraudLevel = 'innocent';
                newUser.userType = 'user';

                newUser.save((err, saved)=>{
                    if(err){
                        res.render('signup',{
                            msg: 'There\'s something wrong with the connection, try again!' 
                        });
                    }else if(saved){
                        console.log('New user ' + saved.name ,' has successfully logged in.');
                        req.session.user = saved;
                        
                        res.redirect('/users');
                    }else{
                        res.render('signup', {
                            msg: 'There was an error, couldn\'t save your details.. Try again ! ',
                            userexists: '',
                            username: userInputName,
                            password: req.body.password
                        });
                    }
                })
            }
        })
    })


    //Chat Page loads once connection has been established

   app.get('/chat/:name', (req, res)=>{
       if(req.session.user != null ){
           if(req.params.name != null){
                var clientName = req.params.name.slice(1, req.params.name.length)
                console.log(req.session.user.name + ' is  requesting to established a connection with ' + clientName)
        
                users.findOne({name: clientName}, (err, foundClient)=>{
                    if(err){
                        res.render('users', {
                            msg: 'There was an error connecting to ' + clientName,
                        });
                    } else if(foundClient){
                        if(foundClient.name != req.session.user.name){
                            req.session.client = foundClient;
                            console.log(req.session.user.name + ' has established a connection with ' + clientName) 
                            res.render('chatroom', {
                                sessionClient: req.session.client,
                                sessionUser: req.session.user,
                            });      
                        } else {
                            res.redirect('/users')               
                        }
                    }
                })
           } else {
                res.redirect('/users')
           }
        } else {
            res.redirect('/users')
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
            if(statement.includes(fraud_keywords[i].content)){
                detected.push(fraud_keywords[i].content);
            }
        }
    }


   app.get('/getmessages', (req, res)=>{
       if(req.session.user != null || req.session.client != null ){
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
                        clientData.fraudLevel = user_status;
                        clientData.save((err, updated)=>{
                            if(err){
                                res.redirect('/disconnect')
                            } else if(updated){
                                allData = {
                                    sessionClient: req.session.client,
                                    sessionUser: req.session.user,
                                    text: foundData,
                                    clientFraudLevel: clientData.fraudLevel


                                }

                                res.send(allData);
                            }
                        })
                    }
                })

            }
        })
       } else {
           res.redirect('/users');
       }
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

    app.get("/bot", (req, res)=>{
        if(req.session.user != null) {
            if(req.session.user.userType == 'admin'){
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
    if(req.session.user.userType == 'admin'){
        dictionaries.findOne({content: req.body.newkeyword.toLowerCase()}, (err, found)=>{
            if(err){
                res.render('bot', {
                    msg: 'There was an issue getting the data requested.',
                    keywords: ''
                });
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

    app.get("/resetfraudlevel/:name", (req, res)=>{
        var clientName = req.params.name.slice(1, req.params.name.length)

        users.findOne({name: clientName}, (err, foundUser)=>{
            if(err){
                res.render('users', {
                    msg: 'Couldn\'t fetch users..'
                })
            }else if(foundUser){
                console.log(foundUser)

                foundUser.fraudLevel = 'innocent';
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
    })

    app.get('/delete/:name', (req, res)=>{

        var clientName = req.params.name.slice(1, req.params.name.length)
        
            users.findOneAndDelete({name: clientName}, (err, deleted)=>{
                if(err){
                    res.redirect('/users');
                } else if(deleted){
                        console.log(req.session.user.name + ' has successfully deleted ' + clientName)
                        res.redirect('/users');
                }
            })
    })
    
    app.get('/signout', (req, res)=>{
        var user = req.session.user.name;
        if(req.session.destroy()){
            console.log(user + ' has signed off.');
            res.redirect('/signin')
        }
    })

    app.get('/*', (req, res)=>{
        res.redirect('/users')
    })

    }
