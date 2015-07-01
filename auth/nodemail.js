var nodemailer = require('nodemailer');
var transport = require('nodemailer-smtp-transport');

module.exports = function(esender, erecepient, esubject, etext, ehtml){
  var smtpTransport = nodemailer.createTransport(transport({
      service: "Gmail",
      auth: {
          user: "daviesray.ornyx@gmail.com",
          pass: "Ornyxoft123$"
      }
  }));

  var mailOptions = {
    from: "BucketList ✔ <"+ esender +">", // sender address
    to: erecepient, //comma separated list of receivers
    subject: esubject, // Subject line
    text: etext, // plaintext body
    html: ehtml // html body
  }

  smtpTransport.sendMail(mailOptions, function(error, response){
    if(error){
        console.log(error);
    }else{
        console.log("Message sent: " + response.message);
    }
    // if you don't want to use this transport object anymore, uncomment following line
    smtpTransport.close(); // shut down the connection pool, no more messages
  });
}
