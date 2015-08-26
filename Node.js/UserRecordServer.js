var app = require('../modules/Config.js');
var userObject = require('../modules/UserObject.js');
var fs = require('fs');

var mysql = require('mysql');
var pool  = mysql.createPool(app.config.mysql);

var Joi = require('joi');

var async = require('async');

var ReadableStream = require('stream').Readable;

var _ = require("underscore");

app.logit('init user document server');

var recordTypes = [
  					{ "id":1,  "enabled":0, "name":'Lab Report',                       "sort":2  },
  					{ "id":2,  "enabled":0, "name":'Radiological Report',              "sort":5  },
  					{ "id":3,  "enabled":0, "name":'Care Plan',                        "sort":1  },
  					{ "id":4,  "enabled":0, "name":'Prior Authorization',              "sort":4  },
  					{ "id":5,  "enabled":0, "name":'Pharmacy',                         "sort":3  },
//					{ "id":99, "enabled":1, "name":'Other Medical Record',             "sort":99 },
            { "id":6,  "enabled":1, "name":'Advance directives',               "sort":1  },
            { "id":3,  "enabled":1, "name":'Care Plan',                        "sort":2  },
            { "id":7,  "enabled":1, "name":'Educational Resources',            "sort":3  },
            { "id":8,  "enabled":1, "name":'Family Medical History',           "sort":4  },
            { "id":9,  "enabled":1, "name":'Hospital/ER Discharge Plan',       "sort":5  },
            { "id":1,  "enabled":1, "name":'Lab Test/Report',                  "sort":6  },
            { "id":10, "enabled":1, "name":'Medication Assessment Report',     "sort":7  },
            { "id":11, "enabled":1, "name":'Medication Reconciliation Report', "sort":8  },
            { "id":12, "enabled":1, "name":'Orientation to Practice',          "sort":9  },
            { "id":13, "enabled":1, "name":'Screenings (Mental health)',       "sort":10 },
            { "id":14, "enabled":1, "name":'Screening (Physical health)',      "sort":11 },
            { "id":15, "enabled":1, "name":'Self-management support (2.B.4)',  "sort":12 },
            { "id":99, "enabled":1, "name":'Other',                            "sort":99 }
				   ];

function dispatch(request,reply) {

	//process user cookies and create user object, send callback
	userObject.create({"request":request,"reply":reply,"callback":route,options:{"getLinkedMembers":true}});

	app.logit("RECORD REQ: ",request.payload);

} //ef dispatch


function route(obj) {

	var action = obj.request.payload.action;

	//user data will be in obj.user

		switch (action) {

			//user
			case "getDocumentList":
				getDocumentList(obj);
			break;

			case "deleteRecord":
				deleteRecord(obj);
			break;

			case "saveEdit":
				saveEdit(obj);
			break;

			case "updateShare":
				updateShare(obj);
			break;


			//provider
			case "getProviderRecordList":
				getProviderRecordList(obj);
			break;

		}

}

function saveEdit(obj) {

	var recordId = parseInt(obj.request.payload.recordId);

	if (_.isNumber(recordId)) {


		pool.getConnection(function(err, dbp) {

			if (err) {obj.reply({"error":"System error. Try again later"});throw err;}

			obj.request.payload.description = app.clean(obj.request.payload.description);

			var query = dbp.query("UPDATE userRecords SET `desc` = AES_ENCRYPT(?,?) WHERE (uRec = ? OR uploader = ?) AND recordId = ?",[obj.request.payload.description,app.config.keys.cypherKey,obj.uRec,obj.uRec, recordId],function(err,row){
				dbp.release();
				if (err) {obj.reply({"error":"System error. Try again later"});throw err;}

				obj.reply({"resp":"OK"});

			}); //- query

		}); //- pool

	} else {
		obj.reply({"error":"System error. Try again later"});
	}

} //- ef


function deleteRecord(obj) {

	var recordId = parseInt(obj.request.payload.recordId);

	if (_.isNumber(recordId)) {


		pool.getConnection(function(err, dbp) {

			if (err) {obj.reply({"error":"System error. Try again later"});throw err;}

			var query = dbp.query("DELETE FROM userRecords WHERE (uRec = ? OR uploader = ?) AND recordId = ?",[obj.uRec, obj.uRec, recordId],function(err,row){
				if (err) {obj.reply({"error":"System error. Try again later"});throw err;}

				if (row.affectedRows > 0) {
					query = dbp.query("DELETE FROM userRecordChunks WHERE  recordId = ?",[recordId],function(err,row){

						if (err) {obj.reply({"error":"System error. Try again later"});throw err;}

						query = dbp.query("DELETE FROM userRecordShare WHERE recordId = ?",[recordId],function(err,row){

							if (err) {obj.reply({"error":"System error. Try again later"});throw err;}
							obj.reply({"resp":"OK"});
							dbp.release();

						});

					}); //- query

				} else {
					obj.reply({"error":"System error. Try again later"});
					dbp.release();
				}

			}); //- query

		}); //- pool

	} else {
		obj.reply({"error":"System error. Try again later"})
	}
} //- ef


function getProviderRecordList(obj){


	pool.getConnection(function(err, dbp) {
		pool.getConnection(function(err, dbp2) {

			if (err) {obj.reply({"error":"System error. Try again later"});throw err;}

			var recordArr = [];

			//get records
			//get list of record
			var q = dbp.query("SELECT a.recordId, uploader, TIMESTAMP(added) as added, cat, AES_DECRYPT(`desc`,?) as `desc`, filename, docType, done FROM userRecords a, userRecordShare b WHERE b.shareId = ? AND a.recordId = b.recordId AND a.uRec = (SELECT uRec FROM users WHERE uid = ?)",
			[app.config.keys.cypherKey,obj.user.uid,obj.request.payload.clientUid],function(err,set) {

				if (err) {obj.reply({"error":"System error. Try again later"});throw err;}

				_.each(set,function(row){
					if (Buffer.isBuffer(row.desc)) {row.desc = row.desc.toString();}
					if (row.uploader == obj.user.uRec) {
						row.uploader = 1;
					} else {
						row.uploader = 0;
					}

				});
				obj.reply({"resp":"OK","utc":new Date(),"records":set,"clients":obj.clients,"recordTypes":recordTypes});

				dbp.release();
				dbp2.release();
			});


		}); //- pool2
	}); //- pool

}



function getDocumentList(obj){

	pool.getConnection(function(err, dbp) {
		pool.getConnection(function(err, dbp2) {

			if (err) {obj.reply({"error":"System error. Try again later"});throw err;}

			var recordArr = [];

			//get records
			var query = dbp.query("SELECT recordId, TIMESTAMP(added) as added, cat, AES_DECRYPT(`desc`,?) as `desc`, filename, docType, done FROM userRecords WHERE uRec = ? ORDER BY added ",[app.config.keys.cypherKey,obj.uRec]);

			query
			.on("error",function(err){dbp.release();if (err) {obj.reply({"error":"System error. Try again later"});throw err;}})

			.on("result",function(row){
				dbp.pause();
				if (Buffer.isBuffer(row.desc)) {row.desc = row.desc.toString();}

				var q2 = dbp2.query("SELECT u.uid FROM userRecordShare r, users u WHERE r.shareId = u.uid AND r.recordId = ?",[row.recordId],function(err2,share){
					if (err2) {obj.reply({"error":"System error. Try again later"});throw err2;}
					row.share = share;
					recordArr.push(row);
					dbp.resume();
				});

			})

			.on("end",function(){
				obj.reply({"resp":"OK","utc":new Date(),"records":recordArr,"providers":obj.providers,"recordTypes":recordTypes});
				dbp.release();
				dbp2.release();
			});


		}); //- pool2
	}); //- pool

}

function saveDocument(request,reply) {
	//process user cookies and create user object, send callback
	userObject.create({"request":request,"reply":reply,"callback":preProcessSave});
}

function preProcessSave(obj) {

	if (obj.user.userType == app.k.userType.user) {
		processSaveRequest(obj);
	} else if (obj.user.userType == app.k.userType.prov  || obj.user.userType == app.k.userType.cg) {

		pool.getConnection(function(err, dbp) {
			if (err) {obj.reply({"error":"System error. Try again later"});dbp.release();throw err;}
			var query = dbp.query("SELECT uRec FROM users WHERE uid = ? AND userType = 1 ",[obj.request.payload.clientUid],function(err,set){

				if (err) {obj.reply({"error":"System error. Try again later"});dbp.release();throw err;}

				obj.client = {};
				obj.client.uRec = set[0].uRec;
				processSaveRequest(obj);
				dbp.release();

			}); //- query

		}); //- pool
	}

} //- ef

function processSaveRequest(obj) {

	var dataLimit = 200; //in megabytes

	var returnType = 'application/json';
	if (obj.request.payload.uploadType == 'iframe') returnType = 'text/html';


	app.logit("PAYLOAD: ",obj.request.payload);

	var input = {};
	var desc = "";

	//sanitize user input
	obj.request.payload.fileDesc = app.clean(obj.request.payload.fileDesc);
	obj.request.payload.file.filename = app.clean(obj.request.payload.file.filename);

	obj.request.payload.providerShare = app.clean(obj.request.payload.providerShare);

	//check values
	if (obj.request.payload.fileDesc.length > 0) {
		desc = obj.request.payload.fileDesc;
		//input.desc = "AES_ENCRYPT('" + obj.request.payload.fileDesc + "'," + app.config.keys.cypherKey +")";
	} else {
		//input.desc = "AES_ENCRYPT('No Description'," + app.config.keys.cypherKey +")";
		desc = "No description";
	}

	if (parseInt(obj.request.payload.recordCat) > 0) {
		input.cat = parseInt(obj.request.payload.recordCat);
	} else {
		input.cat = 100;
	}

	var file = obj.request.payload.file;

	input.filename = file.filename;

	if (input.filename.length == 0) {
		app.logit('warn','Got empty file in UserRecordServer');
		obj.reply({"error":"Sorry, but I didn't get the file"}).type(returnType);
	}

	if (parseInt(file.bytes) == 0) {
		obj.reply({"error":"Sorry, but your file was empty"}).type(returnType);

	} else if (parseInt(file.bytes) > dataLimit * 1024 * 1024) {
		obj.reply({"error":"Sorry, but your file was bigger then the max size of " + dataLimit + " mb."}).type(returnType);
	}

	if (file.headers['content-type'].length > 0) {
		input.docType = file.headers['content-type'];
	} else {
		input.docType = 'application/unknown';
	}


	input.added = new Date();
	input.uploader = obj.user.uRec;

	app.logit("INPUT: ",input);

	obj.shareArray = [];
	if (obj.user.userType == app.k.userType.user) {
		input.uRec = obj.user.uRec;
		obj.shareUrec = obj.user.uRec;
		if (_.isString(obj.request.payload.providerShare) && obj.request.payload.providerShare.length > 5) {
			obj.shareArray = obj.request.payload.providerShare.split(",");
		}
	} else if (obj.user.userType == app.k.userType.prov || obj.user.userType == app.k.userType.cg) {
		input.uRec = obj.client.uRec;
		obj.shareUrec = obj.client.uRec;
		obj.shareArray.push(obj.user.uid);
	}


	//save record table
	pool.getConnection(function(err, dbp) {
		if (err) {obj.reply({"error":"System error. Try again later"});dbp.release();throw err;}

		var query = dbp.query("INSERT INTO userRecords SET ?, `desc` = AES_ENCRYPT(?,?)", [input,desc,app.config.keys.cypherKey], function(err,row){

			if (err) {obj.reply({"error":"System error. Try again later"});dbp.release();throw err;}

			obj.recordId = row.insertId;
			//save shares
			if (_.isArray(obj.shareArray)) {
				saveShared(obj);
				sendShareNotifications(obj,[obj.request.payload.clientUid]);
			}

			//add chunks
			var stream = fs.createReadStream(obj.request.payload.file.path);

			var chunk;
			var chunkCount = 0;

			 //this will mark when the record as done when the stream ends
			 stream.on('end',function(){
				 dbp.query("UPDATE userRecords SET done = ? WHERE recordId = ?",[chunkCount,obj.recordId],function(err,row){
				  if (err) {obj.reply({"error":"System error. Try again later"});dbp.release();throw err;}
				  fs.unlink(obj.request.payload.file.path,function(err){ if (err) {throw err;}});
				  dbp.release();
				  obj.reply({"resp":"OK"}).type(returnType);
				  }); //- update
			 }); //- end

			stream.on('readable', function() {

			  while (null !== (chunk = stream.read( 16 * 1024 * 1024 ))) { //64 * 1024 * 1024
			    app.logit('got %d bytes of data with count %d', chunk.length, chunkCount, obj.request.payload.file.filename);
			    var query = dbp.query("INSERT INTO userRecordChunks SET recordId = ?, seq = ?, chunk = AES_ENCRYPT(?,?) ",[obj.recordId,chunkCount,chunk,app.config.keys.cypherKey],function(err,row){
				    if (err) {obj.reply({"error":"System error. Try again later"});throw err;dbp.release();}
			    }); //- insert
			    chunkCount ++;
			  } //- while


				  //obj.reply({"resp":"OK"}).type(returnType);

			}); //-stream

		});

	}); //- pool

} //ef processSaveRequest

function updateShare(obj) {

	var recordId = parseInt(obj.request.payload.recordId);
	obj.shareUrec = obj.user.uRec;

	if (_.isNumber(recordId)) { //add shares

		pool.getConnection(function(err, dbp) {
		if (err) {obj.reply({"error":"System error. Try again later"});dbp.release();throw err;}

			async.series([

				function(callback) {
				//get array of providers who need to be notified
					if (_.isArray(obj.request.payload.providerShareArray) && obj.request.payload.providerShareArray.length > 0) {

						var query = dbp.query("SELECT distinct(shareId) FROM userRecordShare WHERE recordId = ? AND shareId IN (?)",[recordId, obj.request.payload.providerShareArray],function(err,set){
							if (err) {obj.reply({"error":"System error. Try again later"});dbp.release();throw err;}
							var oldShared = [];
							_.map(set,function(o){oldShared.push(o.shareId)});
							var notify = _.difference(obj.request.payload.providerShareArray,oldShared);
							sendShareNotifications(obj,notify);
							callback(null,true);
						});
					} else {
						callback(null,true);
					}
				}, //- send notifications

				function(callback) {
					//save shares
					var query = dbp.query("DELETE FROM userRecordShare WHERE recordId = ?",[recordId],function(err,row){
					if (err) {obj.reply({"error":"System error. Try again later"});dbp.release();throw err;}

					if (_.isArray(obj.request.payload.providerShareArray) && obj.request.payload.providerShareArray.length > 0) {
						obj.recordId = recordId;
						obj.shareArray = obj.request.payload.providerShareArray;
						saveShared(obj);

					} else {

					}
					//obj.reply({"resp":"OK","returnArray":obj.shareArray});
					callback(null,true);

					}); //- query
				} //- save shares

			],function(err,ret){

				if (err) {obj.reply({"error":"System error. Try again later"});dbp.release();throw err;}
				dbp.release();

				if (_.isArray(ret)) {
					obj.reply({"resp":"OK","returnArray":obj.shareArray});
				}
			});



		}); //- pool


	} else { //- is_number
		obj.reply({"error":"Record ID not specified"});
	}



} //-ef

function saveShared(obj) {

	app.logit("Got to share: ",obj.shareArray);


	if (_.isNumber(obj.recordId) && _.isArray(obj.shareArray) && obj.shareArray.length > 0 ) { //add shares

		//delete current shares
		pool.getConnection(function(err, dbp) {
		if (err) {obj.reply({"error":"System error. Try again later"});dbp.release();throw err;}

			var query = dbp.query("DELETE FROM userRecordShare WHERE recordId = ?",[obj.recordId],function(err,set){

				if (err) {obj.reply({"error":"System error. Try again later"});dbp.release();throw err;}

				//loop and save
				_.each(obj.shareArray,function(item){

					query = dbp.query("INSERT INTO userRecordShare SET recordId = ?, urec = ?, shareId = ?, type = 1",[obj.recordId,obj.shareUrec,item],function(err,set){
						if (err) {obj.reply({"error":"System error. Try again later"});dbp.release();throw err;}
					});

				}); //- each

			}); //- deletequery


		}); //- get pool

	} else {

	}

} //- saveShared

function sendShareNotifications(obj,notify) {

	var msg = "";
	var subject = "";
	if (obj.user.userType == app.k.userType.prov || obj.user.userType == app.k.userType.cg) {
		msg = obj.user.fname + " " + obj.user.lname + " has added a document to your personal health record.";
		subject = "A medical record has been added to your C3HealthLink account."
	} else {
		msg = obj.user.fname + " " + obj.user.lname + " has added a document and shared it with you via your C3HealthLink account.";
		subject = "A health record has been added to your C3HealthLink account.";
	}

	msg += "<br /><br />Please login to your <a href='" + app.config.url + "'>C3HealthLink</a> account to review it.";


	pool.getConnection(function(err, dbp) {

		if (err) {obj.reply({"error":"System error. Try again later"});throw err;}

		var query = dbp.query("SELECT email FROM users WHERE uid IN (?)",[notify],function(err,set){

			if (err) {obj.reply({"error":"System error. Try again later"});throw err;}

			_.each(set,function(row){
				app.sendUserEmail({"to":app.psyDecrypt(row.email),"subject":subject,"message":msg});

			}); //- each

		}); //- query

	});



} //- sendShareNotifications

function sendRecord(request,reply) {

	userObject.create({"authType":"webtoken","request":request,"reply":reply,"callback":function(obj){

		var filestream = new ReadableStream;

		var recordId = parseInt(request.query.id);

		if (_.isNumber(recordId)) {

			pool.getConnection(function(err, dbp) {

				if (err) {obj.reply({"error":"System error. Try again later"});throw err;}

				var record = {};
				var q = dbp.query("SELECT *,a.recordId as recordId FROM userRecords a LEFT JOIN userRecordShare b ON (a.recordId = b.recordId) WHERE a.recordId = ? AND a.done > 0 AND (a.uRec = ? OR a.uploader = ? OR b.shareId = ?) LIMIT 1",[recordId,obj.uRec,obj.uRec,obj.user.uid],function(err,row){
				//var q = dbp.query("SELECT * FROM userRecords a, userRecordShare b WHERE a.recordId = b.recordId AND a.recordId = ? AND a.done > 0 AND (a.uRec = ? OR a.uploader = ? OR b.shareId = ?) ",[recordId,obj.uRec,obj.uRec,obj.user.uid],function(err,row){
					if (err) {obj.reply({"error":"System error. Try again later"});dbp.release();throw err;}

					if (row.length == 1) {
						record = row[0];

						var seq = 0;
						var query;

						filestream._read = function() {
							//this needs to go here to avoid async race problem
							seq++;
							if (seq <= record.done) {
								query = dbp.query("SELECT AES_DECRYPT(chunk,?) as chunk FROM userRecordChunks WHERE recordId = ? AND seq = ? LIMIT 1",[app.config.keys.cypherKey,record.recordId,seq-1]);
								query
								.on('error',function(err){dbp.release();throw err;})
								.on('result',function(chunk){
									filestream.push(chunk.chunk);
								});

							} else {
								filestream.push(null);
							} //- if

						} //- filestream

						if (parseInt(request.query.dl) == 1) {
							reply(filestream).header('Content-Disposition','attachment; filename=' + record.filename,{append:true}).type(record.docType);
						} else {
							reply(filestream).type(record.docType);
						} //- if
						dbp.release();

					} else {
						obj.reply({"error":"I couldn't find that document. You may need to log in again. [NILR]"});
					}

				}); //- select

			}); //- pool

		} else { //-if
			obj.reply({"error":"System error: Bad Record Id. Try again later"});
		}

	} //- user obj callback

	}); //-user obj

}


exports.dispatch=dispatch;
exports.saveDocument=saveDocument;
exports.sendRecord = sendRecord;
