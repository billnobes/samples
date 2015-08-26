<?php

class MobileSurvey {

	//----------------------------------------
	function __construct() {

		$this->addError("init");

		return true;
	} // ef


	function setuRec($s) {$this->uRec = sqlClean($s);}
	function setEmailId($s) {$this->emailId = sqlClean($s);}
	function setSurveyQuestionResponse($s) {$this->surveyQuestionResponses = $s;}
	function setMedId($s) {$this->medId = sqlClean($s);}
	function setSurveyId($s) {$this->surveyId = sqlClean($s);}
	function setMedComment($s) {$this->medComment = sqlClean($s);}
	function setMedResponseArray($s) {$this->medResponseArray = $s;}
	function setGoalResponseArray($s) {$this->goalResponseArray = $s;}
	function setLastResponseArray($s) {$this->lastResponseArray = $s;}
	
	function setMetabolicResponses($s) {$this->surveyMetabolicResponses = $s;}


	//----------------------------------------
	function getSurvey() {

		logit(DEBUG,"Getting Survey Object");
		$survey=new Survey();
		if (is_uRec($this->uRec)) {

			$survey->setUser();
			$survey->setEmailId($this->emailId);
			$survey->responseVector="appSurvey";
			$survey->getSurvey();

			if ($survey->error) {
				$this->addError(ERRORTEXT.": Survey object error");
				logit(WARN,"Error: $survey->error in ".__FILE__." on line: ".__LINE__);
			} else {
				$this->mobileSurvey = $survey->survey;
			}

		} else {
			logit(WARN,"Error: got bad urec $this->uRec in ".__FILE__." on line: ".__LINE__);
			$this->addError(ERRORTEXT.": bad user record");
		}

		return true;
	} // ef

	//----------------------------------------
	function saveSurveyQuestions() {

		logit(DEBUG,"Saving Survey questions");
		$survey=new Survey();
		if (is_uRec($this->uRec)) {

			$survey->setUser();
			$survey->setEmailId($this->emailId);
			$survey->responseVector="appSurvey";
			$survey->getuRecFromEmailId($this->emailId);
			$survey->surveyQuestionResponses = $this->surveyQuestionResponses;
			$survey->getSurvey(); //we need this to save

			$survey->saveSurveyQuestions();
			
			$survey->surveyMetabolicResponses = $this->surveyMetabolicResponses;
			$survey->saveMetabolic();
			
			if ($survey->error) {
				$this->addError(ERRORTEXT.": Survey save error");
				logit(WARN,"Error: $survey->error in ".__FILE__." on line: ".__LINE__);
			} else {
				//success
			}

		} else {
			logit(WARN,"Error: got bad urec $this->uRec in ".__FILE__." on line: ".__LINE__);
			$this->addError(ERRORTEXT.": bad user record");
		}


		return true;
	} // ef

	//----------------------------------------
	function saveMedComment() {
		if (strlen($this->medComment) > 0) {
			if (is_numeric($this->medId) AND is_uRec($this->uRec)) {
				$survey = new Survey();
				$survey->setUser($this->uRec);
				$survey->responseVector="appSurvey";
				$survey->medComments[$this->medId]["comment"] = $this->medComment;
				$survey->saveMedComments();
				if ($survey->resp["error"]) {
					$this->addError(ERRORTEXT);
				}
			} else {
				logit(WARN,"Error: Got non-numeric medId or bad urec in ".__FILE__." on line: ".__LINE__);
				$this->addError(ERRORTEXT.": bad medId or uRec");
			}
		} else {
			logit(WARN,"Error: Got empty med comment in ".__FILE__." on line: ".__LINE__);
			$this->addError(ERRORTEXT.": empty med comment");
		}

		return true;
	} // ef
	

	//----------------------------------------
	function  saveMedSurveyPage() {
	
		if (is_array($this->medResponseArray) AND is_uRec($this->uRec)) {
		
			$survey = new Survey();
			$survey->setUser($this->uRec);
			$survey->responseVector="appSurvey";
			
			$survey->schedMeds = array();
			//let's massage the response object for input
			foreach ($this->medResponseArray as $value) {
				//temp hack to allow hst to work even though changed to umhid
				if ($value["umhid"]) $userMedHistoryId = $value["umhid"];
				else $userMedHistoryId = $value["hst"];
		
				$survey->schedMeds[$userMedHistoryId] = array (
				"taken" => $value["response"] == 1 ? 1 : 0,
				"missed" => $value["response"] == 2 ? 1 : 0,
				"dose" => $value["dose"]
				);
			}
			$survey->surveyId = $this->surveyId;
			$survey->saveSchedMeds();
			
			if ($survey->resp["error"]) {
				$this->addError(ERRORTEXT);
				logit(WARN,"Error: got error from survey object {$survey->resp["error"]} in ".__FILE__." on line: ".__LINE__);
			}
			
		
			
		} else {
			$this->addError(ERRORTEXT.": empty med response object or bad user rec");
			logit(WAR,"");logit(WARN,"Error: medResponseArray was empty  or bad user rec in ".__FILE__." on line: ".__LINE__);
		}
		
	
	return true;
	} // ef 
	
	//----------------------------------------
	function saveGoalSurveyPage() {
	
		if (is_array($this->goalResponseArray)) { //check for array but don't error if null.
			if(is_uRec($this->uRec)) {
				$survey = new Survey();
				$survey->setUser($this->uRec);
				$survey->responseVector="appSurvey";
				$survey->surveyGoalResponses = $this->goalResponseArray;
				$survey->surveyId = $this->surveyId;
				$survey->saveGoals();	
			} else {
				$this->addError(ERRORTEXT.":  bad user rec");
				logit(WARN,"Error: bad user rec in ".__FILE__." on line: ".__LINE__);
			}
		} //not an error because there are use cases where a response is sent but if no goals are required it's ok
	
	return true;
	} // ef 
	
	//----------------------------------------
	function saveLastSurveyPage() {
	
	if (is_array($this->lastResponseArray) AND is_uRec($this->uRec)) {
			$survey = new Survey();
			$survey->setUser($this->uRec);
			$survey->responseVector="appSurvey";
			//$survey->surveyGoalResponses = $this->goalResponseArray;
			$survey->surveyId = $this->surveyId;
			
			
			$survey->saveDiaryComment($this->lastResponseArray);
			
			if (is_array($this->lastResponseArray["otherMeds"])) {
				$survey->otherMeds = $this->lastResponseArray["otherMeds"];
				$survey->saveOtherMeds();
			}
			
			if (is_array($this->lastResponseArray["sideEffects"])) {
				$survey->sideEffects = $this->lastResponseArray["sideEffects"];
				$survey->saveSideEffects();
			}
			
			$survey->setSurveyStatus(4);
			
			
			
		} else {
			$this->addError(ERRORTEXT.": empty lastResponseArray response object or bad user rec");
			logit(WAR,"");logit(WARN,"Error: lastResponseArray was empty  or bad user rec in ".__FILE__." on line: ".__LINE__);
		}
	
	
	return true;
	} // ef 


	//----------------------------------------
	function addError($error) {

		if ($error == "init") {
			$this->error = false;
		} else {
			$this->error[] = $error;
		}

		return true;
	} // ef

	//----------------------------------------
	function getError($clear = true) {

		if (!$this->error) {
			return false;
		} else {
			$this->errorMessageText = implode("\n",$this->error);
			$this->errorMessageHtml = implode("\n<br />",$this->error);
			if ($clear) $this->addError("init");
			return true;
		}
	} // ef

} //ec