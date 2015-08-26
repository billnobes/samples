<?php



class articleModern {

	function __construct($id) {
		//constructor
		$this->artId=$id;
		global $config;

		//decode URL parameters
		if ($_REQUEST["pc"]) {
			if ($d=base64_decode($_REQUEST["pc"])) $this->status=unserialize($d);
			else {logit(WARN,"Could not decode url code getArticleHTML in ".__FILE__." on line: ".__LINE__); $error=true;}
		}

		if ($_REQUEST["preview"]=="on" or WEBADMIN or $this->status["pv"]=="on") {
			require_once "{$config["adminroot"]}/adminLib/content/artEditorLib.php";
			$this->preview=true;
			$this->status["pv"]="on";
		} else $this->preview=false;
		
		//$this->loadPortalLinks();
		
		
		$this->loadArticleData();
		
		//get template
		$this->template=getFile("{$config["siteVault"]}/templates{$this->art["template"]}");
		
		
		$this->modern = false;
		if (preg_match("/type=.modern/i",$this->template)) {
			$this->modern = true;
		}
		
		//google add
		$this->googleAd = '<div class="googleAdDiv"> <div class="advertisement">ADVERTISEMENT</div>
		
			<!-- Modern Design -->
			<ins class="adsbygoogle"
			     style="display:block"
			     data-ad-client="ca-pub-0181531050124575"
			     data-ad-slot="3309539381"
			     data-ad-format="auto"></ins>
			<script>
			(adsbygoogle = window.adsbygoogle || []).push({});
			</script>

		</div>';
		
		
		
	} //ef artPublisher
	
	
	
	function makeArticle(){
		global $config;
		
		$this->output = $this->template;
		
		//pre-process inserts
		$this->output=processInserts($this->output);
		
		//remove any page break stuff
		$this->art["body"]=preg_replace("/\[\[pagebreak\]\]/i","",$this->art["body"]);
		
		//url
		$this->url = "{$config["url"]}".articleUrl($this->artId);
		
		//which headline?
		$this->headline = $this->art["headline"];
		if (strlen(trim($this->art["newsHeadline"])) > 10) {
			$this->headline = $this->art["newsHeadline"];
		}
		
		//topic name
		$topic = $this->confNames[$this->art["conference"]];
		
		//get title
		if (is_numeric($this->art["conference"]) and $this->art["conference"]!=31) {
			$title=$this->confNames[$this->art["conference"]].": ";
		}
		$title .= $this->headline . " - The Doctor";
		
		//hook to fix feature problem
		if ($this->art["type"] == 2 AND strlen($this->art["tipLong"]) > 5) {$this->art["summary"] = $this->art["tipLong"];}
		
		//description
		if ($this->art["summary"]) $description=$this->art["summary"];
		elseif ($this->art["tipLong"]) $description=$this->art["tipLong"];
		elseif ($this->art["tipShort"]) $description=$this->art["tipShort"];
		else $description=$this->art["headline"];
		
		//date
		$date = date("F j, Y",strtotime($this->art["releaseDate"]));
		
		//insert ads
		$this->insertAds();
		
		//get read more
		$this->readMore();
		
		//get latest
		$this->latest();
		
		//swap
		while (preg_match_all("/\[\[(.*?)]\]/",$this->output,$match)) {
			
			//replace tags
			foreach($match[0] as $key=>$tag) {
				$value=$match[1][$key];
				$swap = "";
				
				switch (true) {
					
					case ($value == "title"): $swap =  $title; break;
					
					case ($value == "date"): $swap =  $date; break;
					
					case ($value == "url"): $swap =  $this->url; break;
					
					case ($value == "url.encode"): $swap =  urlencode($this->url); break;
					
					case ($value == "description"): $swap =  $description; break;
					
					case ($value == "topic"): $swap = strtoupper($topic); break;
					
					case ($value == "image"): $swap = $this->art["imageInternal"]; break;
					
					case ($value == "headline"): $swap = $this->headline; break;
					
					case ($value == "headline.encode"): $swap = urlencode($this->headline); break;
					
					case ($value == "byline"): $swap = $this->art["byline"]; break;
					
					case ($value == "summary"): $swap = $this->art["summary"]; break;
					
					case ($value == "body"): $swap = $this->art["body"]; break;
					
					case ($value == "readmore"): $swap =  $this->readMore; break;
					
					case ($value == "latest"): $swap =  $this->latest; break;
					
				}
				
				
				
				$swap=str_replace("$","\\$",$swap); //fix dollar sign problem
				$pattern="|".preg_quote($tag)."|is";
				//echo "$tag: $pattern : ".strlen($htmlPage)."<br>";
				$this->output=preg_replace($pattern,$swap,$this->output);
				$swap="";
			
			} //- foreach
			
		} //- while
		
	} //-ef makeArticle
	
	
function latest() {
	global $config;
	

	if (!WEBADMIN) $filter=" AND ".$config["validArticleSql"];
	elseif ($_GET["topdate"]) $filterPreview=" AND releaseDate <= '".sqlClean(dbDate($_GET["topdate"]))."' ";

	//get top three news items
	$sql="SELECT * FROM articles a WHERE newsHeadline !='' AND summary!=''  AND a.artId != {$this->artId} {$filter} {$filterPreview} ORDER BY releaseDate DESC LIMIT 3";

	if ( $rc=dbQuery($sql)) {
		while ( $row=dbFetch($rc)) {
			
			$url=articleUrl($row["artId"]);
			
			$topic = $this->confNames[$row["conference"]];
						
			$image = "";
			
			$this->latest .= "<div class='latestLinkDiv'>";
			
			$this->latest .= "<div id='latestImageDiv'>
				<img src='/imgNews_{$row["artId"]}.jpg' style='width: 100%'>
			</div>";
			
			$this->latest .= "<div class='latestTextDiv'>
			
				<div class='latestTextContent'>
				
				<a href='$url' class='latestLink'>{$row["newsHeadline"]}</a>
				<br />
				<div class='latestCat'>$topic</div>
				<br /><br />
				</div> <!-- //latestTextContent -->
				
			</div> <!-- //latestTextDiv -->";
			
			
			$this->latest .= "</div>";
			
			$swap[]="<div>
			<a href='$url' style='color: #ffffff; font-size: 11px; font-weight: bold'>{$row["newsHeadline"]}</a>
		<a href='$url'><font class='arrow'>&gt;</font></a></div>
		";
		}
	} else logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
	
	

	return;
} //ef 
	
	
	
	function readMore() {
		
		$this->readMore = "";
		
		if (trim(strlen($this->art["rail2"])) > 1) {
			
			$array = preg_split("/<li>/is",$this->art["rail2"]);
			if (is_array($array) AND count($array)) {
				
			$this->readMore .= "<div id='relatedStoriesDiv'>";
			
			array_shift($array);
			$this->readMore .= "<div id='relatedStoriesTitle'>RELATED STORIES</div>";
			
				foreach ($array as $item) {
					
					//artId
					$link = "";
					if (preg_match("/<#url ([0-9]*?)#>/is", $item, $match)) { $link = articleUrl($match[1]); } 
					
					//text
					$text = "";
					if (preg_match("/.*>(.*)<\/a>/is", $item, $match)) { $text = $match[1]; } 
					
					$this->readMore .= "<div class='relatedStoriesLinks'>";
					
					$this->readMore .= "<a href='$link'>$text</a>";
					
					$this->readMore .= "</div>\n";
					
				} //- foreach
				
				$this->readMore .= "</div>";
								
			} //- if
		} //- if
		
	} //- readMore
	
	
	
	function insertAds() {
		
		$temp = $this->art["body"];
		
		$array = preg_split("/(<p>)/is",$this->art["body"],0,PREG_SPLIT_DELIM_CAPTURE);
						
		if (is_array($array) AND count($array) > 6) {
			$string = "";
			$adCount = 0;
			$position = 0;
			
			//put in after this many paragraphs
			$insertEvery = 5;
			
			foreach ($array as $item) {
				
				$position ++;
				$string .= $item;
				if ($adCount < 3 AND $position == $insertEvery * 2) {
					$string .= $this->googleAd;
					$position = 0;
					$adCount++;
				}
							
			} //- foreach
			$this->art["body"] = $string;
			
			if ($adCount < 3) $this->art["body"] .= $this->googleAd;
			
		} //- if
		
		
	} // -insertAds
	
	

	function getArticleHTML() {
		/*
Codes used in $this->status
tp=total pages
cp=current page
*/

		global $config;
		$str="  "; //prevents null return
		$error=false;



		$this->loadArticleData();

		if (is_array($this->art)) {

			//set left rail content
			if (trim($this->art["rail1"])) $config["genVar"]["rail1"]="<div style='padding: 0px 16px 0px 16px'>".$this->art["rail1"]."</div><br><br>";
			else $config["genVar"]["rail1"]="";
			$config["genVar"]["rail2"]=$this->art["rail2"];

			//set printer friendly link
			$config["genVar"]["pf"]="/{$config["cmsIdentifier"]}/printerfriendly/art{$this->art["artId"]}.html";


			//determine if CME is on or off
			if (CME and dbDate()<$this->art["cmeExpire"] and $this->art["cmeStatus"]==2) $this->cme=true; else $this->cme=false;




			//set footnote counter and start timer
			if (!$this->status["fcn"]) $this->status["fcn"]=1;
			if (!is_numeric($this->status["start"])) $this->status["start"]=time();

			//determine if art is multipages
			if ($this->cme and !$cme->needCredits and $this->art["inline"]) $this->getPages(); else $this->page[1]=$this->art["body"];
			

			//START CONDITIONAL PROCESSING

			//check for printer friendly
			if (preg_match("|/printerfriendly/|",$_SERVER["SCRIPT_URL"],$match)) define("PRINTERFRIENDLY",true,false);
			else define("PRINTERFRIENDLY",false,false);





			//add date for all
			//$dateStamp="<div class='newsDate' style='padding: 0px'>".date("F j, Y",strtotime($this->art["releaseDate"]))."</div>";


			$dateStamp="<div class='newsDate' style='padding: 0px'>".date("F j, Y",strtotime($this->art["releaseDate"]))."</div>";



			//start pager
			$pageNav=false;
			//break into pages
			if (!PRINTERFRIENDLY and $_GET["ts"]!="fullpage") {
				$this->getPages();
				
				//add image
				/*
				if (strlen($this->art["image"])) { 
					$this->page[1] = "<div style='float: left; padding: 12px;'>
						<img src = '{$this->art["image"]}'>
					</div>" . $this->page[1];
				}
				*/
			
			
				$this->pageCount=count($this->page);
				//identify page current
				if (is_numeric($_GET["getPage"])) $this->currentPage=$_GET["getPage"]; else $this->currentPage=1;
				$this->art["body"]=$this->page[$this->currentPage];
				if ($this->pageCount==$this->currentPage AND $this->art["type"]!=4) $this->art["body"].=$dateStamp;
				//create page nav
				if ($this->pageCount>1) {
					$nav=$this->pageNav();
					//$this->art["body"]=$nav.$this->art["body"].$nav;  //top  Nav
					$this->art["body"]=$this->art["body"].$nav;  //bottom  nav
				}
			} else {
				$this->art["body"]=preg_replace("/\[\[pagebreak\]\]/i","",$this->art["body"]);
				$this->currentPage=1;
			}
			

			//add date for news -- MOVED TO ABOVE
			//if ($this->art["type"]==1) $this->art["body"]=$this->art["body"]."<div class='newsDate' style='padding: 0px'>".date("F j, Y",strtotime($this->art["releaseDate"]))."</div>";

			// -- END CONDITIONAL PROCESSING

			$this->status["tp"]=count($this->page);

			//set page
			if (is_numeric($this->status["cp"])) {
				if( $this->status["cp"]<$this->status["tp"]) $this->status["cp"]++;
				else $this->status["cp"]=$this->status["tp"];
			} else {
				$this->status["cp"]=1;
			}
			//set pagecontent



			//$this->art["body"]=$this->page[$this->status["cp"]];

			//get template
			if (PRINTERFRIENDLY) $template="{$config["siteVault"]}/templates/printerFriendly.html";
			else $template="{$config["siteVault"]}/templates{$this->art["template"]}";
			if (is_file($template) and $htmlPage=getFile($template)) {

				//pre-process inserts
				$htmlPage=processInserts($htmlPage);

				//process art editor internal tags
				while (preg_match_all("/\[\[(.*?):(.*?)\]\]/is",$this->art["body"],$tagMatch)) { //dumpVar($tagMatch);

					//replace tags
					foreach($tagMatch[0] as $key=>$tag) {
						$cmd=$tagMatch[1][$key];
						$item=trim($tagMatch[2][$key]);

						switch (true) {

						case ($cmd=="FN"):

							preg_match("/[0-9]?:([0-9]*)/",$item,$match);
							$item=$match[1];

							//if (!$this->status["fnCounter"][$this->art["footnote"][$item]["fnId"]]) $this->status["fnCounter"][$this->art["footnote"][$item]["fnId"]]=$this->status["fcn"]++;
							if (is_numeric($this->art["footnote"][$item]["fnNum"])) $number=$this->art["footnote"][$item]["fnNum"]; else $number="*";
							if (!PRINTERFRIENDLY) {$swap="<a href='javascript: void(null);' class='footnote'
						onMouseover=\"fixedtooltip('".htmlentities(addslashes($this->art["footnote"][$item]["fnText"]),ENT_QUOTES,"UTF-8",false)."', this, event, '250px')\" onMouseout=\"delayhidetip()\">(".($number).")</a>";
							} else {
								$pfFootnoteDisplay[]=$number;
								$pfFootnoteText[]=htmlentities($this->art["footnote"][$item]["fnText"],ENT_QUOTES);
								$swap="<font class='footnote'>($number)</font>";
							}
							break;

						case ($cmd=="G"):
							preg_match("/([0-9]*):(.*)/",$item,$match);
							if (!PRINTERFRIENDLY) {
								$sql="SELECT * FROM glossary WHERE gid='{$match[1]}'";
								if ( $rc=dbQuery($sql) and $row=dbFetch($rc)) {
									$txt="<b>{$row["term"]}</b>: {$row["definition"]}";
									$txt=htmlentities(addslashes(str_replace("\n","\\n",$txt)),ENT_QUOTES,"UTF-8",false);
									//$txt=htmlentities(str_replace("\n","\\n",$txt),ENT_QUOTES,"ISO-8859-1",false);
									$swap="<a href='javascript: void(null);' class='glossary'
								onMouseover=\"fixedtooltip('$txt', this, event, '400px')\" onMouseout=\"delayhidetip()\">".($match[2])."</a>";
								} else $swap=$match[2];
							} else $swap=$match[2];
							break;

						case ($cmd=="CA"):

							preg_match("/([0-9]*)/",$item,$match);
							$item=$match[1];

							//if (!$this->status["fnCounter"][$this->art["footnote"][$item]["fnId"]]) $this->status["fnCounter"][$this->art["footnote"][$item]["fnId"]]=$this->status["fcn"]++;
							if (is_numeric($this->art["callout"][$item]["caNum"])) $number=$this->art["callout"][$item]["caNum"]; else $number="*";
							$swap="<div id='calloutDiv' style='visibility:block;' >{$this->art["callout"][$item]["caText"]}</div>";
							break;

						case ($cmd=="PL"):
							$swap=$this->portalLink($item);
							break;



						}
						$swap=str_replace("$","\\$",$swap); //fix dollar sign problem
						$pattern="|".preg_quote($tag)."|is";
						//echo "$tag: $pattern : ".strlen($htmlPage)."<br>";
						$this->art["body"]=preg_replace($pattern,$swap,$this->art["body"]);
						$swap="";

					}
				}



				//get template tags
				while (preg_match_all("/<#(art.*?) (.*?)#>/is",$htmlPage,$tagMatch)) {

					//replace tags
					foreach($tagMatch[0] as $key=>$tag) {
						$cmd=$tagMatch[1][$key];
						$item=trim($tagMatch[2][$key]);

						switch (true) {

						case ($cmd=="artfield"):
							if (preg_match("/field=\"(.*)\"/iU",$item,$match))

								$field=$match[1];

							if ($field=="title") {
								if (is_numeric($this->art["conference"]) and $this->art["conference"]!=31)
									$title=$this->confNames[$this->art["conference"]].": ";
								$title.=$this->art["headline"]." - The Doctor";
								$swap=$title;
								break;
							}

							$swap=$this->art[$field];
							//process wrappers from tags
							if ($swap) {
								if (preg_match("/class=\"(.*)\"/iU",$item,$match)) $class=" class='{$match[1]}'"; else $class="";
								if (preg_match("/prefix=\"(.*)\"/iU",$item,$match)) $swap="{$match[1]}$swap";
								if (preg_match("/suffix=\"(.*)\"/iU",$item,$match)) $swap="$swap{$match[1]}";
								if (preg_match("/wrapper=\"(.*)\"/iU",$item,$match)) $swap="<{$match[1]}$class>$swap</{$match[1]}>";
								if (preg_match("/html=\"omit\"/iU",$item,$match)) $swap=preg_replace("/[\n\r]/","",strip_tags($swap));
							}


							break;

						case ($item=="meta"):

							$url="{$config["url"]}".articleUrl($this->artId);
							if (is_array($this->art["subtopics"])) $keywords=implode(",",$this->confNames);
							if ($this->art["keywords"]) $keywords.=",".$this->art["keywords"];
							if ($keywords) $swap="<META name=\"keywords\" content=\"$keywords\">\n";

							if ($this->art["summary"]) $description=$this->art["summary"];
							elseif ($this->art["tipLong"]) $description=$this->art["tipLong"];
							elseif ($this->art["tipShort"]) $description=$this->art["tipShort"];
							else $description=$this->art["headline"];
							
							if (strlen($this->art["image"])) {
								$ogImage = "<meta property='og:image' content='http://www.thedoctorwillseeyounow.com/img_{$this->artId}.jpg'/>";
							} else {
								$ogImage = "<meta property='og:image' content='http://www.thedoctorwillseeyounow.com/images/FB_no_image.jpg'/>";
							}

							$swap.="<META name=\"description\" content=\"$description\">
$ogImage
<link rel='original-source' href='$url' >
<link rel='syndication-source' href='$url' >
<link rel='canonical' href='$url' >\n";


							break;

						case ($item=="headline"):

							if ($this->art["type"]==1) $class="News";
							elseif ($this->art["type"]==2) $class="Feature";
							elseif ($this->art["type"]==4) $class="Portal";
							else $class="Books";
							// if ($this->currentPage==1 OR $this->art["type"]==3) $swap="<div class='headline{$class}'> // turns off 2nd page for books
							if ($this->currentPage==1) $swap="<h1 class='headline{$class}'>
						<#artfield field=\"headline\"#>
						</h1>
						<div class='byline{$class}'>
						<#artfield field=\"byline\"#>
						</div>";
							else $swap="<br><div class='byline{$class}'>
						<#artfield field=\"byline\"#>
						</div>
						<h1 class='headline{$class}2'>
						<#artfield field=\"headline\"#>
						</h1>
						";

							if ($this->art["type"]==1) $swap.="<div style='border-bottom:  4px solid #377991; margin-bottom: 10px; height: 6px;'>&nbsp;</div>";
							else $swap.="<div style='border-bottom:  4px solid #f10065; margin-bottom: 10px; height: 6px;'>&nbsp;</div>";

							//big kludge for portals
							if ($this->art["type"]==4) $swap="<h1 class='headline{$class}'>
						<#artfield field=\"headline\"#>
						</h1>";

							break;
							
							
						case ($item=="portalRail"):
						if ($this->portalLinks[$this->art["conference"]]["rail"]) $swap=$this->portalLinks[$this->art["conference"]]["rail"];
						break;	
						
						case ($item=="portalBanner"):
						if ($this->portalLinks[$this->art["conference"]]["banner"]) $swap=$this->portalLinks[$this->art["conference"]]["banner"];
						break;	
						
						case ($item=="leftRailAd"):
						if ($this->leftRailAd[$this->art["conference"]]) $swap=$this->leftRailAd[$this->art["conference"]];
						break;	

						}
						$swap=str_replace("$","\\$",$swap); //fix dollar sign problem
						$pattern="|".preg_quote($tag)."|is";
						//echo "$tag: $pattern : ".strlen($htmlPage)."<br>";
						$htmlPage=preg_replace($pattern,$swap,$htmlPage);
						$swap="";

					}
				}


				$str=$htmlPage;

				//print footnotes for printer friendly
				if (PRINTERFRIENDLY and is_array($pfFootnoteDisplay)) {
					asort($pfFootnoteDisplay);
					$dupCheck=array();
					$str.="<hr><div class='headlineFeature'>Footnotes</div><br><table width='680'>";
					foreach ($pfFootnoteDisplay as $key=>$value) {
						if (!in_array($pfFootnoteDisplay[$key],$dupCheck)) {
							$str.="<tr><td>{$pfFootnoteDisplay[$key]}</td><td>{$pfFootnoteText[$key]}</td></tr>\n";
							$dupCheck[]=$pfFootnoteDisplay[$key];
						}
					}
					$str.="</table>";

				}

			} else {logit(INFO,"Could not open template $template in getArticleHTML in ".__FILE__." on line: ".__LINE__); $error=true;}


		} else  {
			if($_SERVER["HTTP_REFERER"]) logit(WARN,"did not find art array in getArticleHTML REFER:  {$_SERVER["HTTP_REFERER"]} in ".__FILE__." on line: ".__LINE__);
			else logit(INFO,"did not find art array in getArticleHTML REFER:  {$_SERVER["HTTP_REFERER"]} in ".__FILE__." on line: ".__LINE__);
			$error=true;
		}

		//dumpVar($this->page);

		//if ($error) return getFile($config["errorpage"]);
		if ($error) return false;

		return $str;
	} //ef article


	function loadArticleData() {
		global $config;

		if ($this->preview)  { //get from db
			dbConnect();
			$artData=new artEditorLib();
			$artData->preview=true;
			$artData->preview=$this->preview;
			$artData->getArtFromDB($this->artId);
			$this->art=$artData->getArtString();
		} else {
			$file=$config["articleVault"].getHash($this->artId)."/{$this->artId}.dat";
			if ($page=getFile($file)) {
				$this->art=unserialize($page);
				//set stats
				$statLog["aid"]=$this->art["artId"];
				$statLog["conf"]=$this->art["conference"];
			} else {logit(REPORT,"Could not open article file $file (Refer: {$_SERVER["HTTP_REFERER"]})"); $error=true;}
		}
		
		//get images
		if (is_numeric($this->artId)) {
			$sql = "SELECT artId FROM articleImages WHERE artId = {$this->artId} ";
			if ($rc = dbQuery($sql)) {
				if ($rowImg = dbFetch($rc)) {
					$this->art["image"] = "/img_{$this->art["artId"]}.jpg";
				} else {
					$this->art["image"] = "";
				}
			} else {
				logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
			}
			
			//get Image, internal
			$sql = "SELECT artId FROM articleInternalImages WHERE artId = {$this->artId} "; 
			if ($rc = dbQuery($sql)) {
				if ($rowImg = dbFetch($rc)) {
					$this->art["imageInternal"] = "/imgNews_{$this->art["artId"]}.jpg";
				} else {
					$this->art["imageInternal"] = $this->art["image"]; //if no internal use hp
				}
			} else {
				logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);
			}
		
		} else {
			$this->art["imageInternal"] = "";
			$this->art["image"] = "";
		}
		


		//get subtopic names
/*
		if (is_array($this->art["subtopics"]))
			$sql="SELECT confId,confName FROM confNames WHERE confId IN (".implode(",",$this->art["subtopics"]).",{$this->art["conference"]}) ";
		else $sql="SELECT confId,confName FROM confNames WHERE confId ='{$this->art["conference"]}' ";
*/
		
		//get all confs because the page now needs all of them
		$sql="SELECT confId,confName FROM confNames";


		if ($rc=dbQuery($sql)) {
			while ($row=dbFetch($rc)) $this->confNames[$row["confId"]]=$row["confName"];
		} else logit(WARN," DB Error:  $sql in ".__FILE__." on line: ".__LINE__);


		//dumpVar($this->art);
		if ($this->preview) $this->art["headline"].=" (preview)";

	} //ef  loadArticleData

	//split content into pages
	function getPages() {

		global $config;

		$text=$this->art["body"]."\n\n"; // fixes a problem with no text after the tag
		$pages=preg_split("/(\[\[pagebreak\]\])/i",$text);
		$i=0; $c=1;
		while ($pages[$i]) {
			//$this->page[$c++]=$pages[$i].$pages[$i+1];

			$this->page[$c++]=$pages[$i];
			$i+=1;
		}


	} // getPages

	function pageNav() {

		//make nav

		//prev
		if ($this->currentPage > 1) $nav[]="&nbsp;<a href='<#self #>?getPage=".($this->currentPage-1)."' class='pagebreak'><font class='arrow'>&lt;</font> Prev</a>&nbsp;";
		//pages
		for($i=1;$i<=$this->pageCount;$i++) {
			if ($this->currentPage==$i) $nav[]="<font class='pagebreakOff'>&nbsp;$i&nbsp;</font>";
			else $nav[]="&nbsp;<a href='<#self #>?getPage=$i' class='pagebreak'>$i</a>&nbsp;";
		}
		//next
		if ($this->currentPage < $this->pageCount) $nav[]="&nbsp;<a href='<#self #>?getPage=".($this->currentPage+1)."' class='pagebreak'>Next <font class='arrow'>&gt;</font></a>&nbsp;";


		$str.="<div align='right' class='pagebreak' style='padding-top: 6px'>";
		$str.=implode("|",$nav);
		$str.="</div>";
		return $str;
	} //ef pageNav

	//----------------------------------------
	function portalLink($id) {


		//fb($url);
		//$ids=explode(",",$id);
		//foreach($id as $key->$value) $id[$key]=trim($value);
		$sql="SELECT * FROM articles WHERE artId in ($id) ";
		if ($rc=dbQuery($sql)) {
			while ($row=dbFetch($rc)) {
				$url=articleUrl($row["artId"]);
				if ($url) {
					if ($row["tipLong"]) $summary=$row["tipLong"];
					elseif ($row["tipShort"]) $summary=$row["tipShort"];
					elseif ($row["summary"]) $summary=$row["summary"];

					$str.="<p><a class='portalLink' href='$url'>{$row["headline"]}</a><br>
						<span class='portalText'>$summary</span></p>";
				}
			}
		}


		return $str;
	} // ef
	
	
	//----------------------------------------
	function loadPortalLinks() {
	
	//stress
	$this->portalLinks[60]["rail"]="<a href='/content/stress/art3242.html'>
	<img src='/images/portal/links/stressRail.jpg' title='' border=0 alt=''></a>";
	$this->portalLinks[60]["banner"]="<a href='/content/stress/art3242.html'>
	<img src='/images/portal/links/stressBanner.jpg' title='' border=0 alt=''></a>";
	
	$this->leftRailAd[38]="<br><a href='http://placebojournal.blogspot.com/' target='_blank'><img src='/images/ads/AuthMedlogofinal.png' title='' border=0 alt=''></a>";
	
	return true;
	} // ef loadPortalLinks


} //ec


?>