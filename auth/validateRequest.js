var isEmailValid = function(db, email, cb) {
  db.appUsers.findOne({email : email}, function(err, dbUser){
    cb(dbUser);
  });
}

module.exports.validate = function(req, res, db, cb){
  // if request does not have a header with email, reject the request
  if(!req.params.token){
    res.writeHead(403,{
      'Content-Type' : 'application/json; charset=utf-8'
    });
    res.end(JSON.stringify({
      error: "You are not authorized to access this application",
      message: "An email address is required as part of the header"
    }))
  }

  isEmailValid(db, req.params.token, function(user){
    if(!user){
      res.writeHead(403,{
        'Content-Type' : 'application/json; charset=utf-8'
      });
      res.end(JSON.stringify({
        error: "You are not authorized to access this application",
        message: "Invalid User Email"
      }));
    }
    else{
      cb();
    }
  })
}
