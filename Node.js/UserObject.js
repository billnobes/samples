//user object


var app = require('../modules/Config.js');

var mysql = require('mysql');
var pool  = mysql.createPool(app.config.mysql);
var crypto = require('crypto');
var _ = require("underscore");
var MongoClient = require('mongodb').MongoClient, format = require('util').format;
var ObjectID = require('mongodb').ObjectID;


function create(obj) {

	if (_.isNumber(obj.uRec) && _.isFunction(obj.callback)) { //get use object from uRec
	
		sendUserRecord(obj);
		
	} else if (obj.authType == 'webtoken' || obj.request.payload.authType == "webtoken") { //web auth
	
		getUrecFromWebToken(obj);
		
	} else if (obj.request.payload.authType == "mobileToken") { //mobile auth
		
	} else {
		app.logit("Failed to authenticate user!!")
		obj.reply({"error":"Your session has expired. Please login again."});
	}
	
	
} //ef


function getUrecFromWebToken(obj) {
	var userCookie = decodeURIComponent(obj.request.state.uck); 
		
	var sessionIV = getUserToken(obj.request.headers["user-agent"]);
	
	obj.userIV = sessionIV.substr(0, 16);
		
	var userToken = app.psyDecrypt(userCookie,sessionIV.substr(0, 16));
	
	userToken = userToken.replace(/\0/g, '');
			
	var match = userToken.match(/(.*):(user|provider|caregiver):(.*)::(.*)/);
	
		
	if (!_.isArray(match) || match.length == 0) {
		obj.reply({"error":"Your session has expired. Please login again. [DEC]","redir":"/index.html"});
		return;
	}
	var uid = match[1];
	var remoteToken = match[3];
	var loginTime = match[4];
	
	pool.getConnection(function(err, dbp) {
	
		if (err) {obj.reply({"error":"System error. Try again later"});throw err;}
		
		dbp.query("SELECT uRec, timeToken FROM users WHERE uid = ? ",[uid],function(err,row){
		
			if (err) {obj.reply({"error":"System error. Try again later"});throw err;}
			
			
			if (row.length == 1) {
				//check time
				var uRec = row[0].uRec;
				var time = Math.round(Date.now() / 1000);
				var elapsed = time - row[0].timeToken;
				
				app.logit("ELAP: ",elapsed);
				
				if (elapsed > 3600) {
					app.logit("User " + uRec + "had a session timeout");
					obj.reply({"error":"Your session has expired. Please login again. [TEL]","redir":"/index.html"});
					return;
				} else {
					var query = dbp.query("UPDATE users SET timeToken= ?, usageHistory=usageHistory + ? WHERE uRec = ? ",[time,elapsed,uRec],function(err,row){
						if (err) {obj.reply({"error":"System error. Try again later"});throw err;}
												
						//send user record
						obj.uRec = uRec;
						dbp.release();
						sendUserRecord(obj);
						return;
					} );
					
				}
							
			} else {
				dbp.release();
				obj.reply({"error":"Your session has expired. Please login again. [RNF]"});
				return;
			}
		});
	
	});
	
}


function sendUserRecord(obj) {


	pool.getConnection(function(err, dbp){
		if (err) {obj.reply({"error":"System error. Try again later"});throw err;}
		
		var query = dbp.query("SELECT * FROM users WHERE uRec = ? ",[obj.uRec],function(err,row){
			if (err) {obj.reply({"error":"System error. Try again later"});throw err;}
						
			dbp.release();
			if (row.length == 1) {
				
				var u = row[0];
				var user = {};
				user.uRec = u.uRec;
				user.uid =  u.uid;
				user.iv = app.getIv(u.uid);
				user.medSms = u.medSms;
				user.pubId = u.pubId;
				user.gender = u.gender;
				user.email = app.psyDecrypt(u.email);
				user.username = app.psyDecrypt(u.username);
				
				user.insurance = app.psyDecrypt(u.insurance);
				user.fname = app.psyDecrypt(u.fname);
				user.lname = app.psyDecrypt(u.lname);
				user.tz = u.timeZone;
				user.emailConfirm = u.emailConfirm;
				user.bounced = u.bounced;
				user.userType = u.userType;
				user.disabled = u.disabled;
				user.attScore = u.attScore;
				user.active  =  u.active;
				user.practiceId = u.practiceId;

				obj.user = user;
				user = {};
				
				getPractice(obj);							
				
				return;

			
			} else {
				app.logit('warn',"Did not get user within UserObject.js");
				obj.reply({"error":"System error. Try again later"});
				return;
			}
			
		});
		
	});

}


function getPractice(obj) {
	
	obj.user.practiceName = '';
	obj.user.practiceImageRec = '';
	
	if (obj.user.userType == app.k.userType.prov && !_.isNull(obj.user.practiceId) && obj.user.practiceId.length > 5) {
		
		MongoClient.connect(app.config.mongo.path, function(err, db) { 
			if (err) {obj.callback(err);return;}
			var adminDb = db.admin();
			adminDb.authenticate(app.config.mongo.user,app.config.mongo.password,function(err,result){ 
				
				if (err) {
					app.logit('warn',"monogo error",err);
					obj.reply({"error":"System error. Try again later"});
					return;
				}
				
				var mongoPractices = db.collection('Practices');
	
				mongoPractices.findOne({_id:ObjectID(obj.user.practiceId)}, function(err,item){
				
					if (err) {obj.barrel(err);return;}
					
					if (_.isObject(item)) {
						obj.user.practiceName = item.name;
						obj.user.practiceImageRec = item.practiceImageRec;
					} 
					
					db.close();
					
					pareseOptions(obj);
				
				}); //- findone
				
			}); //- auth
		
		})//- connect
		
	} else {
		pareseOptions(obj);
	}
	
} //- getPractice

function pareseOptions(obj) {
	
	if (_.isObject(obj.options) && obj.options.getLinkedMembers == true) {
		getLinkedMembers(obj);
	} else {
		obj.callback(obj);	
	}			
	
} //- pareseOptions


function getLinkedMembers(obj) {


	if (obj.user.userType == app.k.userType.user) {
	
		getProviders(obj);
		
	} else if (obj.user.userType == app.k.userType.prov || obj.user.userType == app.k.userType.cg )  {
	
		getPatients(obj);
		
	}
	
} //- getLinkedMembers



function getProviders(obj) { //includes caregivers

	obj.providers = {};
		
	pool.getConnection(function(err, dbp){
		if (err) {obj.reply({"error":"System error. Try again later"});throw err;}
		
			if (_.isNumber(obj.user.uRec) && obj.user.uRec > 0)  {
				
				var link = {};
				var query = dbp.query("SELECT l.provId, l.cgId FROM linkages l, users u WHERE u.disabled = 0 AND l.userId = ? AND l.accepted = 1 AND u.uRec=l.userId",
					[obj.user.uRec],function(err,team){
					if (err) {obj.reply({"error":"System error. Try again later"});throw err;}
										
					var uRecs = [];
					
					_.each(team,function(item) {
					
						if (item.cgId == 0) {
							item.uRec = item.provId; 
							item.type = app.k.userType.prov;
						} else {
							item.uRec = item.cgId;
							item.type = app.k.userType.cg;
						}
						uRecs.push(item.uRec);
						delete item.cgId;
						delete item.provId;		
									
					}); //- each
					
					if (uRecs.length > 0) {
					
						//get names
						var query = dbp.query("SELECT uRec, uid, fname, lname FROM users WHERE uRec in (" + uRecs.join(',') + ")",function(err,set){
											
							if (err) {obj.reply({"error":"System error. Try again later"});throw err;}
							
							_.each(set,function(item){
								var ob = _.find(team, function(o) { return o.uRec == item.uRec });
								ob.name = app.psyDecrypt(item.fname) + " " + app.psyDecrypt(item.lname);
								ob.fname = app.psyDecrypt(item.fname);
								ob.lname = app.psyDecrypt(item.lname);
								ob.uid = item.uid;
								delete ob.uRec;
							}); //- each name
							
							obj.providers = team;
							dbp.release();
							obj.callback(obj);
							return;
						});
					
					}  else { //- if array
						dbp.release();
						obj.callback(obj);
						return;
					
					}
					
				}); //- linkage query
				
			} else {
				app.logit('warn',"Did not get uRec within getProviders.js");
				obj.reply({"error":"System error. Try again later"});
				dbp.release();
				return;
			}
		
	}); //- pool
	
} //-  getProviders


function getPatients(obj) {

	obj.patients = {};
		
	pool.getConnection(function(err, dbp){
		if (err) {obj.reply({"error":"System error. Try again later"});throw err;}
		
			if (_.isNumber(obj.user.uRec) && obj.user.uRec > 0)  {
				
				var link = {};
				var query = dbp.query("SELECT l.userId FROM linkages l, users u WHERE (l.cgId = ?  OR l.provId = ?) AND l.accepted = 1 AND u.disabled=0 AND u.uRec=l.userId",
				[obj.user.uRec,obj.user.uRec],function(err,team){
					if (err) {obj.reply({"error":"System error. Try again later"});throw err;}
										
					var uRecs = [];
					
					_.each(team,function(item) {

						uRecs.push(item.userId);
	
					}); //- each
	
					
					if (uRecs.length > 0) {
					
						//get names
						var query = dbp.query("SELECT uRec, uid, fname, lname, attScore FROM users WHERE uRec in (" + uRecs.join(',') + ")",function(err,set){
											
							if (err) {obj.reply({"error":"System error. Try again later"});throw err;}
							
							_.each(set,function(item){
								var ob = _.find(team, function(o) { return o.userId == item.uRec });
								ob.fname = app.ucFirst(app.psyDecrypt(item.fname));
								ob.lname = app.ucFirst(app.psyDecrypt(item.lname));
								ob.uid = item.uid;
								ob.alertLevel = item.attScore;
								delete ob.userId;
							}); //- each name
														
							obj.patients = team;
							dbp.release();
							obj.callback(obj);
							return;
						});
					
					}  else { //- if array
						dbp.release();
						obj.callback(obj);
						return;
					
					}
					
				}); //- linkage query
				
			} else {
				app.logit('warn',"Did not get uRec within getProviders.js");
				obj.reply({"error":"System error. Try again later"});
				dbp.release();
				return;
			}
		
	}); //- pool
} //- getPatients



function getUserToken(userAgent) {
	
	
	var hash = crypto.createHash('sha1');
	hash.update(userAgent.substr(0, 54) + app.config.server);
	//hash.update(request.payload.email.toLowerCase()); //user salt
	//hash.update(config.salt); //system salt
	return hash.digest('hex');
	
}

/*
function getToken(text) {
	var cipher = crypto.createCipher('aes256',config.cypherPass)
	var crypted = cipher.update(text.toString(),'utf-8','hex') + cipher.final('hex');
	return crypted;
}
*/

/*
function getUidFromToken(token) {
	var decipher = crypto.createDecipher('aes256',config.cypherPass)
	var uid = decipher.update(token,'hex','utf-8') + decipher.final('utf-8');
	return uid;
}
*/


exports.create = create;
