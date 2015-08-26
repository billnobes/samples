
client.meds.slugs = {};
client.meds.templates = {};
client.meds.editMed = {};

$(document).ready(function(){
	
	if (!_.isString(client.meds.slugs.main)) {
		client.meds.slugs.main = $('#medPageSlug').html();
		$('#medPageSlug').remove();
	}
	
	
	//templates
	client.meds.template = {};
	
	client.meds.template.medStat   = _.template($('#medStatSlug').html());
	$('#medStatSlug').remove();
	
	client.meds.template.medEditor = _.template($('#medEditorSlug').html());
	$('#medEditorSlug').remove();

	client.meds.template.medManage = _.template($('#medManageSlug').html());
	$('#medManageSlug').remove();

	client.meds.template.medManageList = _.template($('#medManageListSlug').html());
	$('#medManageListSlug').remove();

	client.meds.template.medManageDetail = _.template($('#medManageDetailSlug').html());
	$('#medManageDetailSlug').remove();

	client.meds.template.medOtherList = _.template($('#medOtherListSlug').html());
	$('#medOtherListSlug').remove();
	
	
});

//events
$(document).on("click touch",'.medMenu',function(e){
	e.preventDefault();
	var medPane = $(this).attr('id');
	app.logit("Got Med Pane: ",medPane);
	
	
	switch (medPane) {
		
	case 'showMedActive':
		if ( !_.isObject(client.meds.userMeds) || client.meds.userMeds.length == 0 ) {		
			//client.meds.reloadMeds(client.meds.load);
			client.meds.reloadMeds();
		}
		else {
			app.logit("user meds: ",client.meds.userMeds);
			client.meds.load();
		}
		break;

	case 'showMedManage':
		if ( !_.isObject(client.meds.userMeds) || client.meds.userMeds.length == 0 ) {		
			client.meds.reloadMeds();
		}
		else {
			app.logit("user meds: ",client.meds.userMeds);
			client.meds.loadManage();
		}
		break;
	
	case 'showMedSideEffects':
		if ( !_.isObject(client.meds.sideEffects) || client.meds.sideEffects.length == 0 ) {		
			client.meds.reloadSideEffects();
		}
		else {
			client.meds.loadSideEffects();
		}
		break;

	case 'showMedOther':
		if ( !_.isObject(client.meds.userMedsOther) || client.meds.userMedsOther.length == 0 ) {		
			client.meds.reloadMedsOther();
		}
		else {
			app.logit("user meds: ",client.meds.userMedsOther);
			client.meds.loadOtherMeds();
		}
		break;
	}

	//e.preventDefault();
	
})//-e med menu

$(document).on("click touch",'.medClick',function(e){
	e.preventDefault();
	var userMedId = $(this).attr('data-role-userMedId');	
	client.meds.stats(userMedId);
})//-e med click

$(document).on("click touch",'.addNewMed',function(e){
	e.preventDefault();
	var userMedId = $(this).attr('data-role-userMedId');
	if (_.isNumber(userMedId) && userMedId > 0 ) {
		client.meds.edit(userMedId);
	} else {
		client.meds.startNewMed();
	}
})//-e addNewMed

$(document).on('click touch','#searchMed',function(e){
	e.preventDefault();
	client.meds.searchMedName();
});

$(document).on('click touch','#selectMed',function(e){
	e.preventDefault();
	client.meds.editMed.medId = $('#medDropdown option:selected').attr('medId');
	client.meds.editMed.medOther = $('#medDropdown option:selected').html();
	$('#medEditDiv').html("<div align='center'><br /><br /><br /><br /><br /><br /><br /><img src='/images/loaderProvider.png'></div>");
	client.meds.startMedEdit();
});

$(document).on('click touch','#editMedFromStat',function(e){
	e.preventDefault();
	client.meds.editMed.userMedId = client.resp.medStat.userMedId;
	client.meds.editMed.medOther = client.resp.medStat.medOther;
	$('#medDialog').dialog("close");
	$('#medEditDialog').dialog({modal: true,width: 640,height: 450,title:"Med Editor",
		buttons: {"Save":function(){client.meds.saveMed()},"Cancel": function() {$(this).dialog( "close" );}}});
	$('#medEditDiv').html("<div align='center'><br /><br /><br /><br /><br /><br /><br /><img src='/images/loaderProvider.png'></div>");
	client.meds.startMedEdit();
});

$(document).on('change', "select[name='frequencySelect']", function(e) {
	client.meds.updateMedEditTimes();
});

$(document).on('click touch','.medManageIcon',function(e){
	e.preventDefault();
		
	var id = e.currentTarget.id.split('-');
	var userMedId = id[1];

	var currentMed = _.findWhere(client.meds.userMeds,{"userMedId":parseInt(id[1])});
	if ( !_.isObject(currentMed) ) {
		currentMed = _.findWhere(client.meds.userMedsInactive,{"userMedId":parseInt(id[1])});
	}
	if ( !_.isObject(currentMed) ) {
		alert ('There was a system error. Please try again later.');
		app.logit('unknown error meds.js.');
	}
			
	client.meds.editMed.medId = currentMed.medId;
	client.meds.editMed.userMedId = id[1];
	client.meds.editMed.medOther = currentMed.medOther;

	switch ( id[0] ) {

		case 'deleteMed':
			client.meds.deleteMedCheck();
		break;

		case 'stopMed':
			client.meds.stopStartMed('stop');
		break;

		case 'startMed':
			client.meds.stopStartMed('start');
		break;

		case 'editMed':
			$('#medEditDialog').dialog({modal: true,width: 640,height: 450,title:"Med Editor",
				buttons: {"Save":function(){client.meds.saveMed()},"Cancel": function() {$(this).dialog( "close" );}}});
			$('#medEditDiv').html("<div align='center'><br /><br /><br /><br /><br /><br /><br /><img src='/images/loaderProvider.png'></div>");
			client.meds.startMedEdit();

		break;

		case 'showMedDetails':
			var bodyId = '#medManageDetail-' + id[1];
			if ( $(bodyId).is( ":hidden" ) ) {
				$('#medManageDetail-'+id[1]).html("<div align='center'><img src='/images/loaderProvider.png'></div>");
				$(bodyId).slideDown( "slow" );
				app.logit(client.meds.userMeds);
				var currentMed = _.findWhere(client.meds.userMeds,{"userMedId":parseInt(id[1])});
				if ( !_.isObject(currentMed) ) {
					currentMed = _.findWhere(client.meds.userMedsInactive,{"userMedId":parseInt(id[1])});
				}
				if ( !_.isObject(currentMed) ) {
					alert ('There was a system error. Please try again later.');
					app.logit('unknown error meds.js.');
				}
				
				if ( !_.isObject(currentMed.history) || currentMed.history.length == 0 ) {
					client.meds.currentMedId = id[1];
					client.meds.getMedHistory();
				}
  			} else {
  				$(bodyId).slideUp('slow');
  			}
		break;		
	}

});


client.meds.reloadMeds = function() {
	
	$.ajax({
		  type: "POST",
		  url: server.config.postUrl + '/prov',
		  data: {"action":"clientsPatientDetail","authType":"webtoken","uid":client.cuid,"pane":"meds"},
		  success: function(resp){
			 
			 if (_.isString(resp.error)) {
				 alert(resp.error);
				 if (_.isString(resp.redir)) {location.href = resp.redir;}
			 } else if (_.isObject(resp) && resp.resp === "OK") {

			 	app.updatePage(resp);

			 	client.resp = resp;
			 	client.meds.medVars = client.resp.medVars;
			 	client.meds.userMeds = client.resp.userMeds;
			 	client.meds.userMedsInactive = client.resp.userMedsInactive;
			 	if ( _.isObject(client.meds.loadPage) ) {
				 	client.meds.loadPage();
				 }
				 else {
				 	client.meds.load();
				 }
			 	
			 } else {
				 alert ('There was a system error. Please try again later.');
				 app.logit('unknown error join.sendRequest.');
			 }
		  },
		  error: function(x,err) {
			  alert ('There was a system error. Please try again later.');
				 app.logit('unknown error join.sendRequest. MSG: ' + err);
		  },
		  dataType: 'json',
		  xhrFields: { withCredentials: true }	
		});
} // ef reloadMeds

client.meds.reloadMedsOther = function() {
	
	$.ajax({
		  type: "POST",
		  url: server.config.postUrl + '/prov',
		  data: {"action":"clientsPatientDetail","authType":"webtoken","uid":client.cuid,"pane":"meds","medAction":"getOtherMeds"},
		  success: function(resp){
			 
			 if (_.isString(resp.error)) {
				 alert(resp.error);
				 if (_.isString(resp.redir)) {location.href = resp.redir;}
			 } else if (_.isObject(resp) && resp.resp === "OK") {

			 	app.updatePage(resp);

			 	client.resp = resp;
			 	client.meds.userMedsOther = client.resp.userMedsOther;
				client.meds.loadOtherMeds();
			 	
			 } else {
				 alert ('There was a system error. Please try again later.');
				 app.logit('unknown error meds.loadOtherMeds.');
			 }
		  },
		  error: function(x,err) {
			  alert ('There was a system error. Please try again later.');
				 app.logit('unknown error meds.loadOtherMeds. MSG: ' + err);
		  },
		  dataType: 'json',
		  xhrFields: { withCredentials: true }	
		});
} // ef reloadMedsOther

client.meds.reloadSideEffects = function() {
	$.ajax({
		  type: "POST",
		  url: server.config.postUrl + '/prov',
		  data: {"action":"clientsPatientDetail","authType":"webtoken","uid":client.cuid,"pane":"meds", "medAction":"getSideEffects"},
		  success: function(resp){
			 
			 if (_.isString(resp.error)) {
				 alert(resp.error);
				 if (_.isString(resp.redir)) {location.href = resp.redir;}
			 } else if (_.isObject(resp) && resp.resp === "OK") {

			 	app.updatePage(resp);
			 
		 		client.resp = resp;
			 	_.each(resp.sideEffects, function(s) {	
			 		s.created  = moment.utc(s.created);
			 		if ( client.resp.patient.tz ) {
			 			s.created = moment(s.created).tz(client.resp.patient.tz);
					}
					else {
						s.created  = moment.utc(s.created).toDate();
					}
					s.created = moment(s.created).format('MMM D, YYYY @ h:mm a');
				});
			
			 	client.meds.sideEffects = client.resp.sideEffects;
			 	client.meds.loadSideEffects();
			 	
			 	
			 } else {
				 alert ('There was a system error. Please try again later.');
				 app.logit('unknown error join.sendRequest.');
			 }
		  },
		  error: function(x,err) {
			  alert ('There was a system error. Please try again later.');
				 app.logit('unknown error join.sendRequest. MSG: ' + err);
		  },
		  dataType: 'json',
		  xhrFields: { withCredentials: true }	
		});
} // ef reloadSideEffects

client.meds.getMedHistory = function() {
	
	var userMedId = client.meds.currentMedId;
	var currentMed = _.findWhere(client.meds.userMeds,{"userMedId":parseInt(userMedId)});
	if ( !_.isObject(currentMed) ) {
		currentMed = _.findWhere(client.meds.userMedsInactive,{"userMedId":parseInt(userMedId)});
	}
	if ( !_.isObject(currentMed) ) {
		alert ('There was a system error. Please try again later.');
		app.logit('unknown error meds.js.');
	}
	
	currentMed.history = [];
	$.ajax({
		  type: "POST",
		  url: server.config.postUrl + '/prov',
		  data: {"action":"clientsPatientDetail","authType":"webtoken","uid":client.cuid,"pane":"meds","medAction":"getMedHistory","userMedId":userMedId},
		  success: function(resp){
			 
			 if (_.isString(resp.error)) {
				 alert(resp.error);
				 if (_.isString(resp.redir)) {location.href = resp.redir;}
			 } else if (_.isObject(resp) && resp.resp === "OK") {

			 	app.updatePage(resp);

			 	client.resp = resp;
			 	currentMed.history = resp.medHistory;
			 	client.meds.loadMedHistory();
			 } else {
				 alert ('There was a system error. Please try again later.');
				 app.logit('unknown error meds.js.');
			 }
		  },
		  error: function(x,err) {
			  alert ('There was a system error. Please try again later.');
				 app.logit('unknown error join.sendRequest. MSG: ' + err);
		  },
		  dataType: 'json',
		  xhrFields: { withCredentials: true }	
		});
} // ef getMedHistory

client.meds.loadMedHistory = function() {
	
	var userMedId = client.meds.currentMedId;
	var currentMed = _.findWhere(client.meds.userMeds,{"userMedId":parseInt(userMedId)});
	if ( !_.isObject(currentMed) ) {
		currentMed = _.findWhere(client.meds.userMedsInactive,{"userMedId":parseInt(userMedId)});
	}
	if ( !_.isObject(currentMed) ) {
		alert ('There was a system error. Please try again later.');
		app.logit('unknown error meds.js.');
	}
	
	var medDiv = '#medManageDetail-'+userMedId;

	if ( !_.isObject(currentMed) || !_.isObject(currentMed.history) || currentMed.history.length == 0 ) {
		$(medDiv).html("<div align='center'>No history data available for this medication</div>");
		return;
	}

	var medList = client.meds.template.medManageDetail({
		'medManageDate': '<strong>Date</strong>',
		'medManageDue': '<strong>Due</strong>',
		'medManageResponded': '<strong>Responded</strong>',
		'medManageDoses': '<strong>Doses</strong>',
		'medManageStatus': '<strong>Status</strong>'
	});	
	
	currentMed.history = currentMed.history.sort(function(a,b){if (b.utc > a.utc) return 1; else return -1;});

	_.each(currentMed.history, function(mh) {
	  			
  		var medTime  = moment.utc(mh.utc);
  		var medResponded  = moment.utc(mh.responded);
  		if ( client.resp.patient.tz ) {
			medTime = moment(medTime).tz(client.resp.patient.tz);
			medResponded = moment(medResponded).tz(client.resp.patient.tz);
		}
		else {
			medTime = moment.utc(medTime).toDate();
			medResponded = moment.utc(medResponded).toDate();
		}
		
		if ( medResponded.isValid() ) {
			medResponded = medResponded.format('MM/DD/YYYY');
		}
		else {
			medResponded = "&nbsp;";
		}
		
		var status = 'unreported';
		if ( mh.missed == 1 ) {
			status = 'missed';
		}
		if ( mh.taken == 1 ) {
			status = 'taken';
		}
		
		var due = medTime.format('h') + ":" + medTime.format('mm') + " " + medTime.format('a');
//				app.logit("mh: ",mh);
		medList += client.meds.template.medManageDetail({
		'medManageDate': medTime.format('MM/DD/YYYY'),
		'medManageDue': due,
		'medManageResponded': medResponded,
		'medManageDoses': mh.quantity,
		'medManageStatus': status
		});	
	});
  			

	
	$(medDiv).html(medList);

}

client.meds.load = function() {
	
	client.meds.loadPage = client.meds.load;
	
	var medAlert = "<img src='/provider/images/circleRed.png'>";
	
	$('#contentDiv').html(client.meds.slugs.main);
	$( "#medMenu" ).buttonset();

	if (!_.isObject(client.meds.userMeds) || client.meds.userMeds.length == 0) {	
 		client.meds.medVars = client.resp.medVars;
 		client.meds.userMeds = client.resp.userMeds;
 		client.meds.userMedsInactive = client.resp.userMedsInactive;
	}
		
	app.logit("MEDDDDD :",client.meds.userMeds);
	
	if (_.isObject(client.meds.userMeds) && client.meds.userMeds.length > 0) {
		
		var boxHtml = "";
		var medText = "";
		var html = "";
		
		_.each(client.meds.userMeds,function(m){
			
			if (m.medId == 0) {
				medText = m.medDosageOther + " " + m.medUnitOther + " " + m.medFormOther + "; ";
			} else {
				medText = m.dosage + " " + m.form + "; ";
			}
			
			medText += client.meds.medVars.frequency[m.frequency].name + ".<br/>";
			if (_.isString(m.lastTaken)) {
				medText += "Last taken: " + moment(m.lastTaken).format(app.dateFormat) + "<br />";
			}
			
			var showAlert = '';
			if (_.isObject(m.compliance30day) && m.frequency != 'prn' && m.compliance30day.doses > 0) {
				var ratio = m.compliance30day.taken / m.compliance30day.doses;
				ratio = Math.round(ratio * 100);
				if (ratio < 80) {showAlert = medAlert};
				medText += "Compliance in last 30 days: " + ratio + "%";
			} else {
				medText += "No compliance data is available";
			}
			
			html = client.meds.templates.medBox(
				{"medName":m.medOther,"medText":medText,"medIcon":showAlert,"userMedId":m.userMedId});
			
			boxHtml += html;
			
		}); //- each
		
		boxHtml += "<div class='' style='clear: both'>&nbsp;</div>";
		
		$('#medContentDiv').html(boxHtml);
		
	} else {
		$('#medContentDiv').html("<div class='center'><br /><br />No medication entries to display</div>");
	}
	
}

client.meds.loadSideEffects = function() {
	
	client.meds.loadPage = client.meds.loadSideEffects;
	
	//var medAlert = "<img src='/provider/images/circleRed.png'>";
	
//	$('#contentDiv').html(client.meds.slugs.main);
//	$( "#medMenu" ).buttonset();
	
//	app.logit("sideeffects :",client.meds.sideEffects);
//	client.meds.sideEffects = [];
	$('#addNewMedText').hide();
	
	if (_.isObject(client.meds.sideEffects) && client.meds.sideEffects.length > 0) {
		
		var seHtml = "<br /><div class='medSideEffectDiv grayBorder radius'><div class='medSideEffectTitle'>Severity Scale: 0 = Not reported, 1= Not at all, 2 = A little bit, 3 = Somewhat\
, 4 = Pretty Much, 5 = A lot</div><br /><br />" +
					"<div class='medSideEffectC1'>Side Effect</div><div class='medSideEffectC2'>Created</div><div class='medSideEffectC3'>Rating</div><br /><br />";
		
		var sideEffects = client.meds.sideEffects.sort(function(a,b) {return moment(b.created) - moment(a.created)});

		_.each(sideEffects,function(s){			
			seHtml += "<div class='medSideEffectC1'>" + s.sideEffect + "</div><div class='medSideEffectC2'>" + s.created + "</div><div class='medSideEffectC3'>" + s.rating + "</div><br />";
		}); //- each
		
		seHtml += "</div><div class='' style='clear: both'>&nbsp;</div>";
		
		$('#medContentDiv').html(seHtml);
		
	} else {
		$('#medContentDiv').html("<div class='center'><br /><br />No side effects to display</div>");
	}
	
}

client.meds.loadOtherMeds = function() {
	
	client.meds.loadPage = client.meds.loadOtherMeds;

	$('#addNewMedText').hide();
	
	if (_.isObject(client.meds.userMedsOther) && client.meds.userMedsOther.length > 0) {
		
		var otherHtml = "<div class='medOtherDiv grayBorder radius'>";
		otherHtml += client.meds.template.medOtherList({'medOtherName':'<strong>Name</strong>',
														   'medOtherAdded':'<strong>Added</strong>',
														   'medOtherQuantity':'<strong>Quantity</strong>',
														   'medOtherDose':'<strong>Dose</strong>'});
		
		otherHtml += "<br />";
		
		var medsOther = client.meds.userMedsOther.sort(function(a,b) {return moment(b.added) - moment(a.added)});

		_.each(medsOther,function(m){
			
			var added  = moment.utc(m.added);
			if ( client.resp.patient.tz ) {
				added = moment(added).tz(client.resp.patient.tz);
			}
			else {
				added = moment.utc(added).toDate();
			}

			otherHtml += client.meds.template.medOtherList({'medOtherName':m.otherName,
														   'medOtherAdded':added.format('MM/DD/YYYY'),
														   'medOtherQuantity':m.quantity,
														   'medOtherDose':m.otherDose});

		}); //- each
		otherHtml += "</div>";
		
		$('#medContentDiv').html(otherHtml);
		
	} else {
		$('#medContentDiv').html("<div class='center'><br /><br />No other medications to display</div>");
	}
	
} //ef load other meds

client.meds.loadManage = function() {

	client.meds.loadPage = client.meds.loadManage;

	$('#addNewMedText').hide();

    $('#medContentDiv').html(client.meds.template.medManage);
	if (!_.isObject(client.meds.userMeds) || client.meds.userMeds.length == 0) {	
 		client.meds.medVars = client.resp.medVars;
 		client.meds.userMeds = client.resp.userMeds;
 		client.meds.userMedsInactive = client.resp.userMedsInactive;
	}
	
	if (_.isObject(client.meds.userMeds) && client.meds.userMeds.length > 0) {
		
		var medList = "";
		_.each(client.meds.userMeds, function(m){ 

			var medText = '';
			var manageDetailId = "medManageDetail-" + m.userMedId;
			
			if (m.medId == 0) {
				medText = m.medDosageOther + " " + m.medUnitOther + " " + m.medFormOther + "; ";
			} else {
				medText = m.dosage + " " + m.form + "; ";
			}
			medText += client.meds.medVars.frequency[m.frequency].name + ".<br/>";
			medList += client.meds.template.medManageList({'medName':m.medOther, 'medDesc':medText, "userMedId":m.userMedId});
			medList += "<div class='medManageDetail grayBorder radius' id='" + manageDetailId + "'>";
			medList += "</div>";
		});
		$('#medActiveList').html(medList);
	} else {
		$('#medActiveList').html("<div class='center'><br /><br />No medication entries to display</div>");
	}

	if (_.isObject(client.meds.userMedsInactive) && client.meds.userMedsInactive.length > 0) {
//		var medList = "";
		$('#medInactiveList').html('');		

		_.each(client.meds.userMedsInactive, function(m){ 

			var medText = '';
			var medList = '';
			var manageDetailId = "medManageDetail-" + m.userMedId;

			if (m.medId == 0) {
				medText = m.medDosageOther + " " + m.medUnitOther + " " + m.medFormOther + "; ";
			} else {
				medText = m.dosage + " " + m.form + "; ";
			}
			medText += client.meds.medVars.frequency[m.frequency].name + ".<br/>";
//			medList += client.meds.template.medManageList({'medName':m.medOther, 'medDesc':medText, "userMedId":m.userMedId});
			medList += client.meds.template.medManageList({'medName':m.medOther, 'medDesc':medText, "userMedId":m.userMedId});
			
			medList += "<div class='medManageDetail grayBorder radius' id='" + manageDetailId + "'>";
			medList += "</div>";
			$('#medInactiveList').append(medList);
			
			$('#stopMed-'+m.userMedId).hide();
			$('#startMed-'+m.userMedId).show();
			
		});
	} else {
		$('#medInactiveList').html("<div class='center'><br /><br />No medication entries to display</div>");
	}
	
} //- ef loadManage

client.meds.stats = function(userMedId) {
	
	$('#medStatsDiv').html("<div align='center'><br /><br /><br /><br /><br /><br /><br /><img src='/images/loaderProvider.png'></div>");
	
	$('#medDialog').dialog({modal: true,width: 800,height: 800,title:"Loading...",show:"slideDown",buttons: {Ok: function() {$(this).dialog( "close" );}}});

	$.ajax({
		  type: "POST",
		  url: server.config.postUrl + '/prov',
		  data: {"action":"clientsPatientDetail","authType":"webtoken","uid":client.cuid,
			  "pane":client.pane,"medAction":"getMedStat","userMedId":userMedId},
		  success: function(resp){
			 
			 if (_.isString(resp.error)) {
				 alert(resp.error);
				 if (_.isString(resp.redir)) {location.href = resp.redir;}
			 } else if (_.isObject(resp) && resp.resp === "OK") {

			 	app.updatePage(resp);
			 	client.resp = resp;
			 	client.meds.statsDisplay();
			 	
			 	
			 } else {
				 alert ('There was a system error. Please try again later.');
				 app.logit('unknown error join.sendRequest.');
			 }
		  },
		  error: function(x,err) {
			  alert ('There was a system error. Please try again later.');
				 app.logit('unknown error join.sendRequest. MSG: ' + err);
		  },
		  dataType: 'json',
		  xhrFields: { withCredentials: true }	
		});


	
} //- client.meds.stats

client.meds.statsDisplay = function() {
	
	var html = "<div class='center' style='margin-top: 100px'>There is no data available for this medication.<br /><br /><br /><br /><br /><a href='#' id='editMedFromStat'>Edit this med</a></div>";
	
	if (_.isArray(client.resp.medStat.data) && client.resp.medStat.data.length > 0) {
		client.resp.medStat.data = client.resp.medStat.data.sort(function(a,b){if (a.date > b.date) return 1; else return -1;});
		
		app.logit("Ready to make meds");
		
		var currentMed = _.findWhere(client.meds.userMeds,{"userMedId":parseInt(client.resp.medStat.userMedId)});
		app.logit("CURRENT: ",currentMed);
		
		$('#medDialog').dialog({title:currentMed.medOther});
		
		var medComments = ""; //"No medication comments available";
		
		if (_.isArray(client.resp.medStat.medComments) && client.resp.medStat.medComments.length > 0 ) {
			medComments = "<div class='center bold'>Medication Comments</div><table style='width: 500px; margin: auto;'>";
			_.each(client.resp.medStat.medComments,function(c){
				medComments += "<tr><td>" + moment(c.added).format(app.dateFormat) + "</td><td style='text-align: left'>" + c.comment + "</td></tr>";
			}); //-each
			medComments += "</table>";
		}

		
		html = client.meds.template.medStat({
			"doses":currentMed.compliance30day.doses,
			"taken":currentMed.compliance30day.taken,
			"missed":currentMed.compliance30day.missed,
			"unreported":currentMed.compliance30day.unreported,
			"medComments": medComments
		});
		
		$('#medStatsDiv').html(html);
		
		$("#medStatGraph").highcharts({
			credits: {
				enabled: false
			},
	        chart: {
	            plotBackgroundColor: null,
	            plotBorderWidth: null,
	            plotShadow: false,
	            height: 440
	        },
	        title: {
	            text: currentMed.medOther + " " + currentMed.compliance30day.days + ' Day Compliance'
	        },

	        plotOptions: {
	            pie: {
	                allowPointSelect: true,
	                cursor: 'pointer',
	                dataLabels: {
	                    enabled: true,
	                    format: '<b>{point.name}</b>: {point.percentage:.1f} %'
	                 
	                }
	            }
	        },
	        series: [{
	            type: 'pie',
	            name: 'Doses',
	            data: [
	                
	                {
	                    name: 'Took',
	                    y: currentMed.compliance30day.taken,
	                    sliced: true,
	                    selected: true,
	                    color: '#43ce54'
	                },
	                
	                {
		                name:'Missed', 
		                y: currentMed.compliance30day.missed,
		                color: '#ff6159'
		             },
		             {
		                name:'Unreported', 
		                y: currentMed.compliance30day.unreported,
		                color: '#C8C8C8'
		             }
	            ]
	        }]
	    }); //- highcharts
	
	
	} else {
		$('#medStatsDiv').html(html);
	}

	
} //- statsDisplay

client.meds.startNewMed = function () {
	
	client.meds.editMed.medId = 0;
	client.meds.editMed.userMedId = 0;
	
	$('#medEditDialog').dialog({modal: true,width: 640,height: 450,title:"Med Editor",show:"slideDown",
		buttons: {"Save":function(){client.meds.saveMed()},"Cancel": function() {$(this).dialog( "close" );}}});
	
	$('#medEditDiv').html(client.meds.templates.medSearch({}));
	$("button").button();
	
	
} //-f newMed

client.meds.searchMedName = function() {
	
	app.logit("SEARCH MED");
	var searchString = $('input[name=medNameSearch]').val();
	
	if (!_.isString(searchString) || searchString.length == 0) {
		alert("Nothing to search."); return;
	}
	
	$('#medSearchSelect').html("<div align='left'><br />Searching...<br /><img src='/images/loaderProvider.png'></div>");
	
	$.ajax({
		  type: "POST",
		  url: server.config.postUrl + '/prov',
		  data: {"action":"clientsPatientDetail","authType":"webtoken","uid":client.cuid,
			  "pane":client.pane,"medAction":"searchMed","searchString":searchString},
		  success: function(resp){
			 
			 if (_.isString(resp.error)) {
				 alert(resp.error);
				 if (_.isString(resp.redir)) {location.href = resp.redir;}
			 } else if (_.isObject(resp) && resp.resp === "OK") {

			 	var searchHtml = "<br /><strong>Select a medication</strong><br /><select id='medDropdown'>";
			 	if (_.isArray(resp.medQuery) && resp.medQuery.length > 0) {
				 	_.each(resp.medQuery,function(m){
					 	searchHtml += "<option medId='" + m.medId + "'>" + m.brand + " (" + m.generic + ")</option>";
				 	}); //-e
			 	}
			 	searchHtml += "<option medId='0'>" + searchString + "</option>";
			 	searchHtml += "</select><br /><br /><button id='selectMed'>Next...</button>";
			 	
			 	$('#medSearchSelect').html(searchHtml);
			 	$('button').button();
			 	
			 } else {
				 alert ('There was a system error. Please try again later.');
				 app.logit('unknown error join.sendRequest.');
			 }
		  },
		  error: function(x,err) {
			  alert ('There was a system error. Please try again later.');
				 app.logit('unknown error join.sendRequest. MSG: ' + err);
		  },
		  dataType: 'json',
		  xhrFields: { withCredentials: true }	
		});
	
} //- client.meds.searchMedName

client.meds.startMedEdit = function() {
	
	app.logit("MED: ",client.meds.editMed);
	
	if (client.meds.editMed.medId == 0 && client.meds.editMed.userMedId == 0 ) {
		
		client.meds.medEditCurrent = client.meds.editMed;
		client.meds.medEditCurrent.med = client.meds.editMed;
		client.meds.buildEditForm();
		
	} else {
	
		$.ajax({
			  type: "POST",
			  url: server.config.postUrl + '/prov',
			  data: {"action":"clientsPatientDetail","authType":"webtoken","uid":client.cuid,
				  "pane":client.pane,"medAction":"getMedEditData","editMed":client.meds.editMed},
			  success: function(resp){
				 
				 if (_.isString(resp.error)) {
					 alert(resp.error);
					 if (_.isString(resp.redir)) {location.href = resp.redir;}
				 } else if (_.isObject(resp) && resp.resp === "OK") {
					 
				 	client.meds.medEditCurrent = resp.medData;
				 	client.meds.buildEditForm();
				 	
				 } else {
					 alert ('There was a system error. Please try again later.');
					 app.logit('unknown error join.sendRequest.');
				 }
			  },
			  error: function(x,err) {
				  alert ('There was a system error. Please try again later.');
					 app.logit('unknown error join.sendRequest. MSG: ' + err);
			  },
			  dataType: 'json',
			  xhrFields: { withCredentials: true }	
			});
	}
	
} // startMedEdit

client.meds.buildEditForm = function(){
	
	var editor = {};
	
	editor.medName = client.meds.medEditCurrent.med.medOther ;
	
	//frequency
	editor.frequencyOptions = "<option value=''>select</option>";
	_.each(client.meds.medVars.frequency,function(f,n){
		editor.frequencyOptions += "<option value='" + n + "'>" + f.name + " (" + n + ")</option>\n";
	}); //-e
	
	editor.otherTypeOptions = "<option value=''>select</option>";
	_.each(client.meds.medVars.otherType,function(t){
		editor.otherTypeOptions += "<option value='" + t.code + "'>" + t.name + " </option>\n";
	}); //-e
	
	editor.otherFormOptions = "<option value=''>select</option>";
	_.each(client.meds.medVars.otherForm,function(f){
		editor.otherFormOptions += "<option value='" + f + "'>" + f + " </option>\n";
	}); //-e
	
	editor.otherUnitOptions = "<option value=''>select</option>";
	_.each(client.meds.medVars.otherUnit,function(u){
		editor.otherUnitOptions += "<option value='" + u + "'>" + u + " </option>\n";
	}); //-e
	
	if (client.meds.medEditCurrent.medId > 0) { 
	
		
		//dosage
		editor.dosageOptions = "<option value=''>select</option>";
		_.each(client.meds.medEditCurrent.medForms,function(d){
			editor.dosageOptions += "<option value='" + d.medFormId + "'>" + d.formFull + "; " + d.dosage + "</option>\n";
		}); //-e

		
		$('#medEditDiv').html(client.meds.template.medEditor(editor));
		
		$('#fdaMedDiv').show();
		
		//pop usermed
		if (_.isObject(client.meds.medEditCurrent.userMed)) {
			$("select[name='dosageSelect'] option[value='" + client.meds.medEditCurrent.userMed.medFormId + "']").prop('selected', true);
			$("select[name='frequencySelect'] option[value='" + client.meds.medEditCurrent.userMed.frequency + "']").prop('selected', true);
			client.meds.updateMedEditTimes();
			
			$("input[name='enabled'][value='" + client.meds.medEditCurrent.userMed.enabled + "']").prop('checked', true);

			
		}
		
		
	} else {
		//other med
		
		editor.dosageOptions = {};
		$('#medEditDiv').html(client.meds.template.medEditor(editor));
		$('#otherMedDiv').show();
		
		//pop usermed
		if (_.isObject(client.meds.medEditCurrent.userMed)) {
			$("input[name='otherDosage']").val(client.meds.medEditCurrent.userMed.medDosageOther);
			$("select[name='dosageUnitOtherSelect'] option[value='" + client.meds.medEditCurrent.userMed.medUnitOther + "']").prop('selected', true);
			$("select[name='dosageFormOtherSelect'] option[value='" + client.meds.medEditCurrent.userMed.medFormOther + "']").prop('selected', true);
			
			$("select[name='otherTypeSelect'] option[value='" + client.meds.medEditCurrent.userMed.medType + "']").prop('selected', true);
			$("select[name='frequencySelect'] option[value='" + client.meds.medEditCurrent.userMed.frequency + "']").prop('selected', true);
			client.meds.updateMedEditTimes();
			$("input[name='enabled'][value='" + client.meds.medEditCurrent.userMed.enabled + "']").prop('checked', true);

			
		}
		
		
	}
	
} //-f buildEditForm


client.meds.updateMedEditTimes = function(){
	
	var freq = $("select[name='frequencySelect'] :selected").val();
	var freqObj = client.meds.medVars.frequency[freq];
	
	if (!_.isObject(freqObj)) {$('#timesDiv').hide();return;}
	
	var timesArray = freqObj.times;
	if (_.isObject(client.meds.medEditCurrent.userMed) && _.isArray(client.meds.medEditCurrent.userMed.times)) {
		client.meds.medEditCurrent.userMed.times = timesArray;
	}
	
	if (freq.length > 0 && timesArray.length > 0) {
		
		$('.timeDiv').hide();
		for(var i = 0;i < timesArray.length; i++) {
			var id = "#time-" + (i + 1);
			
			//populate
			var t;
			if (_.isObject(client.meds.medEditCurrent.userMed)) {
				t = client.meds.medEditCurrent.userMed.times[i];
			} else {
				t = timesArray[i];
			}
			var t12 = moment(t,'H:m').format('h');
			$(id + " input.hour").val(t12);
			
			//handle ap/pm
			if (t > 11) {
				$(id + " select.ampm [value='pm']").prop('selected', true);
			} else {
				$(id + " select.ampm [value='am']").prop('selected', true);
			}
			
			$(id).show();
		}
		$('#timesDiv').show();
		
		//populate
		
	} else {
		$('#timesDiv').hide();
	}
	
	
} //- client.meds.updateMedEditTimes

client.meds.saveMed = function() { //loadPage) {
	
	if (client.meds.medEditCurrent.medId == 0) {
		//med other
		var otherType = $("select[name='otherTypeSelect'] option:selected").val();
		var otherDosage = $("input[name='otherDosage']").val();
		var otherUnit = $("select[name='dosageUnitOtherSelect'] option:selected").val();
		var otherForm = $("select[name='dosageFormOtherSelect'] option:selected").val();
		
		if (otherDosage.length == 0 || otherUnit.length == 0 || otherForm.length == 0) {alert("Enter a dosage");return;}
		
	} else {
		
		var d = $("select[name='dosageSelect'] option:selected").val();
		if (!_.isString(d)) {alert("Please complete the form");return;}
		if (d.length == 0 ) {alert("Select a dosage");return;}
	}
	
	
	var f = $("select[name='frequencySelect'] option:selected").val();
	var e = $("input[name='enabled']:checked").val();
	
	
	if (f.length == 0 ) {alert("Select a frequency");return;}
	
	var medOther = client.meds.medEditCurrent.med.medOther;
	
	//times array
	var ampm = [];
	var times = [];
	var hour; var min;
	var num = client.meds.medVars.frequency[f].times.length;
	if (num > 0) {
		for(var i = 0;i < num; i++) {
			var id = "#time-" + (i + 1);
			hour = $(id + " input.hour").val();
			min = $(id + " input.minute").val();
			times.push(hour + ":" + min);
			ampm.push($(id + " select.ampm option:selected").val());
		}
	}
	
	var saveData = {
		"parse":'saveMed',
		"medId":client.meds.medEditCurrent.medId,
		"medOther":medOther,
		"userMedId":client.meds.editMed.userMedId,
		"medFormId":d,
		"frequency":f,
		"enabled":e,
		"amPm": ampm,
		"times":times,
		"clientRec":client.cuid,
		"startDate": moment().format("YYYY-MM-DD")
	}
	
	if (client.meds.medEditCurrent.medId == 0) {
		saveData.medDosageOther = otherDosage,
		saveData.medType = otherType,
		saveData.medUnitOther = otherUnit,
		saveData.medFormOther = otherForm
	}
	
	$('#medEditDialog').dialog({"buttons":{}});
	$('#medSaveDiv').show();

	$.ajax({
		type: "POST",
		url: "/xServers/provider/client.webconnector.php",
		data: saveData,
		success: function(resp){
		
		if (_.isNumber(parseInt(resp.content))) {
			$('#medContentDiv').html("<div align='center'><br /><br /><br /><br /><br /><br /><br /><img src='/images/loaderProvider.png'></div>");
			$('#medEditDialog').dialog('close');
//			client.meds.reloadMeds(loadPage); 
			client.meds.reloadMeds(); 

		} else {
			$('#medSaveDiv').hide();
			$('#errorDialog').html(resp.content).dialog({"title":"Error","buttons":{"Ok": function() {$(this).dialog( "close" );}}});
		}
		
		},
		error: function(x,err) {
		alert ('There was a system error. Please try again later.');
		 app.logit('unknown error join.sendRequest. MSG: ' + err);
		},
		dataType: 'json'
	});
			
	
	
} //- client.meds.saveMed()

client.meds.stopStartMed = function(action) {
	var userMedId = client.meds.editMed.userMedId;
	var actionName = '';
	if ( action == 'start' ) {
		actionName = 'activate';
	}
	else if ( action == 'stop' ) {
		actionName = 'deactivate';
	}
	else {
		$('#medStatsDiv').html("<div align='center'><br />Error - Action not recognized</div>");
		$('#medDialog').dialog({modal: true,width: 300,height: 150,title:"Medication activation",show:"slideDown",buttons: {Ok: function() {$(this).dialog( "close" );}}});
		app.lwarn("Meds stop start action not recognized: " + action);
		return;
	}

	var saveData = {
		"parse":actionName+'Med',
		"clientRec":client.cuid,
		"userMedId":userMedId,
		"medOther":client.meds.editMed.medOther
	}
		
	$.ajax({
		type: "POST",
		url: "/xServers/provider/client.webconnector.php",
		data: saveData,
		success: function(resp){
			
			app.logit(resp);
		
			if ( resp.error && resp.error.length > 0 ) {
				app.lwarn(resp.error);
				$('#errorDialog').html(resp.content).dialog({"title":"Error","buttons":{"Ok": function() {$(this).dialog( "close" );}}});			
			}
//		if (_.isNumber(parseInt(resp.content))) {
			else {
				$('#medStatsDiv').html("<div align='center'><br />Medication has been " + actionName + "d</div>");
				$('#medDialog').dialog({modal: true,width: 300,height: 150,title:"Medication activation",show:"slideDown",buttons: {Ok: function() {$(this).dialog( "close" );}}});
				
				client.meds.reloadMeds();
			}// else {
//			$('#errorDialog').html(resp.content).dialog({"title":"Error","buttons":{"Ok": function() {$(this).dialog( "close" );}}});
//		}
		
		},
		error: function(x,err) {
		alert ('There was a system error. Please try again later.');
		 app.logit('unknown error prov meds stop/start. MSG: ' + err);
		},
		dataType: 'json'
	});
}  //ef stopStartMed

client.meds.deleteMedCheck = function() {
	
	var userMedId = client.meds.editMed.userMedId;
	var saveData = {
		"parse":'deleteMedCheck',
		"clientRec":client.cuid,
		"userMedId":userMedId,
	}
		
	$.ajax({
		type: "POST",
		url: "/xServers/provider/client.webconnector.php",
		data: saveData,
		success: function(resp){
			
			app.logit(resp);
		
			if ( resp.error && resp.error.length > 0 ) {
				app.lwarn(resp.error);
				$('#errorDialog').html(resp.content).dialog({"title":"Error","buttons":{"Ok": function() {$(this).dialog( "close" );}}});			
			}
			else {
	
				var deleteButtons =  { Ok: function() {$(this).dialog( "close" ); } };

				if ( resp.content.option == "delete" ) {
					deleteButtons =  { Cancel: function() {$(this).dialog( "close" );},
									       Ok: function() { client.meds.deleteMed(); $(this).dialog( "close" );} };
				
				}
	
				$('#medStatsDiv').html("<div align='center'><br />" + resp.content.msg + "</div>");
				$('#medDialog').dialog({modal: true,width: 520,height: 150,title:"Delete medication",show:"slideDown", buttons: deleteButtons});
				
				//client.meds.reloadMeds();
			}// else {
//			$('#errorDialog').html(resp.content).dialog({"title":"Error","buttons":{"Ok": function() {$(this).dialog( "close" );}}});
//		}
		
		},
		error: function(x,err) {
		alert ('There was a system error. Please try again later.');
		 app.logit('unknown error prov meds stop/start. MSG: ' + err);
		},
		dataType: 'json'
	});	
}

client.meds.deleteMed = function() {
	
	var userMedId = client.meds.editMed.userMedId;

	var saveData = {
		"parse":'deleteMed',
		"clientRec":client.cuid,
		"userMedId":userMedId,
		"medOther":client.meds.editMed.medOther
	}
		
	$.ajax({
		type: "POST",
		url: "/xServers/provider/client.webconnector.php",
		data: saveData,
		success: function(resp){
			
			app.logit(resp);
		
			if ( resp.error && resp.error.length > 0 ) {
				app.lwarn(resp.error);
				$('#errorDialog').html(resp.content).dialog({"title":"Error","buttons":{"Ok": function() {$(this).dialog( "close" );}}});			
			}
//		if (_.isNumber(parseInt(resp.content))) {
			else {
				$('#medStatsDiv').html("<div align='center'><br />" + resp.content + "</div>");
				$('#medDialog').dialog({modal: true,width: 300,height: 150,title:"Delete medication",show:"slideDown",buttons: {Ok: function() {$(this).dialog( "close" );}}});
				
				client.meds.reloadMeds();
			}// else {
//			$('#errorDialog').html(resp.content).dialog({"title":"Error","buttons":{"Ok": function() {$(this).dialog( "close" );}}});
//		}
		
		},
		error: function(x,err) {
		alert ('There was a system error. Please try again later.');
		 app.logit('unknown error prov meds stop/start. MSG: ' + err);
		},
		dataType: 'json'
	});
}  //ef deleteMed


client.meds.templates.medSearch = _.template(
	"<div id='medSearch'>" +
	"Enter part of the medication name and click search<br />" +
	"<input type='text' name='medNameSearch' style='width: 500px;'> <button id='searchMed'>Search</button>" +
	"<div id='medSearchSelect'></div>" +
	"</div>"

);


client.meds.templates.medBox = _.template(
	"<div id='medWrapper'>" +
	"<div class='medBoxDiv'><div class='medBoxName'>" +
	"<a href='#' class='medClick' data-role-userMedId='{{= userMedId }}'>{{= medName }}</a></div>" +
	"<div class='medSecondRow'> <div class='medText'>{{= medText }}</div>" +
	"<div class='medIcon'>{{= medIcon }}</div>" +
	"</div>" +
	"</div> </div>" 
);