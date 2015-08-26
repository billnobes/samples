
client.summary.templates = {};
//client.summary.attIcons = ['','/images/icons/dot_yellow_22.png','/images/icons/dot_orange_22.png','/images/icons/dot_red_22.png'];
client.summary.attIcons = ['','/images/icons/dot_yellow_22.png','/images/icons/dot_yellow_22.png','/images/icons/dot_orange_22.png','/images/icons/dot_red_22.png'];

client.summary.templates.patientBox = _.template("<div class=''> " +
		" <div class='patientGraphDiv'><div class='graphTitle'>Mood and Lifestyle</div>{{= graphBox }}</div>" +
		" {{= metabolicBox }} " +
		" {{= ccTimeBox }}" +
		" <div class='patientPane'>{{= medBox }}</div><div class='patientPane'>{{= surveyBox }}</div><br clear=all>" +
		" <div class='patientGraphDiv' ><div class='graphTitle'>Attention Flags</div>{{= alertBox }}</div>" +
		" <div class='patientPane'>{{= lifestyleBox }}</div><div class='patientPane'>{{= moodBox }}</div><br clear=all>" +
		"</div>");
		


client.summary.load = function(){
	
		//metabolics

		var metaWeight = "No Data"; var metaWeightDate = "";
		var metaBp = "No Data"; var metaBpDate = "";
		var metaHr = "No Data"; var metaHrDate = "";
		var metaBg = "No Data"; var metaBgDate = "";
		
		if (client.stats.metabolic.last.weight && _.isNumber(client.stats.metabolic.last.weight.value)) {
			metaWeight = client.stats.metabolic.last.weight.value + " lbs.";
			metaWeightDate = moment(client.stats.metabolic.last.weight.date).format('MM/DD/YYYY');
		}
		
		if (client.stats.metabolic.last.bp && _.isNumber(client.stats.metabolic.last.bp.systolic)) {
			metaBp = client.stats.metabolic.last.bp.systolic + " / " +  client.stats.metabolic.last.bp.diastolic + " mmHg";
			metaBpDate = moment(client.stats.metabolic.last.bp.date).format('MM/DD/YYYY');
		}
		
		if (client.stats.metabolic.last.hr && _.isNumber(client.stats.metabolic.last.hr.value)) {
			metaHr = client.stats.metabolic.last.hr.value + " bpm";
			metaHrDate = moment(client.stats.metabolic.last.hr.date).format('MM/DD/YYYY');
		}
		
		if (client.stats.metabolic.last.bg && _.isNumber(client.stats.metabolic.last.bg.value)) {
			metaBg = client.stats.metabolic.last.bg.value + " mg/dL";
			metaBgDate = moment(client.stats.metabolic.last.bg.date).format('MM/DD/YYYY');
		}
		
		
		
		var metabolicBox = "<div class='center'>" +
			"<table style='width: 400px; margin: auto; class='' id='metabolicTable'>" +
			"<tr><th colspan=3>Most Recent Metabolics</th></tr>" +
			"<tr><td class='metaName'>Weight</td><td> " + metaWeight + "</td><td> " + metaWeightDate + "</td></tr>" +
			"<tr><td class='metaName'>Blood Pressure</td><td> " + metaBp + "</td><td> " + metaBpDate + "</td></tr>" +
			"<tr><td class='metaName'>Heart Rate</td><td> " + metaHr + "</td><td> " + metaHrDate + "</td></tr>" +
			"<tr><td class='metaName'>Blood Glucose</td><td> " + metaBg + "</td><td> " + metaBgDate + "</td></tr>" +
			"</table>" +
			"</div>";
			
		var ccTimeBox = "<br /><br /><div class='center bold'>Care Coordinator Engagment Time for this month: " + app.round2(client.patientTime.ccTime/60) + " min</div>";
		
	
		var medBox = "<div class='center' style='margin-top: 25%' >Medication compliance data is <br />not available.</div>";
		var surveyBox = "<div class='center' style='margin-top: 25%' >Survey compliance data is <br />not available.</div>";
		var lifestyleBox = "<div class='center' style='margin-top: 25%' >There is not enough survey data<br />to compute the lifestyle metric.</div>";
		var moodBox = "<div class='center' style='margin-top: 25%' >There is not enough survey data<br />to compute the lifestyle metric.</div>";
		var alertBox = "<div class='center' style='margin-top: 25%' >There are currently no atttenion flags for this patient.</div>";
		var graphBox = "<div id='graphDiv'><div class='center' style='margin-top: 25%' >There is not enough data to present this graph.</div></div>";
		
		//make compliance boxes
		var medImg = "circleRed.png";
		var surveyImg = "circleRed.png";

		if (!_.isNull(client.stats.medCompliance.compliance) && _.isNumber(client.stats.medCompliance.compliance)) {
			if (client.stats.medCompliance.compliance >= .8) {medImg = "circleGreen.png";}
			medBox = "<div class='center bold ' style='margin-top: 20%' ><img class='pb8' src='/provider/images/" + medImg +  
			"'><br /> " + client.stats.medCompliance.period  + " Day Medication Compliance: " + app.round2(client.stats.medCompliance.compliance * 100) + "%</div>"
		}
		
		if (!_.isObject(client.stats.surveyCompliance.compliance) && _.isNumber(client.stats.surveyCompliance.compliance)) {
			if (client.stats.surveyCompliance.compliance >= .8) {surveyImg = "circleGreen.png";}
			surveyBox = "<div class='center bold' style='margin-top: 20%' ><img class='pb8' src='/provider/images/" + surveyImg +  
			"'><br />" + client.stats.surveyCompliance.period  + " day Survey Compliance: " + app.round2(client.stats.surveyCompliance.compliance * 100) + "%</div>"
		}
		
		
		
		//make delta boxes
		if (_.isObject(client.resp.catDelta)) {
			if (_.isNumber(client.resp.catDelta.mood)) {
				var mood = 0;
				if (client.resp.catDelta.mood > 0)  {
					mood = "+ " + client.resp.catDelta.mood;
				} else {
					mood = "- " + Math.abs(client.resp.catDelta.mood);
				}
				moodBox = "<div class='center bold' style='margin-top: 20%' ><img class='pb8'  src='/provider/images/circleGray.png'><br />Mood: " + mood + "</div>";
				
			}
			
			if (_.isNumber(client.resp.catDelta.lifestyle)) {
				var lifestyle = 0;
				if (client.resp.catDelta.lifestyle > 0)  {
					lifestyle = "+ " + client.resp.catDelta.lifestyle;
				} else {
					lifestyle = "- " + Math.abs(client.resp.catDelta.lifestyle);
				}
				lifestyleBox = "<div class='center bold' style='margin-top: 20%' ><img class='pb8'  src='/provider/images/circleGray.png'><br />Lifestyle: " + lifestyle + "</div>";

			}
		}
		
		//make alert box
		/* old
		if (_.isObject(client.resp.attentionFlags)) {
			var attHtml = '';
			var attArr = [];
			_.each(client.resp.attentionFlags,function(f){
				attHtml =  "<div class='attDiv'>";
				attHtml += "<div class='attImg'><img src='" + client.summary.attIcons[f.weight] + "'></div>";
				attHtml += "<div class='attNote'>" + f.note +"</div>";
				attHtml += "</div>";
				attArr.push(attHtml);
			});
			alertBox = attArr.join("\n");
		}
		*/
		
		if (_.isObject(client.stats.alerts)) {
			var attHtml = '';
			var attArr = [];
			_.each(client.stats.alerts,function(f){
				attHtml =  "<div class='attDiv'>";
				attHtml += "<div class='attImg'><img src='" + client.summary.attIcons[f.severity] + "'></div>";
				attHtml += "<div class='attNote'>" + f.message +"</div>";
				attHtml += "</div>";
				attArr.push(attHtml);
			});
			alertBox = attArr.join("\n");
		}
		
		
		var patientHtml = client.summary.templates.patientBox(
			{"metabolicBox":metabolicBox,"ccTimeBox":ccTimeBox,"medBox":medBox,"surveyBox":surveyBox,"lifestyleBox":lifestyleBox,"moodBox":moodBox,"patientId":client.currentUid,"alertBox":alertBox,"graphBox":graphBox});
			$('#contentDiv').html(patientHtml);
			
			
			
		//graph
		if (client.resp.summaryGraphData.length > 0) {
			var lifestyle = [];
			var mood = [];
			var sorted = client.resp.summaryGraphData.sort(function(a,b){if (a.date > b.date) return 1; else return -1;})
			_.each(sorted,function(d){
				mood.push(d.mood);
				lifestyle.push(d.lifestyle);
				
			});
			
			
			
			var startDate = parseInt(moment(_.first(sorted).date).format('x'));
					
			$(function(){
			    $('#graphDiv').highcharts({
				    credits: {
					    enabled: false
				    },
				    chart :{
					    type: 'line',
					    height: 290
				    },
				    title: {
					    text: ''
				    },
				    xAxis: {
					    type: 'datetime'			    },
				    yAxis: {
					  title: {text: 'Rank'},
					  endOnTick: false,
					  max: 5,
					  min: 0,
					  tickInterval: 1
				    },
				    series: [
				    	{
					    	connectNulls: false,
					    	//dashStyle: 'dash',
					    	pointInterval: 24 * 3600 * 1000,
					    	pointStart: startDate,
					    	data: mood,
					    	//color: '#1E8526',
					    	name: 'Mood',
					    	legendIndex: 2
				    	},
				    	{
					    	connectNulls: false,
					    	//dashStyle: 'dot',
					    	pointInterval: 24 * 3600 * 1000,
					    	pointStart: startDate,
					    	data: lifestyle,
					    	name: 'Lifestyle',
					    	legendIndex: 1
				    	}
			    ]
				    		    
			    });
			    
		    }); //end function wrapper
	    }

			
	
}