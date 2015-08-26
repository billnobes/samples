<?php

class MetiTron extends MetiTronBase {



	//----------------------------------------
	function calculateMedCompliance($period=7) {

		logit(INFO,"Starting Med Compliance Metis");

		//check for flag
		if ($time = getFlag("MetiMedComplianceRun")) {
			$e = round((time() - $time)/60,2); //get hours
			if ($e > 360) logit(WARN,"Error: calculateMedCompliance says it's been running for 6 hours ".__FILE__." on line: ".__LINE__);
			logit(REPORT," MetiMed run aborted because it says it's still running. (Runtime: $e minutes, flag: MetiMedComplianceRun) in ".__FILE__." on line: ".__LINE__);
			return false;
		} else setFlag("MetiMedComplianceRun",time());


		$meds = new Meds();
		$sql="SELECT uRec FROM users WHERE userType= 1 AND disabled = 0 ";
		if ($rc=dbQuery($sql)) {
			while ($row=dbFetch($rc)) {
				logit(INFO,"Getting med complaince for {$row["uRec"]}");
				$meds->setUser($row["uRec"]);
				$meds->setStatusPeriod($period);
				$meds->getMedCompliance();
				//print_r($meds->medStatus);

				if (is_array($meds->medStatus)) {
					foreach($meds->medStatus as $key => $value) {
						$sql = "DELETE FROM userMedCompliance WHERE medId = '$key' AND period = '$period' ";
						if ($rc2=dbQuery($sql)) {
							$in="";
							$in["uRec"]=$row["uRec"];
							$in["period"]=$period;
							$in["medId"]=$key;
							$in["taken"]=$value["took"];
							$in["missed"]=$value["missed"];
							$in["unreported"]=$value["unreported"];
							$in["alert"]=$value["alertLevel"];
							$in["days"]=$value["days"];
							$in["doses"]=$value["doses"];
							$sql = "INSERT INTO userMedCompliance ".makeSql($in,"insert");
							if ($rc3=dbQuery($sql)) {}
							else {
								logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
							}
						}
						
						
						//cacluate running total for graph
						
					}
				}

			}

		} else {
			logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
		}

		clearFlag("MetiMedComplianceRun");
		return true;
	} // ef
	
	
		//----------------------------------------
	function calculateMedHistory() {

		$meds = new Meds();
		$sql="SELECT uRec FROM users WHERE userType= 1 AND disabled = 0 ";
		if ($rc=dbQuery($sql)) {
			while ($row=dbFetch($rc)) {
				logit(INFO,"Getting med history for {$row["uRec"]}");
				$meds->setUser($row["uRec"]);
				$meds->getUserMeds();
		
				if (is_array($meds->userMeds)) {
					foreach($meds->userMeds as $key => $value) {
		
		
						$h = array();
						for ($i = 30; $i > 0; $i--) {
							$date = date(DBDATE,strtotime(" -$i days"));
							$sql = "SELECT * FROM userMedHistory WHERE uRec = '".sqlClean($row["uRec"])."' AND userMedId = '".sqlClean($key)."' AND DATE(utcTime) = '$date' ";
							$c = -1;
							$took = 0;
							$missed = 0;
							$t = 0;
							if ($rc2 = dbQuery($sql)) {
		
								while ($row2 = dbFetch($rc2)) {
									if ($row2["taken"]) $took++;
									else $missed++;
									$t++;
								}
								if ($t) $c = round($took / $t,2);
		
		
							} else {
								logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
							}
							$h[] = $c;
						}
						$s = implode(",",$h);
						$sql = "UPDATE userMeds SET history = '$s' WHERE userMedId = '$key' ";
						if ($rc3 = dbQuery($sql)) {}
						else logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
						
						logit(DEBUG,"Med History: U:{$row["uRec"]} [$key] = $s");
		
		
					} //e med for
				} //e if array
		
			} //end user while
		
		} else {
			logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
		}


	} // ef





	//----------------------------------------
	function calculateSurveyStats($day="today") {
		/* Calculate survey question deltas.
     For each survey question, create a 28 day window.
     Compare answer average for the first 21 days versus 7 most recent.
  */

		logit(INFO,"Starting survey delta analyzer");
		//check for flag
		if ($time = getFlag("MetiSurveyRun")) {
			$e = round((time() - $time)/60,2); //get hours
			if ($e > 360) logit(WARN,"Error: calculateSurveyStats says it's been running for 6 hours ".__FILE__." on line: ".__LINE__);
			logit(REPORT," MetiSurvey run aborted because it says it's still running. (Runtime: $e minutes, flag: MetiSurveyRun) in ".__FILE__." on line: ".__LINE__);
			return false;
		} else setFlag("MetiSurveyRun",time());

		// The first window is the older one, default is 21 days.
		// Window 2 is the most recent, default size is 7 days
		$window1Size = 21;
		$window2Size = 7;

		if ( $day == "today" ) {
			$longStart=dbDate(strtotime("-29 days"));
			$longEnd=dbDate(strtotime("-8 days"));
			$shortEnd=dbDate("-1 day");
			$today=dbDate();
		}
		else {
			$today=dbDate($day);
			$longStart=dbDate(strtotime("$today -28 days"));
			$longEnd=dbDate(strtotime("$today -7 days"));
			$shortEnd=$today;
		}

		$sql="SELECT uRec FROM users WHERE userType=1 AND disabled=0 AND created < '$longStart'";

		if ($rc=dbQuery($sql)) {
			while ($row=dbFetch($rc)) {
				$survey = array();
				// Get answers for first window
				$sql="SELECT userSurveyHistoryId FROM userSurveyHistory WHERE uRec={$row["uRec"]} AND DATE(takentime)>='$longStart' AND DATE(takentime)<='$longEnd'";
				if ($rc2=dbQuery($sql)) {
					while ($row2=dbFetch($rc2)) {
						$sql="SELECT qId, responseInt from userSurveyResponses WHERE surveyId={$row2["userSurveyHistoryId"]}";
						if ($rc3=dbQuery($sql)) {
							while ($row3=dbFetch($rc3)) {

								if ( !isset($survey[$row3["qId"]]['set1']['raw']))
									$survey[$row3["qId"]]['set1']['raw'] = 0;

								if ( !isset($survey[$row3["qId"]]['set1']['answers']))
									$survey[$row3["qId"]]['set1']['answers'] = 0;

								$survey[$row3["qId"]]['set1']['raw'] += $row3["responseInt"];
								$survey[$row3["qId"]]['set1']['answers'] += 1;
							}
						} else logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
					}
				}
				else logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);

				// Get answers for second window
				$sql="SELECT userSurveyHistoryId FROM userSurveyHistory WHERE uRec={$row["uRec"]} AND DATE(takentime)>'$longEnd' AND DATE(takentime)<='$shortEnd'";
				if ($rc2=dbQuery($sql)) {
					while ($row2=dbFetch($rc2)) {
						$sql="SELECT qId, responseInt from userSurveyResponses WHERE surveyId={$row2["userSurveyHistoryId"]}";
						if ($rc3=dbQuery($sql)) {
							while ($row3=dbFetch($rc3)) {

								if ( !isset($survey[$row3["qId"]]['set2']['raw']))
									$survey[$row3["qId"]]['set2']['raw'] = 0;

								if ( !isset($survey[$row3["qId"]]['set2']['answers']))
									$survey[$row3["qId"]]['set2']['answers'] = 0;

								$survey[$row3["qId"]]['set2']['raw'] += $row3["responseInt"];
								$survey[$row3["qId"]]['set2']['answers'] += 1;
							}
						} else logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
					}
				}
				else logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);



				foreach ($survey as $qid => $val) {
					$survey[$qid]['set1']['avg'] = $survey[$qid]['set1']['answers'] > 0 ? $survey[$qid]['set1']['raw']/$survey[$qid]['set1']['answers'] : 0;
					$survey[$qid]['set2']['avg'] = $survey[$qid]['set2']['answers'] > 0 ? $survey[$qid]['set2']['raw']/$survey[$qid]['set2']['answers'] : 0;

					// confidence score calculation.
					// Confidence score = percentage of answers given for a particular window
					// Score is calculated for both windows, and the lower fo the two is
					// kept and saved in database.
					$confidenceScore1 = $survey[$qid]['set1']['answers'] > 0 ?
						round($survey[$qid]['set1']['answers']/$window1Size * 100) : 0;
					$confidenceScore2 = $survey[$qid]['set2']['answers'] > 0 ?
						round($survey[$qid]['set2']['answers']/$window2Size * 100) : 0;
					$confidenceScoreFinal = min($confidenceScore1, $confidenceScore2);


					if ( $survey[$qid]['set1']['avg'] == 0 ) {
						$survey[$qid]['delta'] = round($survey[$qid]['set2']['avg']/100);
					}
					else {
						$survey[$qid]['delta'] = round(($survey[$qid]['set2']['avg']-$survey[$qid]['set1']['avg'])/$survey[$qid]['set1']['avg']*100);
					}

					$sql = "SELECT count(*) as count from userSurveyDelta WHERE uRec={$row["uRec"]} AND questionId={$qid}";
					if ( $rc2=dbQuery($sql) ) {
						if ($row2=dbFetch($rc2)) {
							$questionAnswered = $row2["count"] > 0 ? true : false;
						}
						else logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
					}
					else {
						logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
					}

					$questionAnswered = 0;
					if ( $questionAnswered ) {
						$update["percentChange"] = $survey[$qid]["delta"];
						$sql="UPDATE userSurveyDelta " . makeSql($update, "update") . " WHERE uRec={$row["uRec"]} AND questionId={$qid}";
					}
					else {
						$in["percentChange"] = $survey[$qid]["delta"];
						$in["uRec"] = $row["uRec"];
						$in["questionId"] = $qid;
						$in["confidenceScore"] = $confidenceScoreFinal;
						$sql="INSERT INTO userSurveyDelta " . makeSql($in, "insert");
					}
					if (!$rc2=dbQuery($sql)) logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
				}
			}
		}
		else logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);

		clearFlag("MetiSurveyRun");
		return true;

	}
	// ef

	//----------------------------------------
	function aggregateActivity() {

		logit(INFO,"Starting activity analyzer");

		$alert=new FlagMan();


		$longStart=dbDate(strtotime("-17 days"));
		$longEnd=dbDate(strtotime("-5 days"));
		$yesterday=dbDate("-1 day");
		$today=dbDate();


		$sql="SELECT uRec FROM users WHERE userType=1 AND disabled=0 AND created < '$longStart'";

		if ($rc=dbQuery($sql)) {
			while ($row=dbFetch($rc)) {

				$alert->setUser($row["uRec"]);

				//calculate percent change from a 12 days block compared to the last 4 days.

				$sql="SELECT count(*) AS count from activityLog WHERE uRec={$row["uRec"]} AND DATE(time)>='$longStart' AND DATE(time)<='$longEnd'";
				if ($rc2=dbQuery($sql)) {
					if ($row2=dbFetch($rc2)) {
						$old=$row2["count"]/12;
						$total = $row2["count"]; //echo $row2["count"]." :: $checkDate ;: $idx\n";
						$sql="SELECT count(*) AS count from activityLog WHERE uRec={$row["uRec"]} AND DATE(time)>'$longEnd' AND DATE(time)<='$today'";
						if ($rc2=dbQuery($sql)) {
							if ($row2=dbFetch($rc2)) {
								$new=$row2["count"]/4;
								$total += $row2["count"];
							} else logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
						} else logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
					} else {
						logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
					}
				} else logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);

				//print_r($old);
				//print_r($new);
				if ( !$old ) {
					$pd=round($new/100);
				}
				else {
					$pd=round(($new-$old)/$old*100);
				}
				
				//the creates a fudgy number based on how much activity a user has shown on the system. This inclues surveys
				//and logins so if they login a few times they may xhow up in the alerts even though they have not reported anything
				$average = round(($total/16)*100);
				
				if (CLI_ECHO) logit(INFO,"ACTIVITY:{$row["uRec"]}\t$pd\t$average");

				$sql="UPDATE users SET activityChange='$pd', activityMetric ='$average' WHERE uRec={$row["uRec"]} ";
				if (!$rc2=dbQuery($sql)) logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
				$alert->checkActivityDelta();

			}
			//setFlag("metisActivityAggregatorLastDate",dbDate());
		} else logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);



		return true;
	} // ef




	/**
	 * linear regression function
	 * @param $x array x-coords
	 * @param $y array y-coords
	 * @returns array() m=>slope, b=>intercept
	 */
	function linear_regression($x, $y) {

		// calculate number points
		$n = count($x);

		// ensure both arrays of points are the same size
		if ($n != count($y)) {

			trigger_error("linear_regression(): Number of elements in coordinate arrays do not match.", E_USER_ERROR);

		}

		// calculate sums
		$x_sum = array_sum($x);
		$y_sum = array_sum($y);

		$xx_sum = 0;
		$xy_sum = 0;

		for($i = 0; $i < $n; $i++) {

			$xy_sum+=($x[$i]*$y[$i]);
			$xx_sum+=($x[$i]*$x[$i]);

		}

		// calculate slope
		$m = (($n * $xy_sum) - ($x_sum * $y_sum)) / (($n * $xx_sum) - ($x_sum * $x_sum));

		// calculate intercept
		$b = ($y_sum - ($m * $x_sum)) / $n;

		// return result
		return array("m"=>$m, "b"=>$b);

	}


	//----------------------------------------
	function calculateAttentionScore() {
		global $user;

		logit(INFO,"Starting Attention Score Calculator");

		$att = new AttentionAlerts();
		$med = new Meds();
		$user = new User();
		$trends = new UserMetrics();

		//check for flag
		if ($time = getFlag("MetiAttentionRun")) {
			$e = round((time() - $time)/60,2); //get hours
			if ($e > 360) logit(WARN,"Error: calculateAttentionScore says it's been running for 6 hours ".__FILE__." on line: ".__LINE__);
			logit(REPORT," MetiAttention run aborted because it says it's still running. (Runtime: $e minutes, flag: MetiAttentionRun) in ".__FILE__." on line: ".__LINE__);
			return false;
		} else setFlag("MetiAttentionRun",time());

		//ok flags are fine let's run this. Round up them doggies

		$sql = "SELECT * FROM users WHERE userType = 1 AND disabled = 0 ";
		if ($rc = dbQuery($sql)) {
			while ($row = dbFetch($rc)) {

				if (CLI_ECHO) logit(INFO,"uRec: {$row["uRec"]}");

				$uRec = $row["uRec"];
				$user->setUser($uRec);
				$user->getUser();
				//$trends->setUser();
				//$trends->getLatestSurveyCats();
				
				$this->attentionAggregate = array();
				$this->attentionAggregate["meds"] = 0;
				$this->attentionAggregate["survey"] = 0;
				$this->attentionAggregate["activity"] = 0;
				$this->attentionAggregate["medsAbs"] = 0;

				//remove med related scres
				$sql = "DELETE FROM attentionFlags WHERE uRec = '$uRec' AND (type = '$att->attentionMeds' OR type = '$att->attentionMedAbs') ";
				if ($rctemp = dbQuery($sql)) {
					//calc med score.
					$sql = "SELECT * FROM userMedCompliance WHERE uRec = '$uRec' AND period = '30' AND days = '30' ";
					if ($rcMed = dbQuery($sql)) {
						$med30 = array();
						$med30Abs = array();
						while ($rowMed = dbFetch($rcMed)) {
							$med30[$rowMed["medId"]] = $rowMed["taken"]/$rowMed["doses"];
							
							//if patient has reported more than 50% record med compliance
							if ($rowMed["doses"] AND ($rowMed["unreported"] / $rowMed["doses"]) < .5)  $med30Abs[$rowMed["medId"]] = $rowMed["taken"]/$rowMed["doses"];
						}
					} else {
						logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
					}
					
					//calculate abs med compliance
										
					if (is_array($med30) OR is_array($med30Abs)) {
						$med->setUser();
						$med->getUserMeds(TRUE,FALSE);
					}
					
					if (is_array($med30Abs)) {
					
						$temp = array();	
						//let's write flags for each
						foreach ($med30Abs as $key => $value) {
						
							$score = 0;
							if ($value < .8) {
							
								if ($value < .6) $score = 3;
								elseif ($value < .7) $score = 2;
								else $score = 1;
								$temp[] = $score;
							
								$in = "";
								$in["uRec"] = $uRec;
								$in["ref"] = $key;
								$in["weight"] = $score;
								$in["type"] = $att->attentionMedAbs;
								$in["note"] = $med->userMeds[$key]["medOther"]." compliance is ".round(($value * 100),0)."%";
								$in["expire"] = dbDate("+7 days");
								$sql = "INSERT INTO attentionFlags ".makeSql($in,"insert");
								if ($rcTemp = dbQuery($sql)) {} else {logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);}
							}
	
						} //end for
						//get highest score
						if (count($temp) > 0) $this->attentionAggregate["medsAbs"] = max($temp);						
					
					}

					$medAlertList = array();
					//calculate window trend for med compliance
					//ok we got all of the 30s now let's get the 7s
					if (is_array($med30)) {

						foreach ($med30 as $key => $value) {

							$sql = "SELECT * FROM userMedCompliance WHERE medId = '$key' AND uRec = '$uRec' AND period = '7' AND days = '7' ";
							if ($rcMed = dbQuery($sql)) {
								while ($rowMed = dbFetch($rcMed)) {
									$med7 = $rowMed["taken"]/$rowMed["doses"];
									if ($value > 0) {
										$d = ($med7 - $value) / $value;
										$delta = round($d * 100);
									} else $delta = 0;
									//got the delta, now let's calc att score
									$medScore = 0;
									if (is_numeric($delta) AND $delta < -19) {

										if ($delta < -60) $medScore = 3;
										elseif($delta < -40) $medScore = 2;
										else $medScore = 1;
										
										$this->attentionAggregate["meds"] = max($this->attentionAggregate["meds"],$medScore);
										//save score for this med.
										$in = "";
										$in["uRec"] = $uRec;
										$in["ref"] = $key;
										$in["weight"] = $medAlertList[] = $medScore;
										$in["type"] = $att->attentionMeds;
										$in["note"] = $med->userMeds[$key]["medOther"]." compliance has declined by ".abs($delta)."%";
										$in["expire"] = dbDate("+7 days");
										$sql = "INSERT INTO attentionFlags ".makeSql($in,"insert");
										if ($rcTemp = dbQuery($sql)) {} else {logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);}
									}
								}
							} else {
								logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
							}

						} //end med 30 loop
						
						
					}
				//aggregate meds	
				//if (count($medAlertList) > 0 ) $this->attentionAggregate["meds"] = array_sum($medAlertList) / count($medAlertList);
				 
				

				} else {
					logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
				}

				//lookup survey
				$sql = "DELETE FROM attentionFlags WHERE uRec = '$uRec' AND type = '$att->attentionSurvey' ";
				if ($rctemp = dbQuery($sql)) {

					$trends->setUser();
					$s = $trends->getLatestSurveyCats();
					$delta = $s["min"];
					$surveyScore = 0;
					if (is_numeric($delta) AND $delta < -11) {

						if ($delta < -39) $surveyScore = 3;
						elseif($delta < -19) $surveyScore = 2;
						else $surveyScore = 1;
						
						$this->attentionAggregate["survey"] = max($this->attentionAggregate["survey"],$surveyScore);
						//save score
						$in = "";
						$in["uRec"] = $uRec;
						$in["ref"] = 0;
						$in["weight"] = $surveyScore;
						$in["type"] = $att->attentionSurvey;
						$in["note"] = "We\'ve noticed a drop in some survey answers in the past 30 days.";
						$in["expire"] = dbDate("+7 days");
						$sql = "INSERT INTO attentionFlags ".makeSql($in,"insert");
						if ($rcTemp = dbQuery($sql)) {} else {logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);}
					}
				} else logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
				
			//lookup activity
				$sql = "DELETE FROM attentionFlags WHERE uRec = '$uRec' AND type = '$att->attentionActivity' ";
				if ($rctemp = dbQuery($sql)) {

					$delta = $row["activityChange"];
					$activityScore = 0;
					if (is_numeric($delta) AND $delta < -19) {
						if ($delta < -59) $activityScore = 3;
						elseif($delta < -39) $activityScore = 2;
						else $activityScore = 1;
						
						$this->attentionAggregate["activity"] = $activityScore;
						//save score
						$in = "";
						$in["uRec"] = $uRec;
						$in["ref"] = 0;
						$in["weight"] = $activityScore;
						$in["type"] = $att->attentionActivity;
						$in["note"] = "C3HealthLink interaction has dropped by ".abs($delta)."% in the past 30 days.";
						$in["expire"] = dbDate("+7 days");
						$sql = "INSERT INTO attentionFlags ".makeSql($in,"insert");
						if ($rcTemp = dbQuery($sql)) {} else {logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);}
					}
				}
				
				//let's get the other alert scores
				$sqlArr = array();
				$sqlArr["attentionDiaryRank"] = "SELECT MAX(weight) FROM attentionFlags WHERE uRec= $uRec AND type = $att->attentionDiaryRank ";
				$sqlArr["attentionDiaryKeyword"] = "SELECT MAX(weight) FROM attentionFlags WHERE uRec= $uRec AND type = $att->attentionDiaryKeyword ";
				$sqlArr["attentionSideEffect"] = "SELECT MAX(weight) FROM attentionFlags WHERE uRec= $uRec AND type = $att->attentionSideEffect ";
				$sqlArr["attentionMedComment"] = "SELECT MAX(weight) FROM attentionFlags WHERE uRec= $uRec AND type = $att->attentionMedComment ";
				foreach ($sqlArr as $key => $value) {
					$this->attentionAggregate[$key] = 0;
					if ($rcTemp = dbQuery($value)) {
						if ($rowTemp = dbFetch($rcTemp)) {
							$t = array_pop($rowTemp);
							if ($t) $this->attentionAggregate[$key] = $t;
							//logit(INFO,"$key : {$this->attentionAggregate[$key]}");
						}
					} else {
						logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
					}
				}

				//logit(INFO,"ME: ".print_r($this->attentionAggregate,1));
				//calculate 
				/*
					The max score is 18 but it's very rare anyone will hit max in all six categories so we assume anything above 6 is a red alert
				*/
				$attAggTotal = array_sum($this->attentionAggregate);
				
				
				if ($attAggTotal > 0 AND $attAggTotal < 4 ) $attScore = 2;
				elseif ($attAggTotal > 3 AND $attAggTotal < 7 ) $attScore = 3; 
				elseif ($attAggTotal > 6) $attScore = 4; 
				elseif ($user->active) $attScore = 1; 
				else $attScore = 0; 
				
				//logit(INFO,"SCORE: $attScore\t MEAN: $attAggMean\tTOTAL: $attAggTotal\tMAX: $attMax");
				//				$sql = "UPDATE users SET attScore = $attScore WHERE uRec = '$uRec' ";
				//				if (!$rcTemp = dbQuery($sql)) logit(WARN,"Error:  in ".__FILE__." on line: ".__LINE__);
				
				
			} //urec loop
		} else {
			logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
		}

		
		clearFlag("MetiAttentionRun");
		logit(INFO,"Ending Attention Score Calculator");


		return true;
	} // ef


} //ec metiTron


?>