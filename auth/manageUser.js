var pwdMgr = require('./managePasswords');
var config = require('../config');
module.exports = function(server, db){
  /*
    set upd db for unique index
  */
  db.appUsers.ensureIndex(
    { email: 1},
    { unique: true}
  );

  console.log(config.app);
  server.post("/api/v1/"+ config.app +"/auth/register", function(req, res, next){
    var user = req.params;
    console.log(user);
    pwdMgr.cryptPassword(user.password, function(err, hash){
      user.password = hash;
      console.log("n", hash);
      db.appUsers.insert(user, function(err, dbUser){
        if(err){ // duplicate key error
          res.writeHead(400, {
            'Content-Type' : 'application/json; charset=utf-8'
          });
          if(err.code == 11000){
              res.end(JSON.stringify({
                error: err,
                message: "A user with this email exists"
              }));
          }
          else{
            res.end(JSON.stringify({
              error: err,
              message: "Unknown error for now"
            }));
          }
        }
        else {
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
          });
          res.end(JSON.stringify(dbUser));
        }
      });
    });
    return next();
  });

  server.post("/api/v1/"+ config.app +"/auth/login", function(req, res, next){
    var user = req.params;
    if(user.email.trim().length == 0 || user.password.trim().length == 0){
      res.writeHead(403, {
        'Content-Type' : 'application/json; charset=utf-8'
      })
      res.end(JSON.stringify({
        error: "Invalid Credentials"
      }))
    }
    console.log("in");
    db.appUsers.findOne({
      email : req.params.email
    }, function(err, dbUser){
      pwdMgr.comparePassword(user.password, dbUser.password, function(err, isPasswordMatch){
        if(isPasswordMatch){
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
          })
          res.end(JSON.stringify(dbUser));
        }
        else{
          res.writeHead(403, {
            'Content-Type': 'application/json; charset=utf-8'
          })
          res.end(JSON.stringify({
            error: "Invalid User"
          }))
        }
      })
    })
    return next();
  })

}
