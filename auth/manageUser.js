var pwdMgr = require('./managePasswords');
var auth_functions = require('./auth_functions');
module.exports = function(server, db){
  /*
    set upd db for unique index
  */
  db.appUsers.ensureIndex(
    { email: 1},
    { unique: true}
  );

  server.post("/api/v1/bucketlist/auth/register", function(req, res, next){
    var user = req.params;
    console.log(user);
    pwdMgr.cryptPassword(user.password, function(err, hash){
      user.password = hash;
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
              message: "Possible db connection error"
            }));
          }
        }
        else {
          /* User successfully added to db. Add records to other relevant tables Profile, authCodes */
          var authCodes = {
            "userId" : dbUser._id,
            "STATUS": {
              "name": "STATUS",
              "active": false,
            },
            "ACTIVATION_CODE":{
              "name":"ACTIVATION_CODE",
              "code" : auth_functions.generateCode(4),
              "maxTrials": 3,
              "currentTrials": 0
            },
            "PASSWORD_RESET_CODE":{
              "name":"PASSWORD_RESET_CODE",
              "code" : "",
              "maxTrials": 3,
              "currentTrials": 0
            }
          }
          // Insert authCodes
          db.authCodes.insert(authCodes, function(err, dbAuthCodes){
            var profile = {
              userId : dbUser._id
            }; // Note, we add an empty profile, with just the save user _id.. This can be updated to suit your application
              // Insert Profile
            db.userProfiles.insert(profile, function(err, dbUserProfile){
              require('./nodemail')('auth@bucketlist.com', dbUser.email, "Account Activation Code", "Generated Account Activation code", "Your BucketList activation code is: <b> " + authCodes.ACTIVATION_CODE.code + " </b>");
              res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8'
              });
              res.end(JSON.stringify({
                "dbUser": dbUser,
                "message": "Activation code sent to " + dbUser.email }));
            });
          })
        }
      });
    });
    return next();
  });

  server.post("/api/v1/bucketlist/auth/send-activation-code", function(req, res, next){
    var email = req.params.email;
    if(req.params.email.trim().length == 0){
      // return with error code
      res.writeHead(403,{
        'Content-Type' : 'application/json; charset=utf-8'
      });
      res.end(JSON.stringify({
        error: "Invalid Email Address",
        message: "You have provided an Invalid Email Address"
      }))
    }
    else{
      db.appUsers.findOne({email: email}, function(err, dbUser){
        if(err || !dbUser){
          res.writeHead(403,{
            'Content-Type' : 'application/json; charset=utf-8'
          });
          res.end(JSON.stringify({
            error: "Forbidden",
            message: "You are not authorized to access this application"
          }));
        }
        else{
          db.authCodes.findOne({userId: dbUser._id}, function(err, dbAuthcode){
            if(err || !dbAuthcode){
              // Return general error
              res.writeHead(400,{
                'Content-Type' : 'application/json; charset=utf-8'
              });
              res.end(JSON.stringify({
                error: "Activation failure",
                message: "Could not Activate User. Try again later"
              }));
            }
            else{
              if(dbAuthcode.STATUS.active){
                // User is active, return with message
                res.writeHead(200, {
                  'Content-Type': 'application/json; charset=utf-8'
                });
                res.end(JSON.stringify({
                  "dbUser": dbUser,
                  "message": "User account is active!" }));
              }
              else{
                dbAuthcode.ACTIVATION_CODE.code = auth_functions.generateCode(4);
                dbAuthcode.ACTIVATION_CODE.currentTrials = 0;
                dbAuthcode.ACTIVATION_CODE.maxTrials = 3;
                // save dbAuthcode
                db.authCodes.update({_id : dbAuthcode._id}, dbAuthcode, {multi: false}, function(err, data){
                  // send email with new activation code
                  require('./nodemail')('auth@bucketlist.com', dbUser.email, "Account Activation Code", "Generated Account Activation code", "Your BucketList activation code is: <b> " + dbAuthcode.ACTIVATION_CODE.code + " </b>");
                  res.writeHead(400,{
                    'Content-Type' : 'application/json; charset=utf-8'
                  });
                  res.end(JSON.stringify({
                    error: "Activation Code Changed",
                    message: "A new code has been sent to " + dbUser.email
                  }));
                });
              }
            }
          })
        }
      })
    }
    return next();
  })

  server.post("/api/v1/bucketlist/auth/activate", function(req, res, next){
    var activeToken = req.params;
    if(req.params.email.trim().length == 0 || req.params.code.trim().length == 0){
      // return with error code
      res.writeHead(403,{
        'Content-Type' : 'application/json; charset=utf-8'
      });
      res.end(JSON.stringify({
        error: "Invalid activation token",
        message: "You have provided invalid activation tokens"
      }))
    }
    else {
      db.appUsers.findOne({email: activeToken.email}, function(err, dbUser){
        if(err || !dbUser){
          res.writeHead(403,{
            'Content-Type' : 'application/json; charset=utf-8'
          });
          res.end(JSON.stringify({
            error: "You are not authorized to access this application",
            message: "Invalid User Email"
          }));
        }
        else{
          // get db user authCodes object
          db.authCodes.findOne({userId: dbUser._id}, function(err, dbAuthcode){
            if(err){
              // Return general error
              res.writeHead(400,{
                'Content-Type' : 'application/json; charset=utf-8'
              });
              res.end(JSON.stringify({
                error: "Activation failure",
                message: "Could not Activate User. Try again later"
              }));
            }
            else{
              // check active status
              if(dbAuthcode.STATUS.active){
                // User is active, return with message
                res.writeHead(200, {
                  'Content-Type': 'application/json; charset=utf-8'
                });
                res.end(JSON.stringify({
                  "dbUser": dbUser,
                  "message": "User account is active!" }));
              }
              else if(activeToken.code != dbAuthcode.ACTIVATION_CODE.code){
                // Codes don't match..
                  // check for number of trials
                  dbAuthcode.ACTIVATION_CODE.currentTrials = dbAuthcode.ACTIVATION_CODE.currentTrials + 1;
                  if (dbAuthcode.ACTIVATION_CODE.currentTrials == dbAuthcode.ACTIVATION_CODE.maxTrials){
                    // generate new code and update activation trial counts
                    dbAuthcode.ACTIVATION_CODE.code = auth_functions.generateCode(4);
                    dbAuthcode.ACTIVATION_CODE.currentTrials = 0;
                    dbAuthcode.ACTIVATION_CODE.maxTrials = 3;
                    // save dbAuthcode
                    db.authCodes.update({_id : dbAuthcode._id}, dbAuthcode, {multi: false}, function(err, data){
                      // send email with new activation code
                      require('./nodemail')('auth@bucketlist.com', dbUser.email, "Account Activation Code", "Generated Account Activation code", "Your BucketList activation code is: <b> " + dbAuthcode.ACTIVATION_CODE.code + " </b>");
                      res.writeHead(400,{
                        'Content-Type' : 'application/json; charset=utf-8'
                      });
                      res.end(JSON.stringify({
                        error: "Activation failure",
                        message: "Invalid Activation Code. A new code has been sent to " + dbUser.email + " after " + dbAuthcode.ACTIVATION_CODE.maxTrials + " unsuccessful attempts"
                      }));
                    });
                  }
                  else {
                    // save dbAuthcode
                    db.authCodes.update({_id : dbAuthcode._id}, dbAuthcode, {multi: false}, function(err, data){
                      res.writeHead(400, {
                        'Content-Type': 'application/json; charset=utf-8'
                      });
                      res.end(JSON.stringify({
                        error: "Activation failure",
                        message: "Invalid Activation Code. " + String(dbAuthcode.ACTIVATION_CODE.maxTrials - dbAuthcode.ACTIVATION_CODE.currentTrials) + " attempts left."  }));
                    });
                  }
              }
              else{
                // Codes match..
                // modify authCode
                dbAuthcode.ACTIVATION_CODE.code = "";
                dbAuthcode.ACTIVATION_CODE.maxTrials = 0;
                dbAuthcode.ACTIVATION_CODE.currentTrials = 0;
                dbAuthcode.STATUS.active = true;
                db.authCodes.update({_id : dbAuthcode._id}, dbAuthcode, {multi: false}, function(err, data){
                  // Return success message with dbUser
                  res.writeHead(200, {
                    'Content-Type': 'application/json; charset=utf-8'
                  });
                  res.end(JSON.stringify({
                    "dbUser": dbUser,
                    "message": "Activation Successful" }));
                });

              }
            }
          })
        }
      })
    }

    return next();
  })

  server.post("/api/v1/bucketlist/auth/login", function(req, res, next){
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

  server.post("/api/v1/bucketlist/auth/send-password-reset-code", function(req, res, next){
    var email = req.params.email;
    if(req.params.email.trim().length == 0){
      // Invalid email
      res.writeHead(403,{
        'Content-Type' : 'application/json; charset=utf-8'
      });
      res.end(JSON.stringify({
        error: "Invalid Email Address",
        message: "You have provided an Invalid Email Address"
      }))
    }
    else{
      // email is valid... Check if user exists
      db.appUsers.findOne({email : email}, function(err, dbUser){
        if(err || !dbUser){
          // Invalid user
          res.writeHead(404,{
            'Content-Type' : 'application/json; charset=utf-8'
          });
          res.end(JSON.stringify({
            error: "Forbidden",
            message: "Email Address does not exist"
          }))
        }
        else{
          // valid email address
          // get auth codes
          db.authCodes.findOne({userId: dbUser._id}, function(err, dbAuthcode){
            if(err || !dbAuthcode){
              // Return general error
              res.writeHead(400,{
                'Content-Type' : 'application/json; charset=utf-8'
              });
              res.end(JSON.stringify({
                error: "Activation failure",
                message: "Could not Activate User. Try again later"
              }));
            }
            else{
              dbAuthcode.PASSWORD_RESET_CODE.code = auth_functions.generateCode(4);
              dbAuthcode.PASSWORD_RESET_CODE.currentTrials = 0;
              dbAuthcode.PASSWORD_RESET_CODE.maxTrials = 3;
              // save dbAuthcode
              db.authCodes.update({_id : dbAuthcode._id}, dbAuthcode, {multi: false}, function(err, data){
                // send email with new activation code
                require('./nodemail')('auth@bucketlist.com', dbUser.email, "Password Reset Code", "Generated Password Reset Code", "Your Password Reset Code is: <b> " + dbAuthcode.PASSWORD_RESET_CODE.code + " </b>");
                res.writeHead(400,{
                  'Content-Type' : 'application/json; charset=utf-8'
                });
                res.end(JSON.stringify({
                  error: "Password Reset Code",
                  message: "A new password reset rode has been sent to " + dbUser.email
                }));
              })
            }
          })
        }
      })
    }
  })

  server.post("/api/v1/bucketlist/auth/reset-password", function(req, res, next){
    var resetPasswordToken = req.params;
    if(req.params.email.trim().length == 0 || req.params.code.trim().length == 0 || req.params.password.trim().length == 0){
      // Invalid email
      res.writeHead(403,{
        'Content-Type' : 'application/json; charset=utf-8'
      });
      res.end(JSON.stringify({
        error: "Invalid Token",
        message: "You have provided Invalid Password Reset Token"
      }))
    }
    else{
      db.appUsers.findOne({email : resetPasswordToken.email}, function(err, dbUser){
        if(err || !dbUser){
          // Invalid user
          res.writeHead(404,{
            'Content-Type' : 'application/json; charset=utf-8'
          });
          res.end(JSON.stringify({
            error: "Forbidden",
            message: "Email Address does not exist"
          }))
        }
        else{
          // dbAuthCode
          db.authCodes.findOne({userId: dbUser._id}, function(err, dbAuthcode){
            if(err || !dbAuthcode){
              // Return general error
              res.writeHead(400,{
                'Content-Type' : 'application/json; charset=utf-8'
              });
              res.end(JSON.stringify({
                error: "Activation failure",
                message: "Could not Activate User. Try again later"
              }));
            }
            else{
              if(resetPasswordToken.code != dbAuthcode.PASSWORD_RESET_CODE.code){
                // Codes don't match..
                  // check for number of trials
                  dbAuthcode.PASSWORD_RESET_CODE.currentTrials = dbAuthcode.PASSWORD_RESET_CODE.currentTrials + 1;
                  if (dbAuthcode.PASSWORD_RESET_CODE.currentTrials == dbAuthcode.PASSWORD_RESET_CODE.maxTrials){
                    // generate new code and update activation trial counts
                    dbAuthcode.PASSWORD_RESET_CODE.code = auth_functions.generateCode(4);
                    dbAuthcode.PASSWORD_RESET_CODE.currentTrials = 0;
                    dbAuthcode.PASSWORD_RESET_CODE.maxTrials = 3;
                    // save dbAuthcode
                    db.authCodes.update({_id : dbAuthcode._id}, dbAuthcode, {multi: false}, function(err, data){
                      // send email with new activation code
                      require('./nodemail')('auth@bucketlist.com', dbUser.email, "Password Reset Code", "Generated Password Reset Code", "Your BucketList Password Reset Code is: <b> " + dbAuthcode.PASSWORD_RESET_CODE.code + " </b>");
                      res.writeHead(400,{
                        'Content-Type' : 'application/json; charset=utf-8'
                      });
                      res.end(JSON.stringify({
                        error: "Password Reset Failure",
                        message: "Invalid Password Reset Code. A new code has been sent to " + dbUser.email + " after " + dbAuthcode.PASSWORD_RESET_CODE.maxTrials + " unsuccessful attempts"
                      }));
                    });
                  }
                  else {
                    // save dbAuthcode
                    db.authCodes.update({_id : dbAuthcode._id}, dbAuthcode, {multi: false}, function(err, data){
                      res.writeHead(400, {
                        'Content-Type': 'application/json; charset=utf-8'
                      });
                      res.end(JSON.stringify({
                        error: "Password Reset",
                        message: "Invalid Activation Code. " + String(dbAuthcode.PASSWORD_RESET_CODE.maxTrials - dbAuthcode.PASSWORD_RESET_CODE.currentTrials) + " attempts left."
                      }));
                    });
                  }
              }
              else{
                // Codes match..
                // update user password
                pwdMgr.cryptPassword(resetPasswordToken.password, function(err, hash){
                  // modify authCode
                  dbUser.password = hash;
                  // Save changes on dbUser
                  db.appUsers.update({_id : dbUser._id}, dbUser, {multi: false}, function(err, data){
                    dbAuthcode.PASSWORD_RESET_CODE.code = "";
                    dbAuthcode.PASSWORD_RESET_CODE.maxTrials = 0;
                    dbAuthcode.PASSWORD_RESET_CODE.currentTrials = 0;
                    db.authCodes.update({_id : dbAuthcode._id}, dbAuthcode, {multi: false}, function(err, data){
                      // Return success message with dbUser
                      res.writeHead(200, {
                        'Content-Type': 'application/json; charset=utf-8'
                      });
                      res.end(JSON.stringify({
                        "message": "Password Reset Successfully"
                      }));
                    });
                  })
                })
              }
            }
          })
        }
      })
    }
    return next();
  })

  server.post("/api/v1/bucketlist/auth/change-password", function(req, res, next){
    var changePasswordToken = req.params;
    if(req.params.email.trim().length == 0 || req.params.password.trim().length == 0 || req.params.newPassword.trim().length == 0){
      // Invalid Password reset Token
      res.writeHead(403,{
        'Content-Type' : 'application/json; charset=utf-8'
      });
      res.end(JSON.stringify({
        error: "Invalid Token",
        message: "You have provided Invalid Password Change Token"
      }))
    }
    else{
      // check if user is valid
      db.appUsers.findOne({email : changePasswordToken.email}, function(err, dbUser){
        if(err || !dbUser){
          // Invalid user
          res.writeHead(404,{
            'Content-Type' : 'application/json; charset=utf-8'
          });
          res.end(JSON.stringify({
            error: "Forbidden",
            message: "Email Address does not exist"
          }))
        }
        else{
          // User is valid... Check if provided password matches
          pwdMgr.comparePassword(changePasswordToken.password, dbUser.password, function(err, isPasswordMatch){
            if(isPasswordMatch){
              // Hash new password
              pwdMgr.cryptPassword(changePasswordToken.newPassword, function(err, hash){
                dbUser.password = hash;
                // Update dbUser
                db.appUsers.update({_id : dbUser._id}, dbUser, {multi: false}, function(err, data){
                  res.writeHead(200, {
                    'Content-Type': 'application/json; charset=utf-8'
                  })
                  res.end(JSON.stringify({
                    "dbUser":dbUser,
                    "message": "Password successfully reset "
                  }));
                })
              })
            }
            else{
              res.writeHead(403, {
                'Content-Type': 'application/json; charset=utf-8'
              })
              res.end(JSON.stringify({
                error: "Invalid Password"
              }))
            }
          })
        }
      })
    }
    return next();
  })

}
