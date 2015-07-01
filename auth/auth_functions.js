/*
  1. Code generation
*/

module.exports.generateCode = function(size){
  // This is a synchronous function that returns a random code
  var text = "";
    var possible = "0123456789";    // For numeric only
    //var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";  This is for alfa. numeric code

    for( var i=0; i < size; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}
