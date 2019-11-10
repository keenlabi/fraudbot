$(document).ready(()=>{

    setInterval(fetchMessages, 1000);

    function fetchMessages(){
        $.ajax({
            type: 'GET',
            url: '/getmessages',
            dataType: 'json',
            success: function(data){
                $('div.message_box').html('') 
                
                var messagesOnScreen = [],
                 allTexts = data.text;

                  var userId = data.sessionUser;
                  var clientId = data.sessionClient;

                for(var i = 0; i < allTexts.length; i++){
                    
                    if(allTexts[i].from == userId.name){
                        var textsent = '<div class="text_sent">\
                                                <div class="text">' +
                                                    allTexts[i].content
                                              + '</div>\
                                            </div>';

                        messagesOnScreen.push(textsent);
                        // $('div.message_box').append(textsent)
                    }
                    else{
                        var textreceived = '<div class="text_received">\
                                                        <div class="text">'+
                                                            allTexts[i].content
                                                        + '</div>\
                                                    </div>';

                        // $('div.message_box').append(textreceived)
                        messagesOnScreen.push(textreceived);
                    }
                }

                
                for(var i = 0; i < messagesOnScreen.length; i++){
                    $('div.message_box').append(messagesOnScreen[i]);            
                }

                if(data.clientFraudLevel == 'innocent'){
                    
                } else if(data.clientFraudLevel == 'unsure'){
                     var unsure = "Hmm... there's something not quite right about this user. ";
                    $('div.bot_message_text').html(unsure)
                } else if(data.clientFraudLevel == 'suspect'){
                     var suspect = "I'm suspecting this user to be a fraudster.";
                    $('div.bot_message_text').html(suspect)
                } else if(data.clientFraudLevel == 'busted'){
                     var busted = "This user has been caught trying to scam you. You're advised to block immediately.";
                    $('div.bot_message_text').html(busted)
                } else{
                    console.log('Couldnt detect level');
                }
                
            },
            error: function(error){
                var errormessage = '<div class="errormsg">There was an error fetching users. Click button below. <br>\
                                            <a href="/"><button>CREATE A NEW CONNECTION</button></a>\
                                            </div>';
                $('$div.message_box').html(errormessage)
            }
        })  
    }


    $('button.sendmessage').click((event)=>{
        event.preventDefault();

        var text = $('textarea.typing_box');
        var message = JSON.stringify({message: text.val()});

        if(text.val() != ''){
            $('textarea.typing_box').val('')
            $.ajax({
                type: 'post',
                url: '/sendmessage',
                contentType: 'application/json',
                data: message,
                success: function(returnData){
                    if(returnData.status != ''){
                        $('div.sendingfail').attr('style', 'display : unset');
                    }
                },
                error:function(error){
                    var errormessage = '<div class="errormsg">There was an error sending message.<br>\
                                                    Check your connection <i class="fa fa-wifi"></i>\
                                                  </div>';
                    $('$div.message_box').html(errormessage)
                }
            })
        }
        var messageBox = document.querySelector('div.message_box');
            messageBox.scrollTo(0, messageBox.scrollHeight)
    })
})
