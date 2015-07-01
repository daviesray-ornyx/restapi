module.exports = function(server, db){
  var validateRequest = require('../auth/validateRequest');

  server.get('/api/v1/bucketlist/data/list', function(req, res, next){
    validateRequest.validate(req, res, db, function(){
      db.bucketLists.find({user: req.params.token}, function(err, list){
        res.writeHead(200,{
          'Content-Type' : 'application/json; charset=utf-8'
        });
        res.end(JSON.stringify(list));
      })
    })
    return next();
  })

  server.get('/api/v1/bucketlist/data/item/:id', function(req, res, next){
    validateRequest.validate(req, res, db, function(){
      db.bucketLists.findOne({
          _id: db.ObjectId(req.params.id)
        }, function(err, data){
          res.writeHead(200,{
            'Content-Type' : 'application/json; charset=utf-8'
          });
          res.end(JSON.stringify(data));
        }
      )
    });
    return next();
  })

  server.post('/api/v1/bucketlist/data/item', function(req, res, next){
    validateRequest.validate(req, res, db, function(){
      var item = req.params;
      db.bucketLists.save(item, function(err, data){
        res.writeHead(200,{
          'Content-Type' : 'application/json; charset=utf-8'
        });
        res.end(JSON.stringify(data));
      })
    })
    return next();
  })

  server.put('/api/v1/bucketlist/data/item/:id', function(req, res, next){
    validateRequest.validate(req, res, db, function(){
      db.bucketLists.findOne({
        _id : ObjectId(req.params.id)
      }, function(err, data){
        updProd = {}; // New product that's to hold updated data
        for(var n in data){
          updProd[n] = data[n];
        }
        for(var n in req.params){
          if(n != "id")
            updProd[n] = req.params[n];
        }

        db.bucketLists.update({
            _id : ObjectId(req.params.id)
          }, updProd, {
            multi: false
          }, function(err, data){
            res.writeHead(200,{
              'Content-Type' : 'application/json; charset=utf-8'
            });
            res.end(JSON.stringify(data));
        })
      })
    })
    return next();
  })

  server.del('/api/v1/bucketlist/data/item/:id', function(req, res, next){
    validateRequest.validate(req, res, db, function(){
      db.bucketLists.remove({
        _id : ObjectId(req.params.id)
      }, function(err, data){
        res.writeHead(200,{
          'Content-Type' : 'application/json; charset=utf-8'
        });
        res.end(JSON.stringify(data));
      })
    })
    return next();
  })

}
