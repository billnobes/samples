<?php
ob_start();
header('Content-type: application/json');
require_once("../../../psy_lib/lib/psyMasterLib.inc.php");


dbConnect();

$app = new appResponder();

if (DEV) $_POST = $_REQUEST;

// Process command
if ($_REQUEST["command"]) {

	$command=$_REQUEST["command"];
	logit(DEBUG,"COM: $command");

	switch (true) {

	case ($command == "authorizeDevice"):

		$auth = new MobileDeviceAuth();
		$auth->setUsername($_POST["username"]);
		$auth->setPassword($_POST["password"]);
		$auth->setDeviceType($_POST["deviceType"]);
		$auth->setOsVersion($_POST["osVersion"]);
		$auth->setDeviceId($_POST["deviceId"]);
		$auth->setPlatform($_POST["platform"]);
		$auth->setPushToken($_POST["pushToken"]);
		$auth->getToken();
		if ($auth->getError()) {
			$resp["error"] = $auth->errorMessageText;
		} elseif ($auth->token) {
			$resp["authToken"] = $auth->token;
		} else {
			$resp["error"] = ERRORTEXT;
		}
		break;

	case ($command == "authorizeTokens"):
		$auth = new MobileDeviceAuth();
		$auth->setDeviceId($_POST["deviceId"]);
		$auth->setAuthToken($_POST["authToken"]);
		$auth->setOsVersion($_POST["osVersion"]);
		$auth->setPushToken($_POST["pushToken"]);
		$auth->authorizeTokens();
		if ($auth->getError()) {
			$resp["error"] = $auth->errorMessageText;
		} elseif ($auth->sessionToken) {
			$resp["sessionToken"] = $auth->sessionToken;
		} else {
			$resp["error"] = ERRORTEXT;
		}

		break;

	case ($command == "getExpressDash"):

		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {
			$dash = new MobileDashboard();
			$user = new User(); //needed for dashboard model
			$user->getUser($app->uRec);
			$dash->setuRec($app->uRec);
			$dash->getDashboard();
			if ($dash->getError()) {
				$resp["error"] = $dash->errorMessageText;
			} elseif (is_array($dash->mobileDash)) {
				$resp["dashboard"] = $dash->mobileDash;
				$resp["unread"] = $dash->unreadMessages;
			} else {
				$resp["error"] = ERRORTEXT;
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in expreshDash: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}

		break;

	case ($command == "deleteAlert"):

		$app->setAuthToken($_POST["authToken"]);

		if ($app->getUrec()) {
			$dash = new Dashboard($app->uRec);
			if (is_numeric($_POST["payload"]["alertId"])) {
				$dash->deleteAlert($_POST["payload"]["alertId"]);
			}
			$resp["content"] = "OK";
		} else {
			$app->getError();
			logit(DEBUG,"Got error in expreshDash: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}

		break;




	case ($command == "getSurvey"):
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {
			$survey = new MobileSurvey();
			$user = new User(); //needed for dashboard model
			$user->getUser($app->uRec);
			$survey->setuRec($app->uRec);
			$survey->setEmailId($_POST["emailId"]);
			$survey->getSurvey();
			$survey->saveStartTime();
			$survey->saveEndTime();

			if ($survey->getError()) {
				$resp["error"] = $survey->errorMessageText;
			} elseif (is_array($survey->mobileSurvey)) {
				$resp["survey"] = $survey->mobileSurvey;
			} else {
				$resp["error"] = ERRORTEXT;
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in getSurvey: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}

		break;


	case ($command == "surveySaveQ"):
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {
			$survey = new MobileSurvey();
			$user = new User(); //needed for dashboard model
			$user->getUser($app->uRec);
			$survey->setuRec($app->uRec);
			$survey->setEmailId($_POST["payload"]["emailId"]);
			$survey->setSurveyQuestionResponse($_POST["payload"]["responses"]);
			$survey->setMetabolicResponses($_POST["payload"]["metabolicResponses"]);
			$survey->saveSurveyQuestions();
			$survey->saveEndTime();

			if ($survey->getError()) {
				$resp["error"] = $survey->errorMessageText;
			}  else {
				$resp["content"] = "OK";
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in getSurvey: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}

		break;

	case ($command == "medResponse"):
		$med = new Meds();
		if ($med->updateMedHistory($_POST["payload"]["umid"],$_POST["payload"]["took"],"app",$_POST["payload"]["dose"])) {
			logit(INFO,"Updated med history umid: {$_POST["payload"]["umid"]} ");
		} else logit(WARN,"Error: Unable to update med history Data: ".print_r($_POST,1)." in ".__FILE__." on line: ".__LINE__);
		$resp["content"]="OK";

		break;

	case ($command == "saveMedComment"):
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {
			$survey = new MobileSurvey();
			$user = new User(); //needed for dashboard model
			$user->getUser($app->uRec);
			$survey->setuRec($app->uRec);
			$survey->setMedId($_POST["payload"]["medId"]);
			$survey->setMedComment($_POST["payload"]["comment"]);
			$survey->saveMedComment();
			if ($survey->getError()) {
				$resp["error"] = $survey->errorMessageText;
			}  else {
				$resp["content"] = "OK";
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in saveMedComment: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}

		break;

	case ($command == "saveMedSurveyPage"):
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {
			$survey = new MobileSurvey();
			$user = new User(); //needed for dashboard model
			$user->getUser($app->uRec);
			$survey->setuRec($app->uRec);
			$survey->setMedResponseArray($_POST["payload"]["medArray"]);
			$survey->setSurveyId($_POST["payload"]["sid"]);
			$survey->saveMedSurveyPage();
			$survey->saveEndTime();
			if ($survey->getError()) {
				$resp["error"] = $survey->errorMessageText;
			}  else {
				$resp["content"] = "OK";
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in saveMedSurveyPage: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}


		break;

	case ($command == "saveGoalsSurveyPage"):
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {
			$survey = new MobileSurvey();
			$user = new User(); //needed for dashboard model
			$user->getUser($app->uRec);
			$survey->setuRec($app->uRec);
			$survey->setGoalResponseArray($_POST["payload"]["goalResponse"]);
			$survey->setSurveyId($_POST["payload"]["sid"]);
			$survey->saveGoalSurveyPage();
			$survey->saveEndTime();
			if ($survey->getError()) {
				$resp["error"] = $survey->errorMessageText;
			}  else {
				$resp["content"] = "OK";
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in saveGoalsSurveyPage: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}


		break;


	case ($command == "saveLastSurveyPage"):
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {
			$survey = new MobileSurvey();
			$user = new User(); //needed for dashboard model
			$user->getUser($app->uRec);
			$survey->setuRec($app->uRec);
			$survey->setLastResponseArray($_POST["payload"]["lastPageResponse"]);
			$survey->setSurveyId($_POST["payload"]["sid"]);
			$survey->saveLastSurveyPage();
			$survey->saveEndTime();
			if ($survey->getError()) {
				$resp["error"] = $survey->errorMessageText;
			}  else {
				$resp["content"] = "OK";
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in saveLastSurveyPage: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}


		break;


		// !Messaging

	case ($command == "getMessages"):
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {

			$msg = new MobileMessaging();
			$user = new User();
			$user->getUser($app->uRec);
			$msg->setuRec($app->uRec);
			$msg->setUser($user);
			$msg->setMessageIdList(json_decode($_REQUEST["messageIdList"],1));
			$msg->setFolder($_REQUEST["folder"]);
			$msg->getMessages();

			if ($msg->getError()) {
				$resp["error"] = $msg->errorMessageText;
			}  else {
				$resp["content"] = "OK";
				$resp["people"] = $msg->people;
				$resp["messages"] = $msg->messages;
				$resp["folderMove"] = $msg->folderMove;
				$resp["readOn"] = $msg->readOn;
				$resp["remove"] = $msg->removeMessages;
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in getMessages: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}

		break;


	case ($command == "getPeople"):
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {

			$msg = new MobileMessaging();
			$user = new User();
			$user->getUser($app->uRec);
			$msg->setuRec($app->uRec);
			$msg->getPeople();

			if ($msg->getError()) {
				$resp["error"] = $msg->errorMessageText;
			}  else {
				$resp["content"] = "OK";
				$resp["people"] = $msg->people;
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in getMessages: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}

		break;

	case ($command == "markMsgRead"):
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {

			$msg = new MobileMessaging();
			$user = new User();
			$user->getUser($app->uRec);
			$msg->setuRec($app->uRec);
			$msg->setmessageId($_REQUEST["payload"]["messageId"]);
			$msg->markAsRead();

			if ($msg->getError()) {
				$resp["error"] = $msg->errorMessageText;
			}  else {
				$resp["content"] = "OK";
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in getMessages: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}

		break;


	case ($command == "folderMove"):
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {

			$msg = new MobileMessaging();
			$user = new User();
			$user->getUser($app->uRec);
			$msg->setuRec($app->uRec);
			$msg->setmessageId($_REQUEST["payload"]["messageId"]);
			$msg->setNewFolder($_REQUEST["payload"]["folder"]);
			$msg->moveToFolder();

			if ($msg->getError()) {
				$resp["error"] = $msg->errorMessageText;
			}  else {
				$resp["content"] = "OK";
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in getMessages: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}

		break;

	case ($command == "sendMessage"):
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {

			$msg = new MobileMessaging();
			$user = new User();
			$user->getUser($app->uRec);

			$messages = new MessagesBase($user->record);
			$messages->newMessage();
			$messages->setSubject($_POST['payload']['subject']);
			$messages->setMessage($_POST['payload']['message']);
			//$messages->setClient($user->uid);
			//fix
			$messages->client = $app->uRec;

			//stupid fix
			foreach (json_decode($_POST['payload']['recipList']) as $uid) $stupidFix['clientRecipients'][$uid] = "None";
			$messages->setRecipients($stupidFix);
			$messages->sendMessage(1);

			if ($msg->getError() or $messages->flagFormError) {
				$resp["error"] = $msg->errorMessageText." ".$messages->formErrorMsg;
			}  else {
				$resp["content"] = "OK";
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in getMessages: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}

		break;



	case ($command == "saveMetabolic"):
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {
			//$survey = new MobileSurvey();
			//$user = new User(); //needed for dashboard model
			//$user->getUser($app->uRec);
			$mb = new MetabolicData();
			$mb->setUrec($app->uRec);
			$mb->setVector("mob:man");
			if (is_numeric($_POST["payload"]["weight"])) $mb->setWeight($_POST["payload"]["weight"]);
			if (is_numeric($_POST["payload"]["bps"]) and is_numeric($_POST["payload"]["bpd"])) {
				$mb->setBP($_POST["payload"]["bps"],$_POST["payload"]["bpd"]);
			}
			if (is_numeric($_POST["payload"]["hr"])) $mb->setHeartRate($_POST["payload"]["hr"]);
			$mb->save();

			if ($mb->getError()) {
				$resp["error"] = $mb->errorMessageText;
			}  else {
				$resp["content"] = "OK";
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in saveMetabolic: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}


		break;


		//appointments
	case ($command == "getAppointmentList"):
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {

			$appt = new Appointments();
			$user = new User();
			$user->getUser($app->uRec);
			$appt->setUser($app->uRec);
			if ($appt->getAppointmentList()) {
				$resp["appt"] = $appt->appointmentList;
				$resp["content"] = "OK";
			} else {
				$resp["error"] = "Sorry there was a system error. Please try again later.";
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in getMessages: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}

		break;


	case ($command == "saveAppt"):
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {

			$appt = new Appointments();
			$user = new User();
			$user->getUser($app->uRec);
			$appt->setUser($app->uRec);

			$appt->setappointmentUrec($app->uRec);

			$appt->setdescription($_POST["payload"]["apptDesc"]);
			$appt->setnotes($_POST["payload"]["notes"]);

			$appt->setdatetime($_POST["payload"]["apptDateLocal"]);

			$appt->setalertHoursBefore($_POST["payload"]["apptAlert"]);

			//$appt->setsms($_POST["payload"]["sms"]); //valid = yes/no

			//for now email is always on.
			$appt->setemail("yes"); //valid = yes/no

			//is this an edit?
			if (is_numeric($_POST["payload"]["apptId"])) $appt->setappId($_POST["payload"]["apptId"]);

			if ($appt->saveAppointment()) {
				$resp["content"] = "OK";
				$resp["appId"] = $appt->appId;
			} else {
				$resp["error"] = "Sorry there was a system error. Please try again later.";
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in getMessages: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}

		break;

	case ($command == "deleteAppt"):
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {

			$appt = new Appointments();
			$user = new User();
			$user->getUser($app->uRec);
			$appt->setUser($app->uRec);

			if ($appt->deleteAppointment($_REQUEST["appId"])) {
				$resp["content"] = "OK";
			} else {
				$resp["error"] = "Sorry there was a system error. Please try again later.";
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in getMessages: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}

		break;

		//reports
	case ($command == "getHtmlReport"):
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {

			$report = new MobileReports();
			$user = new User();
			$user->getUser($app->uRec);
			$report->setUrec($app->uRec);
			$report->setReportType($_POST["reportType"]);
			$report->setMedId($_POST["medId"]);

			$report->getReportPage();

			if ($report->getError()) {
				$resp["error"] = $report->errorMessageText;
			} else {
				$resp["content"] = "OK";
				$resp["html"] = $report->html;
				$resp["baseUrl"] = $config["url"];
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in getHtmlReport: uRec: $app->uRec ERR: 				$app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}

		break;
		
		case ($command == "getReportMedList"):
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {

			$report = new MobileReports();
			$user = new User();
			$user->getUser($app->uRec);
			$report->setUrec($app->uRec);

			$report->getMedList();

			if ($report->getError()) {
				$resp["error"] = $report->errorMessageText;
			} else {
				$resp["content"] = "OK";
				$resp["medList"] = $report->medList;
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in getReportMedList: uRec: $app->uRec ERR: 				$app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}

		break;


	case ($command == "resetTodaysEvents"):
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {

			$settings = new MobileSettings();
			$user = new User();
			$user->getUser($app->uRec);
			$settings->setuRec($app->uRec);
			$settings->resetTodaysEvents();

			if ($settings->getError()) {
				$resp["error"] = $settings->errorMessageText;
			}  else {
				$resp["content"] = "OK";
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in getMessages: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}


		break;

	case ($command == "submitSupportRequest"):
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {

			$settings = new MobileSettings();
			$user = new User();
			$user->getUser($app->uRec);
			$settings->setuRec($app->uRec);
			$settings->setSupportText($_POST["payload"]["formContent"]);
			$settings->sendSupportEmail();

			if ($settings->getError()) {
				$resp["error"] = $settings->errorMessageText;
			}  else {
				$resp["content"] = "OK";
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in getMessages: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}


		break;

	case ($command == "removeDevice"):
		logit(DEBUG,"got to REMOVE DEVICE");
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {

			$auth = new MobileDeviceAuth();
			//$user = new User();
			//$user->getUser($app->uRec);
			//$settings->setuRec($app->uRec);
			$auth->setAuthToken($_POST["authToken"]);
			$auth->setDeviceId($_POST["deviceId"]);
			$auth->setUrec($app->uRec);
			$auth->removeDevice();

			if ($auth->getError()) {
				$resp["error"] = $settings->errorMessageText;
			}  else {
				$resp["content"] = "OK";
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in removeDevice: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}


		break;

	case ($command == "disableAndroidPush"):
		logit(DEBUG,"got to disable android push");
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {
			$auth = new MobileDeviceAuth();
			$auth->setAuthToken($_POST["authToken"]);
			$auth->setDeviceId($_POST["deviceId"]);
			$auth->setPushToken("");
			$auth->setUrec($app->uRec);
			$auth->setAndroidPush();

			if ($auth->getError()) {
				$resp["error"] = $settings->errorMessageText;
			}  else {
				$resp["content"] = "OK";
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in getMessages: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}
		break;

	case ($command == "enableAndroidPush"):
		logit(DEBUG,"got to enable android push");
		$app->setAuthToken($_POST["authToken"]);
		if ($app->getUrec()) {
			$auth = new MobileDeviceAuth();
			$auth->setAuthToken($_POST["authToken"]);
			$auth->setDeviceId($_POST["deviceId"]);
			$auth->setPushToken($_POST["pushToken"]);
			$auth->setUrec($app->uRec);
			$auth->setAndroidPush();

			if ($auth->getError()) {
				$resp["error"] = $settings->errorMessageText;
			}  else {
				$resp["content"] = "OK";
			}

		} else {
			$app->getError();
			logit(DEBUG,"Got error in getMessages: uRec: $app->uRec ERR: $app->errorMessageText");
			$resp["error"] = "ERROR: ".$app->errorMessageText;
		}
		break;


	case ($command == "logit"):
		logit(WARN,"Error: {$_POST["msg"]} in ".__FILE__." on line: ".__LINE__);
		$resp["response"] = "OK";

		break;


	default:
		$resp["response"] = "NO RESPONSE TO COMMAND $command";
		//$resp["error"] = "Bad Monkey";

		break;

	}


} else {

	logit(WARN,"Error: Got bad call. No command string  in ".__FILE__." on line: ".__LINE__);
	$resp["error"] = ERRORTEXT;

}

logit(DEBUG,"RESP: ".to_json($resp));
echo to_json($resp);


class AppResponder {

	//----------------------------------------
	function  __construct() {

		$this->uRec = false;
		$this->addError("init");
		$this->authToken = false;

		return true;
	} // ef

	function setAuthToken($s) {$this->authToken = sqlClean($s);}


	//----------------------------------------
	function getUrec() {

		if ($this->authToken) {
			$sql = "SELECT * FROM appDeviceAuth WHERE authToken = '{$this->authToken}' AND disabled = 0";
			if ($rc = dbQuery($sql)) {
				if ($row = dbFetch($rc)) {
					$this->uRec = $row["uRec"];
					return true;
				} else {
					$this->addError("Sorry but there was an error. It seems that your device is no longer connected to your account");
				}
			} else {
				logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
				$this->addError(ERRORTEXT);
			}
		} else {
			$this->addError("Sorry but this device is no longer connected to your account");
		}

		return false;
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


?>