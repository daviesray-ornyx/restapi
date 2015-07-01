var restify = require('restify');
var mongojs = require('mongojs');
var morgan = require('morgan');
var db = mongojs('bucketlistapp',['appUsers','userProfiles','authCodes','reports']);
var server = restify.createServer();
/*
  Adding middlewares... go with server.use(restify.middlwarename(parms))
  OR
  server.use(middleware(params);)
*/
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(morgan('dev')) //LOGGING

/*  CORS */
server.use(function(req, res, next){
  res.header('Access-Control-Allow-Origin', "*");
  res.header('Access-Control-Allow-Methods', "GET,PUT,POST,DELETE");
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
})

var manageUsers = require('./auth/manageUser')(server, db);

/* starting our server */
server.listen(process.env.PORT || 9804, function(){
  console.log("Server started @", process.env.PORT || 9804);
});
