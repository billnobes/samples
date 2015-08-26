var app = require('../modules/Config.js');

var mysql = require('mysql');
var pool  = mysql.createPool(app.config.mysql);

var userObject = require('../modules/UserObject.js');

var crypto = require('crypto');
var _ = require("underscore");

var async = require('async');

//var https = require('https');
//var http = require('http');

//provider specific modules
var clients = require('../modules/ProviderClients.js');
var practice = require('../modules/Practice.js');


app.logit('init provider server');


var categories = require ( app.config.sysroot + "/psy_lib/jsonObjects/QuestionCategories.json");

function dispatch(request,reply) {
	//process user cookies and create user object, send callback
	userObject.create({"request":request,"reply":reply,"callback":route,options:{"getLinkedMembers":true}});//,"uRec":141});
	
	app.logit("P RECORD REQ: ",request.payload);
	
} //ef dispatch


function route(obj) {

	var action = obj.request.payload.action;
    obj.categories = categories;
    obj.send = {};
    
    
    //lets add needed stuff to send for all calls
    obj.send.user = {"fname": obj.user.fname,"lname":obj.user.lname,"tz":obj.user.tz,
	    "practiceId":obj.user.practiceId,"practiceName":obj.user.practiceName,"practiceImageRec":obj.user.practiceImageRec};
    
	app.logit("ACTION: ",action);
	obj.callnum=1;
	//user data will be in obj.user	
				
		switch (action) {
			
			case "getName":
			
				async.waterfall(
					[
						function(barrel) {barrel(null);}
					],
					function (err) { barrelCallback(err,obj) }
				);
			
			break;
			
			case "getStatus":
			
				async.waterfall(
					[
						function(barrel){newMessageCount(barrel,obj);},
						function(barrel){inviteCount(barrel,obj);},
						function(barrel) {barrel(null);}
					],
					function (err) { barrelCallback(err,obj) }
				);
			
			break;
		

			case "getMessagesPage":	
				
				async.waterfall(
					[
						function(barrel){newMessageCount(barrel,obj);},
						function(barrel){inviteCount(barrel,obj);},
						function(barrel){inboxMessageCount(barrel,obj);},
						function(barrel){archiveMessageCount(barrel,obj);},
						function(barrel){sentMessageCount(barrel,obj);},
						function(barrel){barrel(null);}
					],
					function (err) { barrelCallback(err,obj) }
				);
			break;
			
			case "getInvitesPage":	
				
				async.waterfall(
					[
						function(barrel){newMessageCount(barrel,obj);},
						function(barrel){inviteCount(barrel,obj);},
					    function(barrel){getPendingInvites(barrel,obj);},
					    function(barrel){getOpenInvites(barrel,obj);},
						function(barrel){getInviteCode(barrel,obj);},
						function(barrel){barrel(null);}
					],
					function (err) { barrelCallback(err,obj) }
				);
			break;
	
			case "getMainPage":
				
				async.waterfall(
					[
						function(barrel) {app.attachMongo(barrel,obj);},
						function(barrel) {getPracticeLogTimes(barrel,obj)}, 
						function(barrel) {getCategories(barrel,obj);},
						function(barrel) {newMessageCount(barrel,obj);},
						function(barrel) {inviteCount(barrel,obj);},
						function(barrel) {sendPatients(barrel,obj)},
						function(barrel) {barrel(null);}
					],
					function (err) { barrelCallback(err,obj) }
					
				);
			
			break;
			
			case "clientsLoadMainObjects":	
				
				async.waterfall(
					[
						function(barrel) {app.attachMongo(barrel,obj);},
						function(barrel) {getPatientUid(barrel,obj);},
						function(barrel) {getPracticeLogTimes(barrel,obj)},
						function(barrel) {newMessageCount(barrel,obj);},
						function(barrel) {inviteCount(barrel,obj);},
						function(barrel) {getPatientPracticeId(barrel,obj)},
						function(barrel) {loadPatientObject(barrel,obj);}, 
						function(barrel) {barrel(null);}
					],
					function (err) { barrelCallback(err,obj) }
				);
			break;
			
			case "clientsMain":
				async.waterfall(
					[
						function(barrel) {newMessageCount(barrel,obj);},
						function(barrel) {inviteCount(barrel,obj);},
						function(barrel) {getCategories(barrel,obj);},
						function(barrel) {clientsMain(barrel,obj);},
						function(barrel) {barrel(null,obj);}
						
					],
					function (err) { barrelCallback(err,obj) }
				);
			break;
			
			case "clientsPatientSummary":
				async.waterfall(
					[
						function(barrel) {getPatientUid(barrel,obj);},
						function(barrel) {clientsPatientSummary(barrel,obj);},
						function(barrel) {barrel(null);}
						
					],
					function (err) { barrelCallback(err,obj) }
				);
			break;
			
			case "clientsPatientDetail":
				async.waterfall(
					[
						function(barrel) {getPatientUid(barrel,obj);},
						function(barrel) {getPatientTimezone(barrel,obj);},
						function(barrel) {clientsPatientDetail(barrel,obj);},
						function(barrel) {barrel(null);}
						
					],
					function (err) { barrelCallback(err,obj) }
				);
			break;
			
			
			case "test":
				obj.reply({"resp":"OK"});
				app.logit("USER: ",obj.user);
			break;
			
		}
	
}

function barrelCallback(err, obj) { 
	
	if (obj.mysqlOpen == true && _.isFunction(obj.mysql.end)  ) {obj.mysql.end(); obj.mysqlOpen = false;}
	if (obj.mongoOpen == true && _.isFunction(obj.mongodb.close)) {obj.mongodb.close();obj.mongoOpen = false;}
	
	
	if ( err ) {
		app.logit("Provier JS: ",err,err.trace);
		obj.reply({"resp":"System error. Please try again later"});
		return;
	}
	if (_.isObject(obj) && _.isObject(obj.send)) {
		obj.send.resp = "OK";
		obj.reply(obj.send);
	} 
}

//clients

function clientsPatientDetail(barrel,obj) {
	
	
	obj.barrel = barrel;
	
	clients.getPatientDetail(obj);
	
	
} //- clientsPatientDetail



function loadPatientObject(barrel,obj) {
	
	
	obj.barrel = barrel;
	
	clients.getPatientObject(obj);
	
	
} //- clientsPatientDetail

function getPracticeLogTimes(barrel,obj) {
	
	obj.barrel = barrel;
	practice.getLogTimes(obj);
	
} //- getPracticeLogTimes




function getPatientUid(barrel,obj) {
	
//	app.logit("uid: ", obj.request.payload.uid);
	if (_.isString(obj.request.payload.uid)) {
		
		pool.getConnection(function(err, dbp){

		    if (err) {barrel(err);return;}
			
			var query = dbp.query("SELECT uRec, fname, lname FROM users WHERE uid = ? LIMIT 1",[obj.request.payload.uid],function(err,result){
				
				 if (err) {barrel(err);dbp.release();return;}
				
				obj.patientUrec = 	result[0].uRec;
				obj.patientUid = obj.request.payload.uid;
				obj.send.patientName = 	{ "fname":app.ucFirst(app.psyDecrypt(result[0].fname)),"lname":app.ucFirst(app.psyDecrypt(result[0].lname))};
				dbp.release()
				barrel(null);
				return;
						
			}); //- query
		
		}); //- pool
		
		
	} else {
		var error = new Error("Did not find uid string in payload");
		barrel(error,obj);
	}
	
} //- getPatientUid


function getPatientPracticeId(barrel,obj) {
	
	if (_.isString(obj.request.payload.uid)) {
		
		pool.getConnection(function(err, dbp){

		    if (err) {barrel(err);return;}
			
			var query = dbp.query("SELECT patientId FROM userPatientId WHERE uid = ? LIMIT 1",[obj.request.payload.uid],function(err,result){
				
				 if (err) {barrel(err);dbp.release();return;}
				
				obj.patientId = '';
				obj.send.patientId = '';
				
				if (result.length > 0) {
					obj.patientId = result[0].patientId;
					obj.send.patientId = result[0].patientId;
				} 
				dbp.release()
				barrel(null);
				return;
						
			}); //- query
		
		}); //- pool
		
		
	} else {
		var error = new Error("Did not find uid string in payload");
		barrel(error,obj);
	}	
	
	
} // ef

function getPatientTimezone(barrel,obj) {

	pool.getConnection(function(err, dbp){

    	if (err) {barrel(err);return;}
    
    	var query = dbp.query("SELECT timeZone FROM users WHERE uRec = ? LIMIT 1",[obj.patientUrec],function(err,result){
    
    		if (err) {barrel(err);dbp.release();return;}
    
    		obj.send.patient = {};
    		obj.send.patient.tz = result[0].timeZone;
    
    		dbp.release();
    		barrel(null);
    
    	});

    }); //- pool

} //- getPatientTimezone

function clientsPatientSummary(barrel,obj) {
	
	obj.barrel = barrel;
	
	clients.getPatientSummary(obj);
	
} //- getPatientSummary


function clientsMain(barrel,obj) {
	
	/*
	Main has 3 states:
		1: Clicked clients tab: user mey then click cat, patient or search for patient (latter to be imlemented later)
		2: Clicked cat head from main (use Renee view)
	*/
	
	obj.barrel = barrel;

	clients.getMain(obj);

	return;
}




//function getCategories(cb, obj) {
function getCategories(barrel,obj) {

	_.each(obj.categories, function(item, i) {
		if ( item ) {
			obj.categories[i].members = [];
		}
	});
	
	pool.getConnection(function(err, dbp){

	    if (err) {barrel(err);return;}

		var queryIds = _.map(obj.patients, function(item) { return '"' + item.uid + '"'; });
		if ( queryIds.length == 0 ) {
			dbp.release();
			barrel(null);
			return;
		}
		var queryIdString = queryIds.join();
		
								
			var query = dbp.query("SELECT c.uRec, c.categoryId, u.uid from userSurveyCategories c, users u WHERE " +
			"u.uid IN (" + queryIdString + ") AND u.uRec = c.uRec",
				[],function(err, cats){
				
					if (err) {barrel(err);dbp.release();return;}
	
					//assemble members into cat index object
					var members = {};
					_.each(cats,function(cat) {
						if (!_.isArray(members[cat.categoryId])) { members[cat.categoryId] = []; }
						members[cat.categoryId.toString()].push(cat.uid);
					}); //- each
					
					//attach to cat object
					_.each(obj.categories,function(cat,idx){
												
						if (_.isObject(members[cat.catId]) && _.isArray(obj.categories[idx].members)) {
							obj.categories[idx].members = members[cat.catId.toString()];
						}
					});
					
					
					/*
					_.each(cats,function(cat) {
						app.logit(cat);
						if ( obj.categories[cat.categoryId].members ) {
							obj.categories[cat.categoryId].members.push(cat.uid);
						}
						else {
							app.logit("NO CATEGORY");
						}
					}); //- each
					*/
					
					dbp.release();
					barrel(null);
					return;
				}); //- query
	}); //- pool
} // ef getCategories

function newMessageCount(barrel, obj) {

	pool.getConnection(function(err, dbp){

	    if (err) {barrel(err);return;}

			var query = dbp.query("SELECT count(distId) as newMsgs FROM messageDistribution WHERE uRec=? AND messageRead=0",										[obj.uRec],function(err, results){
				
					if (err) {barrel(err);dbp.release();return;}
					
					obj.send.newMsgCount = results[0].newMsgs;
					dbp.release();
					barrel(null);
					return;
				}); //- query
	}); //- pool
}

function inviteCount(barrel, obj) {

	pool.getConnection(function(err, dbp){

	    if (err) {barrel(err);return;}
			
			var query = dbp.query("SELECT count(pendingInvitationId) as inviteCount FROM pendingInvitations WHERE uRec=? AND pending=1 AND deleted=0",										[obj.uRec],function(err, results){
				
					if (err) {barrel(err);dbp.release();return;}
	
					obj.send.inviteCount = results[0].inviteCount;
					
					dbp.release();
					barrel(null);
					return;
				}); //- query
	}); //- pool
}

function getInviteCode(barrel, obj) {

	pool.getConnection(function(err, dbp){

	    if (err) {barrel(err);return;}

			var query = dbp.query("SELECT pubId FROM users WHERE uRec=?", [obj.uRec],function(err, results){
				
					if (err) {barrel(err);dbp.release();return;}
					
					obj.send.pubId = results[0].pubId.substr(0,2) + "-" + results[0].pubId.substr(2);
					
					dbp.release();
					barrel(null);
					return;
				}); //- query
	}); //- pool
}

function getPendingInvites(barrel, obj) {
    
    pool.getConnection(function(err, dbp){
	
	if (err) {barrel(err);return;}
	
	var query = dbp.query(
	    "SELECT invitationHash, name, added, pending, message, DATE_ADD(added, INTERVAL 14 DAY) AS expiration FROM pendingInvitations WHERE uRec = ? AND (pending = 0 OR pending = 1) AND deleted = 0 AND added > DATE_SUB('" + new Date().toISOString() + "', INTERVAL 14 DAY) ORDER BY added DESC",
	    [obj.uRec],function(err, results){
		
		if (err) {barrel(err);dbp.release();return;}
		obj.send.pendingInvites = results;
//		_.each(results, function(result) {
//		});
		
		dbp.release();
		barrel(null);
		return;
	    }); //- query
    }); //- pool
}

function getOpenInvites(barrel, obj) {
    
    pool.getConnection(function(err, dbp){
	
	if (err) {barrel(err);return;}
	
	var query = dbp.query("SELECT u.fname, u.lname, p.invitationHash, p.added, p.message, p.pending FROM pendingInvitations p, users u WHERE p.recipient = ? AND (p.pending = 0 OR p.pending = 1) AND p.deleted = 0 AND u.uRec=p.uRec ORDER BY p.added DESC",
	    [obj.uRec],function(err, results){
		
		if (err) {barrel(err);dbp.release();return;}

		_.each(results, function(result, ref) {
		    results[ref].fname = app.psyDecrypt(results[ref].fname);
		    results[ref].lname = app.psyDecrypt(results[ref].lname);
		});

		obj.send.openInvites = results;
		
		dbp.release();
		barrel(null);
		return;
	    }); //- query
    }); //- pool
}

function inboxMessageCount(barrel, obj) {

	pool.getConnection(function(err, dbp){

	    if (err) {barrel(err);return;}

			var query = dbp.query("SELECT count(distId) as inboxMsgs FROM messageDistribution WHERE uRec=? AND folder=1",										[obj.uRec],function(err, results){
				
					if (err) {barrel(err);dbp.release();return;}
					
					obj.send.inboxMsgCount = results[0].inboxMsgs;
					dbp.release();
					barrel(null);
					return;
				}); //- query
	}); //- pool
}

function archiveMessageCount(barrel, obj) {

	pool.getConnection(function(err, dbp){

	   if (err) {barrel(err);return;}

			var query = dbp.query("SELECT count(distId) as archiveMsgs FROM messageDistribution WHERE uRec=? AND folder=3",										[obj.uRec],function(err, results){
				
					if (err) {barrel(err);return;}
					
					obj.send.archiveMsgCount = results[0].archiveMsgs;
					dbp.release();
					barrel(null);
					return;
				}); //- query
	}); //- pool
}

function sentMessageCount(barrel, obj) {

	pool.getConnection(function(err, dbp){

	    if (err) {barrel(err);return;}

			var query = dbp.query("SELECT count(*) as sentMsgs FROM messages WHERE uRec=?",										[obj.uRec],function(err, results){
				
					if (err) {barrel(err);dbp.release();return;}
					
					obj.send.sentMsgCount = results[0].sentMsgs;
					dbp.release();
					barrel(null);
					return;
				}); //- query
	}); //- pool
}

function sendPatients(barrel,obj) {
	
	//obj.send = {"resp":"OK", "patients":obj.patients, "categories":obj.categories};
	obj.send.patients = obj.patients;
	obj.send.categories = obj.categories;
	
	//obj.reply({"resp":"hunky dory"});
	//app.logit(obj.test);	
	barrel(null);
	
}

exports.dispatch=dispatch;

