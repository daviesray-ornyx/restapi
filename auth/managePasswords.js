var bcrypt = require('bcrypt-nodejs');

module.exports.cryptPassword = function(password, cb){
  console.log("Into crypt password: " + password);
  bcrypt.genSalt(10, function(err, salt){
    if(err){
      return cb(err, null);
    }
    else{
      bcrypt.hash(password, salt, null, function(err, hash){
        return cb(err, hash);
      });
    }
  });
}

/*
  comparePassword(data, encryptedData, callback)
  This is for comparing provided password and user stored password
 */
module.exports.comparePassword = function(password, userPassword, cb){
  bcrypt.compare(password, userPassword, function(err, isPasswordMatch) {
    if(err)
      return cb(err);
    return cb(null, isPasswordMatch);
  });
};
