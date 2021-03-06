
/**
 * Module dependencies.
 */
var express = require('express'), 
		OAuth = require('oauth').OAuth,
		io = require('socket.io'),
//		connect = require('connect'), //Automatic in express I think?
 		util = require('util');

var	mongoose = require('mongoose');

var db = mongoose.connect('mongodb://localhost/writewall', function(err) {
	if( err ) {	console.log(err); }
	else { console.log("Successful connection"); }
});

var app = module.exports = express.createServer();

//Database model
var Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

//Gender:
//Female 1
//Male 0
var msgSchema = new Schema({ 
		'msg' : {
	    gender : Number
		, msg	: String
		, question : String
	  , time : Date
	}}), Msg;

var Msg = mongoose.model('Msg', msgSchema,'message');

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
	app.use(express.cookieParser());
	app.use(express.session({ secret: '024493' }));
//  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', function(req, res){
  res.render('index', {
    title: 'Super Secret Share & Sons',
		gender: ''
  });
});

app.get('/male', function(req, res){
  res.render('index', {
    title: 'writewall'
		, gender: 'male',
  });
});

app.get('/male/say', function(req,res) {
		var newMsg = new Msg();
		console.log("this!" + JSON.stringify(req.param.msg) );

		newMsg.msg = JSON.parse( JSON.stringify( {
				"gender" : "0"
				, "msg": JSON.stringify(req.param.msg)
				, "sent" : new Date()
			}));

		newMsg.save( function(err) {
			if(err) console.log("Error saving: " + err)
			});		
		
		res.render('index', {
			title:'You said this about a girl:'
			, gender: 'male'
			, messages: { 'msg' : req.param.msg }
		});

	});

app.get('/female', function(req, res){
				
  res.render('index', {
    title: 'writewall'
		, gender: 'female'
		}
	);
});


app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

//SOCKET LISTENING
var io = io.listen(app);

io.sockets.on('connection', function (socket) {

		socket.on('data', function (data) {	
			var newMsg = new Msg();
			console.log("this!" + JSON.stringify(data) );

			newMsg.msg = {
					"gender" : data.gender
					, "msg" : data.msg
					, "question" : data.question
					, "sent" : new Date()
				};

			newMsg.save( function(err) {
				if(err) console.log("Error saving: " + err)
				socket.broadcast.emit('success',data);
					});		
				});
				
		socket.on('current', function(data) {
			var message = [];
			var selectGender;
			
			console.log('To pull: ' +  data.gender);
			
			if(data.gender == 0) {
				selectGender = 1;
			} else
			if(data.gender == 1) {
				selectGender = 0;
			}
			
			console.log(data);
			if(data.gender !== null) {
				var query = Msg.find( {'msg.gender': selectGender } );
				 query.sort( 'msg.time', -1 )
						.limit(25)
						.exec(function(err,doc) {
								if(err) console.log("Err retrieving:" + err)
								if( doc !== undefined ) {
									for( var key in doc){
										if( doc.hasOwnProperty(key) ) {
											console.log(doc[key].msg);
											message.push(doc[key].msg);
											}
										}
										socket.emit('current',message);
									}
								});
						} else { socket.emit('fail')  }	
				});
			});

	

	
		
	
	io.sockets.on('disconnect', function() {
		clearInterval(interval);
		console.log('Disconnect');
	});
