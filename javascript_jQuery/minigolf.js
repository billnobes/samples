//course variable
var course = {};
var scorecard = {};

course.totalPar = 0;

//preload  background images
 for (var i = 1; i < 19; i++) {
	 var preLoadImg = new Image();
    preLoadImg.src = "/iCME/ProState/images/back/" + i + ".jpg";
 }

//event responders

//handle choice clicks
$(document).on('click','.choiceDiv',function(){
	if (viewcontroller.mutex) {
		$('.choiceDiv').removeClass('choiceSelected');
	}	
	$(this).toggleClass('choiceSelected');
	$('#questionResponse').html('');
});

//hand choice clicks for pre post
$(document).on('click','.choiceDivpp',function(){
	var mutex = $(this).attr('data-mutex');
	var qid = $(this).attr('data-qid');
	if (mutex == 'true') {
		$("[data-qid="+qid+"]").removeClass('choiceSelected');
	}	
	$(this).toggleClass('choiceSelected');
});

//handle submit clicks 
$(document).on('click','#answerSubmit',function(){
	
	if (viewcontroller.gotAnswer()) {
		if (viewcontroller.answerCorrect()) {
			
		} else { //wrong answer
			
		}
	} else {
		displayAlert("You didn't answer the question");
	}
});

$(document).on('click','#answerNext',function(){
	viewcontroller.loadPanes();
});


// !submit pre post 
$(document).on('click','#prePostAnswerSubmit',function(){
	
	viewcontroller.scorePrePost();
	icme.savePrePost();
	$('#pretest').addClass('hide').html("");
	$('#pretest').hide();
	$('#content').removeClass('hide');
	if (icme.prepostType == 1) {
		player.data.icme.preTest = 1;
		viewcontroller.startActivity();
	} else if (icme.prepostType == 2) {
		player.data.icme.postTest = 1;
		viewcontroller.endGame();
	}

});




$(document).on('click touch','#leaderBoard',function(){
	icme.loadGolfLeaderBoard();
});

$(document).on('click','#goToPostTest',function(){
	viewcontroller.loadPosttest();
});

$(document).on('click','#q4ImageButton',function(){
	viewcontroller.showQ4image();
});


// !handle top menu clicks

$(document).on('click touch','.menuLink',function(e){
	
	e.preventDefault();
	var filename = $(this).attr('data-menu-page');
	$.get(filename,function(html) {
		$('#subpageContent').html(html);
		$('#content').fadeOut('slow',function(){
			$('#subPages').fadeIn('slow');
		});		
	});
	
	
});

$(document).on('click touch','#backToGame',function(e){
	
	e.preventDefault();
		$('#subPages').fadeOut('fast',function(){
			$('#content').fadeIn('fast');
		});		
});


$(document).on('click touch','#takeMulligan',function(e){
	
	e.preventDefault();
		$('#mulliganOptionDiv').fadeOut('fast');
		course.mulligansRemaining--;
		player.mulliganActive = true;		
});



// the var name "viewcontroller" is required to work withthe ICME class

var viewcontroller = new ViewController();



function ViewController() {
	var self = this;

this.init = function(){
	logit("Init ViewController");
	
	$('#contentLeft').fadeOut(1000,function(){		
		if (player.data.icme.preTest == 0 && icme.model.showPretest == true) {
			self.loadPretest();
		} else {
			self.startActivity();
		}
	});
		
}

this.startActivity = function() {

	//set up course
	
	//let's init everything just in case the server returns empty object
	course.totalSwings = 0;
	course.mulligansRemaining = 2;
	course.mulligansUsed = [];
	course.currentSwings = {};
	course.totalHoleSwings = {};
	player.mulliganActive = false;
		
	if (typeof player.record.course === 'undefined') {
		//moved code here above for safety.
	} else {
		if (_.isNumber(parseInt(player.record.course.totalSwings))) {
			course.totalSwings = parseInt(player.record.course.totalSwings);
		}
		
		if (_.isNumber(parseInt(player.record.course.mulligansRemaining))) {
			course.mulligansRemaining = parseInt(player.record.course.mulligansRemaining);
		}
		
		if (_.isObject(player.record.course.currentSwings)) {
			course.currentSwings = player.record.course.currentSwings;
		}
		
		if (_.isObject(player.record.course.mulligansUsed)) {
			course.mulligansUsed = player.record.course.mulligansUsed;
		}
		
		if (_.isObject(player.record.course.totalHoleSwings)) {
			course.totalHoleSwings = player.record.course.totalHoleSwings;
		}
	}
	
	//hide loader
	$('#loaderDiv').fadeOut('slow',function(){
		$('#content').fadeIn('slow',function(){
		});
	});
	
	self.loadCurrentQuestion();
	//self.updateStatusBar();
	self.loadPanes();	
}

this.loadCurrentQuestion = function() {


	if (!player.done) {
		self.currentQ = icme.data.questionArray[player.currentQindex];
		self.currentQnumber = player.currentQindex+1;
		self.currentQ.accruedPenalty = 0;
		player.savedAnswers = new Array();
		
		if (!_.isUndefined(self.currentQ.data)) {
			course.holeIndex = "hole" + self.currentQ.data.hole;
		} else {
			course.holeIndex = player.currentQindex;
		}
		
		course.currentSwings[course.holeIndex] = 0;
		if (_.isUndefined(course.totalHoleSwings[course.holeIndex])) {
			course.totalHoleSwings[course.holeIndex] = 0;
		}

		player.mulliganSwing = parseInt(self.currentQ.data.mulligan);
		
				
	} else {
		
	}
	
}


this.gotAnswer = function() {
	
	self.answers = new Array();
	$('.choiceSelected').each(function(){
		var id = $(this).attr('data-choiceid');
		self.answers.push(id);
	});
	player.savedAnswers.push(self.answers);
	
	if (self.answers.length > 0) {
		course.totalSwings = parseInt(course.totalSwings) + 1;
		course.currentSwings[course.holeIndex] = parseInt(course.currentSwings[course.holeIndex]) + 1;
		course.totalHoleSwings[course.holeIndex] = parseInt(course.totalHoleSwings[course.holeIndex]) + 1;
	}
	
	this.updateHUD();
	return self.answers.length;
} //ef




this.answerCorrect = function() {
	if (self.currentQ.questionType == 1) {
		if (self.currentQ.correct == self.answers[0]) { //mutex
			self.correctAnswer();
		} else {
			self.wrongAnswer();	
		}
	} else if (self.currentQ.questionType == 2) { //non-mutex
		var wrong = 0;
		var correct = 0;
		var totalCorrect = 0;
		$.each(self.currentQ.choice,function(){
			if (this.correct == 1) { //choice is correct
			
				if ($.inArray(this.cmeChoiceId,self.answers) >= 0) {
					correct++; 
				} else {
					wrong++;
				}
				totalCorrect++;
			}
			
			if (this.correct == 0 && $.inArray(this.cmeChoiceId,self.answers) >= 0) {
				wrong++;
				//reset choice
				$("[data-choiceid=" + this.cmeChoiceId + "]")
					.removeClass('choiceSelected')
					.addClass('choiceWrong')
					.delay(1000)
					.slideUp();
			}
			
		});
		
		if (wrong == 0) {
			self.correctAnswer();
		} else {
			self.wrongAnswer({"correct":correct,"totalCorrect":totalCorrect});
		}
		
	}
} //ef

this.correctAnswer = function() {
	
	var str = "";
	
	player.addScore(icme.data.model.pointsPerQuestion);
	var thisQpoints = icme.data.model.pointsPerQuestion ;
	
	if (player.mulliganActive) {
				course.totalSwings --;
				course.currentSwings[course.holeIndex]--;
				course.totalHoleSwings[course.holeIndex]--;
				
				course.mulligansUsed.push(course.holeIndex);
				player.mulliganActive = false;
				
				this.updateHUD();
			}
	
	//logit(self.currentQ);
	
	if (self.currentQ.accruedPenalty > 0) {
		player.addScore(self.currentQ.accruedPenalty * -1);
		thisQpoints -= self.currentQ.accruedPenalty;
		var strPenalty = "<br />Penalty: -" + self.currentQ.accruedPenalty;
	}
	
	if (player.savedAnswers.length == 1) {
		player.addScore(icme.data.model.firstTryBonus);
		thisQpoints += icme.data.model.firstTryBonus
		var strBonus = "<br />First Try Bonus: " + icme.data.model.firstTryBonus;
	}
	
	
	str += "<div style='padding: 0px 10px 0px 0px' class='f16'>";
	str += "<div class='bold center pb8 crRecd f18'>Correct!</div>";
	
	
	if (_.isString(self.currentQ.answer) && self.currentQ.answer.length > 3) {
		str += "<div class='answer' style='max-height: 210px; overflow: auto;'><span class='questionPrefix'>Explanation:</span>&nbsp;";
		str += self.currentQ.answer;
		str += "</div>";
	}
	
	str += "<div class='center pt8'><img class='pointer' id='answerNext' src='/iCME/ProState/images/next.png'></div>";
	
	str += "</div>";
	
	//$('#choicesDiv').html(str);
	$('#submitDiv').hide();
	$('#answerResponseDiv').html(str);
	$("#content").animate({ scrollTop: $('#content')[0].scrollHeight}, 1000);
	

	player.record.course = course;
	player.moveAhead();
	//hack to reccord par as score
	player.score = parseInt(course.totalPar);
	icme.saveResponse();
	self.loadCurrentQuestion();
	
	
	self.updateStatusBar();
		
	
} //ef

this.wrongAnswer = function(obj) {
	logit("Wrong");
	var correct = 0;
	var str = "Sorry but that's the wrong answer.<br />";
	
	if (_.isObject(obj) && _.isNumber(obj.correct)) {
		correct = obj.correct;
		str = "You selected " + correct + " of " + obj.totalCorrect + " correct choices.<br />Please choose " + (obj.totalCorrect - correct) + " more correct answer(s).<br />";
		
		instruction = "<span style='font-weight: bold; color: black;'>(Choose the " + self.currentQ.correct.length + " correct answers from the remaining " + (self.currentQ.choice.length - obj.correct) + " choices below)</span>";
		$('#instructionDiv').html(instruction);
		
	}
	

	if (player.mulliganSwing === 1 && course.mulligansRemaining > 0 && !_.contains(course.mulligansUsed,course.holeIndex)) {
		str += "<br /><div id='mulliganOptionDiv' style='color: black; font-size: 80%;'>" +
		"<a href='#' id='takeMulligan'>Click here</a> if you wish to take a mulligan (" + course.mulligansRemaining +
		" remaining)</div><br />";
	}
	
	//if (icme.data.model.wrongAnswerPenalty > 0) str += "You got a " + icme.data.model.wrongAnswerPenalty + " point penalty.";
	$('#questionResponse').html(str).fadeIn();
	self.currentQ.accruedPenalty += icme.data.model.wrongAnswerPenalty;
} //ef

this.loadPanes = function(){

	var hole = "";
	var prepText = "";
	var questionText = "";
	var map = "";

	if (player.done) {
		self.endGame();
	} else {

		
		prepText = "<h2>Question " + self.currentQnumber + "</h2>";
		if (typeof self.currentQ['prepText'] == 'string') prepText += "<div class='prepText'>" + self.currentQ['prepText'] + "</div>"
		
		hole = self.currentQ.data.hole + nth(self.currentQ.data.hole) + " Hole"
		
		var idx = "hole" + self.currentQ.data.hole;

		
		var par = icme.model.parArray[idx];
		
		map = "<div><img class='mapImage' src='images/holes/" + self.currentQ.data.map + "'></div>";
		
		prepText = "";
		prepText +=  map;
		
		prepText += "<div id='courseDiv' class='center'><table style='margin: auto; width: 90%; background-color: #FFFBD6' cellpadding=0 cellspacing=0 >" 
		+ "<tr><!--<td class='center bold'>#</td> --><td class='bold'>Hole</td><td class='center bold'>Par</td><td class='center bold'>Strokes</td><td class='center bold'>Total</td></tr>"
		+ "<tr><td class='center'>" + self.currentQ.data.hole + "</td>"
		+ "<td class='center'>" + par + "</td><td class='center' id = 'hudCurrent'>" + course.totalHoleSwings[course.holeIndex] + "</td><td class='center bold' id='hudTotal'>" + course.totalSwings + "</td></tr>"
		+ "</table></div>"
		
		
	
		$('#contentLeft').fadeOut('slow',function(){
			$('#contentLeft').html(prepText);
			$('#contentLeft').fadeIn('slow');
		});
		
		var par = "";
		
		questionText = "";
		questionText = "<div class = 'headingLarge'>" + hole + "</div>";

		
		if (typeof self.currentQ['prepText'] == 'string') questionText += "<div class='prepText'>" + self.currentQ['prepText'] + "</div>";
		
		questionText += "<div class='questionText'><span class='questionPrefix'>Q:</span>&nbsp;" + self.currentQ.questionText + "</div>";
		self.getChoices();
		questionText += "<div id='choicesDiv'>";
		questionText += self.choices;
		questionText += "<div class='' style='' id='questionResponse'></div>";
		questionText += "<div class='center' id='submitDiv'><img class='pointer' id='answerSubmit' src='/iCME/ProState/images/submit.png'></div>";
		questionText += "<div id='answerResponseDiv'></div>"
		questionText += "</div>";
		
		
		$('#contentRight').fadeOut('slow',function(){
			$('#contentRight').html(questionText);
			$('#contentRight').fadeIn('slow');
		});
	
	}
	
	
} //

this.updateHUD = function() {
	$('#hudCurrent').html(course.totalHoleSwings[course.holeIndex]);
	$('#hudTotal').html(course.totalSwings);
	
	
} //ef

this.getChoices = function() {
	
	self.choices = "";
	var devClass = "";
	var instruction = "";
	
	//logit(self.currentQ);
	
	if (self.currentQ.questionType == 1) {
		self.mutex = true;
		instruction = "<span style='font-weight: bold; color: black;'>(Choose one)</span>";
	} else if (self.currentQ.questionType == 2) {
		self.mutex = false;
		instruction = "<span style='font-weight: bold; color: black;'>(Choose the " + self.currentQ.correct.length + " correct answers from the " + self.currentQ.choice.length + " choices below)</span>";
	}
	
	self.choices += "<div id='instructionDiv' style='color: #999; padding-left: 32px'>" + instruction + "</div>";
	$.each(self.currentQ.choice,function(){
			if (icme.model.dev && $.inArray(this.cmeChoiceId,self.currentQ.correct) > -1 ) devClass = 'dev'; else devClass = "";
			self.choices += "<div onclick= '' class=' " + devClass + " choiceDiv pointer' data-choiceid='" + this.cmeChoiceId + "'>" + this.choiceText + "</div>";
		});
		
	
} //ef


this.updateStatusBar = function(){
	$('#scoreSpan').html(player.score);
}

this.endGame = function(){
	if (player.data.icme.postTest == 0 && icme.model.showPosttest == true ) {
		//self.loadPosttest();
		$('#content').load(icme.model.congratsInclude);
	} else {
		$('#content').load(icme.model.endInclude,function(){
			var url = "/forms/evalSurvey.html?membersCMEId=" + player.data.cme.membersCMEId;
			$('#evalLink').attr('href',url);
		});
	}
} //ef

this.loadPretest = function() {
	logit("Got to post test loader");
	self.currentTest = "pretest";
	icme.prepostType = 1;
	
	this.makePrePost();
	
	this.pretest = "<div class='center questionText bold'>Please complete the pre-test for this activity</div>";
	this.pretest += this.prePost;
	this.pretest += "<div class='center'><img class='pointer' id='prePostAnswerSubmit' src='/iCME/ProState/images/submit.png'></div>";
	
	$('#pretest').html(this.pretest);
	$('#pretest').scrollTop(0);
	

	$('#loaderDiv').fadeOut('slow',function(){
		$('#pretest').fadeIn('slow',function(){
			$('#pretest').scrollTop(0);
		});
	});
	
} //ef

this.loadPosttest = function() {
	logit("Got to posttest loader");
	
	self.currentTest = "posttest";
	icme.prepostType = 2;
	
	this.makePrePost();
	
	this.pretest = "<div class='center questionText bold'>Please complete post-test for this activity</div>";
	this.pretest += this.prePost;
	this.pretest += "<div class='center'><img class='pointer' id='prePostAnswerSubmit' src='/iCME/ProState/images/submit.png'></div>";
	
	$('#pretest').html(this.pretest);
	$('#pretest').scrollTop(0);
	$('#content').scrollTop(0);
	
	$('#content').addClass('hide');
	$('#content').html("");
	$('#pretest').removeClass('hide');
	$('#pretest').show();
	$('#pretest').scrollTop(0);
	$('#content').scrollTop(0);
	
} //ef




this.makePrePost = function() {
	//var self = this;
	this.prePost = "";
	$.each(icme.data.questionPrePostArray,function(){
		self.prePost += "<div class='ppQuestionText '>" + this.questionText + "</div><div id='ppq" + this.cmeQuestionId + "' >";
		self.getPPChoices(this);
		self.prePost += self.choices;
		self.prePost += "</div>";
		
	});
} //ef


this.getPPChoices = function(ppQ) {
	
	self.choices = "";
	var devClass = "";
	var instruction = "";
	
	if (ppQ.questionType == 1) {
		self.mutex = 'true';
		instruction = "(Choose one)";
	} else if (ppQ.questionType == 2) {
		self.mutex = 'false';
		instruction = "(Choose all that apply)";
	}
	
	self.choices += "<div style='color: #999; padding-left: 32px'>" + instruction + "</div>";
	$.each(ppQ.choice,function(){
			if (icme.model.dev && $.inArray(this.cmeChoiceId,ppQ.correct) > -1 ) devClass = 'dev'; else devClass = "";
			self.choices += "<div onclick= '' class=' " + devClass + " choiceDivpp pointer' data-mutex='" + self.mutex + "' data-qid='" + this.cmeQuestionId + "' data-choiceid='" + this.cmeChoiceId + "'>" + this.choiceText + "</div>";
		});
	
} //ef


this.scorePrePost = function() {
	self.prePostResponse = new Array;
	var  correctTotal = 0;
	var score = 0;
	$.each(icme.data.questionPrePostArray,function(){
		var q = this;
		var answer = new Object;
		answer["cmeQuestionId"] = q.cmeQuestionId;
		answer["responses"] = new Array;
		//var k = "cmeqid:" + q.cmeQuestionId;
		//self.prePostResponse[k] = new Object;
		//self.prePostResponse[k]["answer"] = new Array;
				
		//gather responses and add to response object
		$("[data-qid=" + q.cmeQuestionId + "].choiceSelected").each(function(){
			var selected = $(this).attr("data-choiceid");
			answer["responses"].push(selected);
		});
		
		var correct = false;
		var correctOff = false;
		var sel = false;
		
		if (q.questionType == 1) {
			 
			var choiceId = q.correct[0];
			sel = $("[data-qid=" + q.cmeQuestionId + "][data-choiceid=" + choiceId + "]").hasClass("choiceSelected");

			if (sel) correct = true; else correct = false; 	
			
		} else { //process non mutex
			$.each(q.choice,function(key,value) {
				//is it selected
				sel = $("[data-qid=" + q.cmeQuestionId + "][data-choiceid=" + value.cmeChoiceId + "]").hasClass("choiceSelected");
				if (sel) { //make sure it's supposed to be
					if (value.correct == 1) correct = true; else correctOff = true;
				} else {
					if (value.correct == 1) correctOff = true; 
				}

			});
			if (correctOff) correct = false;
		}
		if (correct) correctTotal++;
		answer["correct"] = correct;
		self.prePostResponse.push(answer);
		answer = null;
		
	});	
	self.prePostRatio = correctTotal / self.prePostResponse.length;
} //ef

this.showLeaderBoard = function() {
	
	if (_.isArray(icme.scores) && icme.scores.length > 0) {
	
		var cell = "";
		
		var idx = ["Hole","1","2","3","4","5","6","7","8","9","Out","10","11","12","13","14","15","16","17","18","In","Total","Par"];
		
		var parArr = ["<strong>Par</strong>",2,4,3,2,3,3,3,2,3, 25, 3,4,4,4,3,3,4,4,3, 32, 57,""];
		
		var parIn = 0;
		var parOut = 0;
		var partialPar = 0;
		
		var row = [0,"hole1","hole2","hole3","hole4","hole5","hole6","hole7","hole8","hole9",1,"hole10","hole11","hole12","hole13","hole14","hole15","hole16","hole17","hole18",2,3,4];
		
		var html = "<div style='text-align: center'>"
		+ "<table id='leaderBoardTable' style='width: 90%; margin: auto; background-color: #FFFBD6'><tr>";
		
		for (var h in idx) {
			html += "<th class='center'>" + idx[h] + "</th>";
		}
		
		html += "</tr><tr>";
		
		for (var h in parArr) {
			html += "<td class='center'>" + parArr[h] + "</td>";
		}
		
		html += "</tr>";
		
			for (var p in icme.scores) {
			
				parIn = 0;
				parOut = 0;
				partialPar = 0; 
				cell = "";
		
				html += "<tr>";
			
				for (var h in row) {
				
					var holePar = icme.scores[p].record.course.totalHoleSwings[row[h]];
					
					
					
					if (!_.isUndefined(holePar)) {
						//calculations
						if (h < 10) {
							parOut += parseInt(holePar);
						} else {
							parIn += parseInt(holePar);
						}
					}
					
				
					
					if (_.isString(row[h])) {
						
						if (_.isUndefined(holePar)) {
							cell = "";
						} else {
							cell = holePar;
							partialPar += parseInt(parArr[h]);
						}
						html += "<td class='center'>  " + cell + " </td>\n  ";
						
					} else if (_.isNumber(row[h])) {
					
						switch (row[h]) {
						
							case 0: //name
								html += "<td class='bold'>  " + icme.scores[p].username + " </td>\n  ";
							break;
							
							case 1: //out
								html += "<td class='center bold'>  " + parOut + " </td>\n  ";
							break;
							
							case 2: //in
								html += "<td class='center bold'>  " + parIn + " </td>\n  ";
							break;
							
							case 3: //total
								html += "<td class='center'>  " + icme.scores[p].record.course.totalSwings + " </td>\n  ";
							break;
							
							case 4: //par
								var userPar = (parseInt(icme.scores[p].record.course.totalSwings) - parseInt(partialPar));
								if (parseInt(userPar) > 0) {
									userPar = "+" + userPar;
								} else if (parseInt(userPar) == 0) {
									userPar = "E";
								}
								html += "<td class='center'>  " + userPar + " </td>\n  ";
							break;
						} //end switch
						
					} //if number
					
			} // row loop
			html += "</tr>";
		} //score loop
		
		
		html += "</table>"
		

	} else {
		var html = "<br /><br /><br /><div class='center'>No players have completed the game yet.</div>";
	}
	

	$('#leaderboardDiv').html(html);


} //ef

this.showQ4image = function() {

	
	var q4image = "<div style='text-align: center'><img src='/iCME/ProState/images/gleason.jpg'></div>";
	$("#uiModalDialog").html(q4image);
	                $("#uiModalDialog").dialog({
	                    title: 'Gleason image',
	                    width: 600,
	                    height: 600,
	                    buttons: {
	                        "OK": function() {
	                            $(this).dialog('close');
	                        }
	                    }
	                });
	                $("#uiModalDialog").dialog("open");
	                
} //ef


} //ec ProStateViewController



//scorecard

scorecard.populateCard = function(){

	var rx = /^hole(.*)/;
	var parTotal = 0;
	var parCourseIn = 0;
	var parCourseOut = 0;
	var courseTotal = 0;
	var parSoFar = 0;
	for (var par in icme.model.parArray) {
		var hole = rx.exec(par);
		var holePar = '#r1-' + hole[1];
		var holeCourse = '#r2-' + hole[1];	
		
		$(holePar).html(icme.model.parArray[par]);
		
		if (parseInt(course.totalHoleSwings[par]) > 0) {
			$(holeCourse).html(course.totalHoleSwings[par]);
		}
		
		parTotal += (icme.model.parArray[par]);
		
		if (parseInt(course.totalHoleSwings[par]) > 0) {
		
			courseTotal += parseInt(course.totalHoleSwings[par]);
			parSoFar += (icme.model.parArray[par]);
				
			if (parseInt(hole[1]) > 9) {
				parCourseIn += parseInt(course.totalHoleSwings[par]);
				
				
			}
			
			if (parseInt(hole[1]) < 10) {
				parCourseOut += parseInt(course.totalHoleSwings[par]);
			}
		}
		
		if (hole[1] === '9') {
			$('#r1-out').html(icme.model.parOut);
			$('#r2-out').html(parCourseOut);
		}
		
		if (hole[1] === '18') {
			$('#r1-in').html(icme.model.parIn);
			$('#r2-in').html(parCourseIn);
		}

	}
		
	//
	$('#r1-total').html(parTotal);
	
	$('#r2-total').html(courseTotal);
	
	var currentPar = courseTotal - parSoFar;
	var prefix = "";
	if (currentPar > 0) {
		prefix = "+";
	} else if (currentPar < 0) {
		prefix = "-";
	}
	
	$('#r2-par').html(prefix + currentPar);
	
	
}

//this is redundant of the above but the most expedient
scorecard.calculate = function() {

	var rx = /^hole(.*)/;
	var parTotal = 0;
	var parCourseIn = 0;
	var parCourseOut = 0;
	var courseTotal = 0;
	var parSoFar = 0;
	for (var par in icme.model.parArray) {
		var hole = rx.exec(par);
		var holePar = '#r1-' + hole[1];
		var holeCourse = '#r2-' + hole[1];	
		
		parTotal += (icme.model.parArray[par]);
		
		if (parseInt(course.totalHoleSwings[par]) > 0) {
		
			courseTotal += parseInt(course.totalHoleSwings[par]);
			parSoFar += (icme.model.parArray[par]);

		}
	}
	
	course.currentPar = courseTotal - parSoFar;
	course.totalPar = parTotal = parSoFar;
	
}





