/*
 * viewer.js
 *
 * Author: dave@bit155.com
 *
 * ---------------------------------------------------------------------------
 * 
 * Copyright (c) 2010, David Heaton
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 
 *     * Redistributions of source code must retain the above copyright notice,
 *       this list of conditions and the following disclaimer.
 *  
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *  
 *      * Neither the name of bit155 nor the names of its contributors
 *        may be used to endorse or promote products derived from this software
 *        without specific prior written permission.
 *  
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Sort of a controller class for the viewer and work-in-progress towards a
 * real architecture. Mostly so I can test some of the logic in it.
 */
var Viewer = function() {
	/**
	 * flag: we get the url from the remote server or from the 'nextpage' tag.
	 * well, this flage is changed. 
	 * 0 : nextpage,
	 * 1 : et next url from remote sever.
	 * 2 : consecutive get url from next page, with a certain number passed by server for this next page. and When it's done, it will go to detail mode, so get next url from server each time.
	 * 
	 */
	this.remote=0;

	//cause it begin with urlIndex++, and the first one is 0.
	this.urlIndex=-1;
	this.departement="";
	var remoteServer="http://localhost.bannieres";
	this.remoteServer=remoteServer;
	this.remoteReceiver=remoteServer+"/data/boncoin/receive";

	this.remoteListReceiver=remoteServer+"/data/boncoin/receive";
	this.remoteDetailReceiver=remoteServer+"/data/boncoin/receive/detail";
	//must finished with "/" cause the url need a id parameter,
	this.remoteDelete=remoteServer+"/data/boncoin/delete/";
	this.remoteGetUrl=remoteServer+"/data/boncoin/get/url/";
	this.remoteServerScript="";
	this.remoteServerScriptUrl="";
	this.nextpage="";
	this.thumbImage={};
	this.sendAgain=0;
	this.remoteInitializeUrl="";
	
	/*
	 * normally, this is an array, each element contain an option and a series of urls to scrape.  
	 */
	this.remoteParmeters="";
	// this is to save the index of the remoteParameters 
	this.currentParameterIndex=0;
	this.interval="";
	this.processing=false;
	this.retryDetail=false;
	this.retryList=false;
	this.retryPage=false;
	
};


/**
 * Contains the scrape data.
 */
Viewer.prototype.data = bit155.attr({
  callback: function(v) { 
    this.reload();
  }
});

/**
 * Contains the id of the tab this is connected to.
 */
Viewer.prototype.tabId = bit155.attr({
  filter: function(v) { 
    return parseInt(v, 10);
  }
});

/**
 * contains the urls to scrape from a remote server.
 */
Viewer.prototype.remoteUrls=bit155.attr();


Viewer.prototype.setServer=function(){
	var remoteServer=$("#connect_server").val();
	var controller=$('#server_controller').val();
	this.remote=parseInt($("input[name='remote_checkbox']:checked").val());
	this.thumbImage.pattern  = $('#thumb_to_image_pattern').val();
	this.thumbImage.replace = $('#thumb_to_image_replace').val();
	this.remoteReceiver=remoteServer+"/data/"+controller+"/receive";
	this.remoteListReceiver=remoteServer+"/data/"+controller+"/receive";
	this.remoteDetailReceiver=remoteServer+"/data/"+controller+"/receive/detail";
	//must finished with "/" cause the url need a id parameter,
	this.remoteDelete=remoteServer+"/data/"+controller+"/delete/";
	this.remoteGetUrl=remoteServer+"/data/"+controller+"/get/url/";
	this.remoteServer=remoteServer;
	this.remoteServerScriptUrl=remoteServer+"/"+$("#server_script").val();
	this.remoteInitializeUrl=remoteServer+"/fr/data/present/get_scrape_urls";
};

/**
 * Reloads data of elements dependent on bit155.scraper.presets data.
 */
Viewer.prototype.reloadPresets = function() {
  var list;
  var self = this;
  var presets = bit155.scraper.presets();
  
  // update list
  list = $('#presets-list');
  list.empty();
  $.each(presets || [], function(i, preset) {
    var handle = $('<img class="preset-handle" src="img/application-form.png">');
    var load = $('<a class="preset-load" href="javascript:;" title="Load this preset.">').text(preset.name).click(function() {
      self.options(preset.options);
      $('#presets-form-name').val(preset.name);
      $('#presets').dialog('close');
      //self.scrape();
      return false;
    });
    var remove = $('<a class="preset-remove" href="javascript:;" title="Remove this preset.">').append($('<img src="img/bullet_delete.png" title="Remove preset.">')).click(function() {
      if (confirm('Are you sure you want to remove the preset, "' + preset.name + '"?')) {
        presets.splice(i,1);
        bit155.scraper.presets(presets);
        self.reloadPresets();
      }
    });
    list.append($('<li>').attr('id', 'preset-' + i).append(handle).append(remove).append(load));
  });
};

/**
 * Returns the current options (as encapsulated by the form) or sets new 
 * options.
 *
 * @param opts {object} (optional) new options to set
 */
Viewer.prototype.options = function(opts) {
  if (opts) {
    var self = this;
    
    // selector and language
    $('#options-selector').val(opts.selector).change();
    $('#options-language').val(opts.language).change();
    
    // attributes
    if ($.isArray(opts.attributes) && opts.attributes.length > 0) {
      $('#options-attributes tbody').empty();
      $.each(opts.attributes, function() {
        self.addAttribute(this.xpath, this.name);
      });
    } else {
      self.addAttribute('.', 'Text');
    }
    
    // filters
    $('#options-filters').find('input:checkbox').attr('checked', false);
    if ($.isArray(opts.filters) && opts.filters.length > 0) {
      $.each(opts.filters, function(index, filter) {
        if (filter === 'empty') {
          $('#options-filters-empty').attr('checked', true);
        }
      });
    }
    
	if (opts.hasOwnProperty('nextpage')){
		$('#jquery-nextpage').val(opts.nextpage);
		this.nextpage=opts.nextpage;
	}
	if (opts.hasOwnProperty('departement'))
		$('#departement_name').val(opts.departement);
	if (opts.hasOwnProperty('server'))
		$('#connect_server').val(opts.server);
	if (opts.hasOwnProperty('remotescript'))
		$('#server_script').val(opts.remotescript);
	if (opts.hasOwnProperty('servercontroller'))
		$('#server_controller').val(opts.servercontroller);
	if (opts.hasOwnProperty('thumbToImagePattern'))
		$('#thumb_to_image_pattern').val(opts.thumbToImagePattern);
	if (opts.hasOwnProperty('thumbToImageReplace'))
		$('#thumb_to_image_replace').val(opts.thumbToImageReplace);
    return this;
  } else {
    return $('#options').serializeParams();
  }
};

/**
 * Adds an attribute to the options.
 *
 * @param xpath {string}
 * @param name {string}
 * @param context {element} another row to add attribute beneath, or null if
 *        it should be appended to the end of the table
 */
Viewer.prototype.addAttribute = function(xpath, name, context) {
  var self = this;
  var xpathInput = $('<input>').attr('type', 'text').attr('name', 'attributes[][xpath]').attr('placeholder', 'XPath').val(xpath || '');
  var nameInput = $('<input>').attr('type', 'text').attr('name', 'attributes[][name]').attr('placeholder', 'Name (optional)').val(name || '');
  var row = $('<tr>');
  
  var addRow = function() {
    self.addAttribute('', '', row);
    return false;
  };
  var deleteRow = function() {
    var parent = row.parent();
    if (parent.children().length > 1) {
      row.fadeOut('fast', function() { row.remove(); });
    } else {
      xpathInput.val('');
      nameInput.val('');
    }
    return false;
  };

  // create row
  row.append($('<td nowrap>').addClass('dragHandle').text(' '));
  row.append($('<td>').append(xpathInput));
  row.append($('<td>').append(nameInput));
  row.append($('<td nowrap>')
    .append($('<a>').attr('href', 'javascript:;').click(deleteRow).html('<img src="img/bullet_delete.png">'))
    .append($('<a>').attr('href', 'javascript:;').click(addRow).html('<img src="img/bullet_add.png">'))
  );
  row.hide();
  
  // insert row
  var after = function() {
    $('#options-attributes').tableDnD({
      dragHandle: 'dragHandle'
    });
  };
  
  if (context) {
    context.after(row.fadeIn('fast', after));
  } else {
    $('#options-attributes tbody').append(row.fadeIn('fast', after));
  }
};

/**
 * Displays an error message.
 *
 * @param {Object} an error object containing a "message" property, or a
 *        string, to display
 */
Viewer.prototype.error = function(error) {
  $('<div class="error">').text(error.message ? error.message : '' + error).dialog({
    title: 'Error',
    modal: true,
    buttons: [{
      text: "Close",
      click: function() { $(this).dialog("close"); }
    }]
  });
};

/**
 * Reloads the view based on current data.
 */
Viewer.prototype.reload = function() {
  var self = this;
  var data = this.data();
  var results = data.result || [];
  var attributes = data.attributes || [];

  // headers
  var thead = $('<thead>');
  var headerRow = $('<tr>').appendTo(thead).append('<th>&nbsp;</th>').append('<th>&nbsp;</th>');
  $.each(attributes, function() {
    headerRow.append($('<th>').text(this.name));
  });

  // body
  var tbody = $('<tbody>');
  $.each(results, function(i,result) {
    var row = $('<tr>').appendTo(tbody);
    var tools = $('<td class="tools" nowrap>').appendTo(row);

    // tools
    tools.append($('<img src="img/highlighter-small.png" title="Highlight in document.">').click(function() {
      chrome.tabs.sendRequest(self.tabId(), { command: 'scraperHighlight', payload: { xpath: result.xpath } });
    }));
    
    // index
    row.append($('<td class="index" nowrap>').text(i + 1));
    
    // attributes
    $.each(attributes, function(j,attribute) {
      var value = result.values[j];
      var cell = $('<td>').text(value);
      
      row.append(cell);
    });
  });

  var url = /^https?:\/\/[^\s]+$/i;
  var table = $('<table>').append(thead).append(tbody).appendTo($('#results-table').empty());
  table.dataTable({
    'bInfo': false,
    'bFilter': false,
    'bStateSave': true,
    'bPaginate': false,
    'fnRowCallback': function(row, values, displayIndex, displayIndexFull) {
      $('td', row).each(function() {
        var text = $(this).text();
        if (url.test(text)) {
          $(this).empty().append($('<a>').attr('href', text).attr('target', '_blank').text(text));
        }
      });
      
      return row;
    },
    'aoColumnDefs': [
      { 
        aTargets: [0],
        bSortable: false
      }
    ]
  });
};

/**
 * Scrapes the host document using the current options.
 */
Viewer.prototype.scrape = function() {
  var self = this;
  var options = self.options();

  // clean out empty attributes and set names for empties
  options.attributes = $.map(options.attributes.filter(function(a) { return a.xpath !== ''; }), function(a) {
    if (!a.name) {
      a.name = a.xpath;
    }
    return a;
  });
  
  var request = { 
    command: 'scraperScrapeTab', 
    payload: {
      tab: self.tabId(),
      options: options,
      script: self.remoteServerScript
    }
  };

  chrome.extension.sendRequest(request,function(response){
	  if (response.error) {
	        self.error(response.error);
	        if (self.remote){
	        	//self.askForDelete(); do not need to delete it, we will never try it again.
	        	
	        	//go for next one.
	        	self.goNextUrl(); 
	        }
	        return false;
	    }else{
	    	self.data(response);
	    	self.sendData();
	    }
  });
};


Viewer.prototype.askForDelete=function(){
	var self = this;
	if (self.urlIndex<0)
		return false;
	
	if (self.urlIndex in self.remoteUrls())
		var currentUrl=self.remoteUrls()[self.urlIndex];
	else 
		return false;
	chrome.tabs.get(self.tabId(), function(tab) {
	    var request = {};
	    var title = tab.title;   
	    // send spreadsheet request to background.js
	    request.command = 'scraperAskForDelete';
	    request.payload = {
	      title: title,
	      url: self.remoteDelete+currentUrl.id
	    };
	    chrome.extension.sendRequest(request, function(response) {
		      if (response.error) {
		        self.error(response.error);
		        return;
		      }
			// go to next and abandon this one.
		      self.goNextUrl();
	    });
	});
};


/**
 * send current data to server.
 */
Viewer.prototype.sendData = function() {
  var self = this;
  var data = [];
  var hasImage=false;
  var attributes=this.data().attributes;

  $.each(this.data().result || [], function(index, result) {
	var newResult=[];
	if (1==self.remote){
		var currentUrl=self.remoteUrls()[self.urlIndex];
		newResult.push(currentUrl.id);
	}
	
	//clean the space before and after, replace all inter space as single space.
	$.each(result.values, function(index,value){
		value=value.replace(/\A\s+(.*)\s+\Z/g,'$1');
		value=value.replace(/\s+/g,' ');
		tmpObject={};
		tmpObject.string=value;
		tmpObject.type="string";
		if (attributes[index].name=="image"){
			if (value.match(/.*url\(\'.*\'\).*/gi) || value.match(/^https?:\/\/[^\s]+$/i)){
				hasImage=true;
				tmpObject.type="image";
			}
		}else if( attributes[index].name=="thumb"){
			if (value.match(/.*url\(\'.*\'\).*/gi) || value.match(/^https?:\/\/[^\s]+$/i)){
				hasImage=true;
				tmpObject.type="thumb";
			}
		}else if( attributes[index].name.indexOf("iframe")>0){
			tmpObject.type="iframe";
		}
		newResult.push(tmpObject);
	});
    data.push(newResult);
  });
  if (data.length<1 && 1==this.remote){
	  //set to zero for sure.
	  this.sendAgain=0;
	  self.goNextUrl();
	  return false;
  }
  else if (data.length<1 && !this.sendAgain){
	  this.sendAgain=1;
	  self.goNextUrl();
	  return false;
  }else if (this.sendAgain && data.length>1){
	  this.sendAgain=0;
	  self.goNextUrl();
	  return false;
  }else if (this.sendAgain && data.length<1){
	  //two times get nothing.
	  return false;
  }
  if (data.length>0 && !this.sendAgain){
	  data=JSON.stringify(data);
	  // find the host tab so we can get its title
	  chrome.tabs.get(self.tabId(), function(tab) {
	    var request = {};
	    var title = tab.title;   
	    // send spreadsheet request to background.js
	    request.command = 'scraperSendData';
	    request.payload = {
	      title: title,
	      data: data,
	      url: self.remoteReceiver,
	      hasImage: hasImage,
	      thumbImage: self.thumbImage,
	      tab:self.tabId()
	    };
	    chrome.extension.sendRequest(request, function(response) {
		      if (response.error) {
		        self.error(response.error);
		        return;
		      }
			// when we use remote urls, we need to refresh the page the next url.
		      self.goNextUrl();
	    });
	  });
  }else if (1==this.remote){
	  //set to zero for sure.
	  this.sendAgain=0;
	  self.goNextUrl();
  }
  else if (data.length<1 && !this.sendAgain){
	  this.sendAgain=1;
	  self.goNextUrl();
  }else if (this.sendAgain && data.length>1){
	  this.sendAgain=0;
  }
  return false;
};

/**
 * Get urls need to be scraped frome a remote server. cause this is only used for le boncoin, so the departement is a key for seperate the work.
 * @param url
 * @param departement
 */
Viewer.prototype.getRemoteUrl=function(departement){
	var self = this;
	this.urlIndex=-1;
	departement=departement.trim();
	this.departement=departement;
	url=this.remoteGetUrl+encodeURIComponent(departement);
    var dialog = $('<div>').addClass('progress');
    // tell user to wait
    dialog.append($('<div style="margin: 30px; text-align: center"><img src="img/progress.gif"></div>'));
    dialog.dialog({
      closeOnEscape: true,
      buttons: [],
      resizable: false,
      title: 'Retrieving Urls from remote sever...',
      modal: true
    });
	chrome.tabs.get(self.tabId(), function(tab) {
	    var request = {};
	    // send getChildUrl request to background.js
	    request.command = 'getChildUrl';
	    request.payload = {
	      url: url,
	    };
	    chrome.extension.sendRequest(request, function(response) {
	      dialog.dialog('close');
	      if (response.error) {
	        self.error(response.error);
	        //wait 30 min and restart again.
	        self.retryDetail= setTimeout(function() {
	        	if (self.processing)
			     self.getRemoteUrl(departement);				
		  	}, 30*60000);
	      }else {
		      self.remoteUrls(response);
		      //find the first correct url.
			  chrome.tabs.create({'selected' : false},function(tab){
		    	  chrome.tabs.remove(self.tabId());
		    	  self.tabId(tab.id);
		    	  self.goNextUrl();
		      });
	      }
	  });
  });
};

Viewer.prototype.getRemoteScript=function(){
	var self=this;
	if (self.remoteServerScriptUrl!=""){		
		chrome.tabs.get(self.tabId(), function(tab) {
		    var request = {};
		    // send getChildUrl request to background.js
		    request.command = 'getServerScript';
		    request.payload = {
		      url: self.remoteServerScriptUrl,
		    };
		    chrome.extension.sendRequest(request, function(response) {
		      if (response.error) {
		        self.error(response.error);
		      }
		      self.remoteServerScript=response;
		    });
		});
	}else{
		self.remoteServerScript="";
	}
};

Viewer.prototype.getNextUrl=function(){
	this.urlIndex++;
	var urls=this.remoteUrls();
	var url=null;
	// finish meansfinish. stop the proceddure.
	if (urls.length==0)
		return "finish";
	if (this.urlIndex<urls.length){
		url=urls[this.urlIndex].url;
		var pattern = /^https?:\/\/[^\s]+$/i;
		if (!pattern.test(url))
			return null;
	}else
		return false;
	return url;
};

Viewer.prototype.goNextUrl=function(){
	if (1==this.remote){
		var url=null;
		while (url==null){
			url=this.getNextUrl();
		}
		//false means we reach the end of list.
		if (url==false){
			this.getRemoteUrl(this.departement);
			return;
		}else if ( !url.localeCompare('finish')){
			//0 means match.
    		return;
		}
    	 
		chrome.tabs.update(this.tabId(),{url:url});
	}else if (2==this.remote){
		var element= this.remoteParmeters[this.currentParameterIndex];
		
		/**
		 * check if the element is really a good data.
		 * the second member of element urls  is the maximum pages to scrape, if the currentPage by pass it , we go to next url 
		 * if we reach the end of the urls , we go to another elemenent.
		 * if their is no element anymore, we do nothing. 
		 */
		if (typeof element!="undefined" && typeof element.currentUrlIndex!="undefined" && Object.prototype.toString.call( element.urls ) === '[object Array]' ){
			if (element.currentPage<element.urls[element.currentUrlIndex][1] &&  this.nextpage!=""){
				element.currentPage++;
				this.goNextPage();
			}
			else if (typeof element.urls[element.currentUrlIndex+1] != "undefined"){
				//reset the pageIndex. to let new url begin with with 0 and arrive his limit.
				element.currentUrlIndex++;
				element.pageIndex=0;
				chrome.tabs.update(this.tabId(),{url:element.urls[element.currentUrlIndex][0]});
			}else{
				this.goNextRemoteParameter();
			}
		}
	}
	else if (this.nextpage!=""){
		this.goNextPage();
	}
};



Viewer.prototype.goNextPage=function(){
	var self=this;
	chrome.tabs.get(self.tabId(), function(tab) {
	    var request = {};
	    // send spreadsheet request to background.js
	    request.command = 'scraperNextpage';
	    request.payload = {
	      tab: self.tabId(),
	      nextpage: self.nextpage,
	      sendAgain:self.sendAgain
	    };
	    chrome.extension.sendRequest(request, function(response) {
	    	
	    });
	});
};

Viewer.prototype.goNextRemoteParameter=function(initFlag){
	var self=this;
	// if undefined, means we go next, or we just initilize.
	if (typeof initFlag == "undefined")
		this.currentParameterIndex++;
	var element=this.remoteParmeters[this.currentParameterIndex];				
	if (typeof element!= "undefined" && typeof element.urls != "undefined" && typeof element.options!= "undefined" && typeof element.currentUrlIndex != "undefined"){
		this.options(element.options);
		this.setServer();
		chrome.tabs.update(this.tabId(),{url:element.urls[element.currentUrlIndex][0]});		
	}else{
		//no parameter anymore, wait 30 min and restart again.
		this.retryList=	setTimeout(function() {
		      chrome.tabs.remove(self.tabId());
		      chrome.tabs.create({'selected' : false},function(tab){
		    	  self.tabId(tab.id);
		    	  self.remoteInitialize();
		      });
			
	  	}, 30*60000);
	}
};


/**
 * Creates a Google spreadsheet with the current data.
 */
Viewer.prototype.spreadsheet = function() {
  var self = this;
  var data = [];
  var csv;
  
  // gather up data and convert to csv
  data.push($.map(this.data().attributes || [], function(a) { return a.name || a.xpath; }));
  $.each(this.data().result || [], function(index, result) {
    data.push(result.values);
  });
  csv = bit155.csv.csv(data);

  // find the host tab so we can get its title
  chrome.tabs.get(self.tabId(), function(tab) {
    var request = {};
    var dialog = $('<div>').addClass('progress');
    var title = tab.title;
    
    // tell user to wait
    dialog.append($('<div style="margin: 30px; text-align: center"><img src="img/progress.gif"></div>'));
    dialog.dialog({
      closeOnEscape: true,
      buttons: [],
      resizable: false,
      title: 'Exporting to Google Docs...',
      modal: true
    });
    
    // send spreadsheet request to background.js
    request.command = 'scraperSpreadsheet';
    request.payload = {
      title: title,
      csv: csv
    };
    chrome.extension.sendRequest(request, function(response) {
      dialog.dialog('close');
      if (response.error) {
        self.error(response.error);
      }
    });
  });
};
// this interval is one hour, make it run every hour.
Viewer.prototype.remoteInitialize=function(){
	var self = this;

	chrome.tabs.get(self.tabId(), function(tab) {
	    var request = {};
	    // send spreadsheet request to background.js
	    request.command = 'scraperRemoteInitialize';
	    request.payload = {
	      tab: self.tabId(),
	      url: self.remoteInitializeUrl,	   
	    };
	    chrome.extension.sendRequest(request, function(response) {
	    	self.remoteParmeters=JSON.parse(response);
	    	self.currentParameterIndex=0;
	    	self.goNextRemoteParameter(true);
	    });
	});

};
// from http://safalra.com/web-design/javascript/parsing-query-strings/
function parseQueryString(_1){var _2={};if(_1==undefined){_1=location.search?location.search:"";}if(_1.charAt(0)=="?"){_1=_1.substring(1);}_1=_1.replace(/\+/g," ");var _3=_1.split(/[&;]/g);for(var i=0;i<_3.length;i++){var _5=_3[i].split("=");var _6=decodeURIComponent(_5[0]);var _7=decodeURIComponent(_5[1]);if(!_2[_6]){_2[_6]=[];}_2[_6].push((_5.length==1)?"":_7);}return _2;}

$(function() {
	
	chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
		  var command = request.command;
		  var percentage = request.percentage;
		  
		  if (command === 'uploading' && request.tab==viewer.tabId()) {
			  $("#progressbar" ).progressbar( "option", "value", percentage );
		  }
	});
	
	
  var response = parseQueryString(),
      responseOptions = response.options && response.options.length > 0 ? JSON.parse(response.options[0]) : {},
      savedOptions = JSON.parse(localStorage['viewer.options'] || JSON.stringify({
          selector: 'a',
          language: 'jquery',
          attributes: [
            { xpath: '.', name: 'Link' },
            { xpath: '@href', name: 'URL' }
          ],
          filters: [
            'empty'
          ]
        })),
      options = $.extend({}, savedOptions, responseOptions);

  // create viewer
  var viewer = new Viewer();
  viewer.tabId(response.tab && response.tab.length > 0 ? parseInt(response.tab[0], 10) : -1);
  viewer.options(options);
  /*
  chrome.tabs.create({},function(tab){
	  	viewer.tabId(tab.id);
	    });
	    */
  // layout view
  var layout = $('body').layout({ 
    west: {
      size: 340,
      minSize: 250,
      closable: true,
      resizable: true,
      slidable: true
    }
  });
  
  if (localStorage['viewer.west.size']) {
    layout.sizePane('west', localStorage['viewer.west.size']);
  }
  
  if (localStorage['viewer.west.closed'] == 'true') {
    layout.close('west');
  }
  $('#bottom').accordion({
    collapsible: true,
    active: false,
    autoHeight: false,
    animated: false
  });
  $('#center').tabs();
  // bind buttons to viewer
  $( "#progressbar" ).progressbar({value: 0 });
  
  chrome.tabs.onUpdated.addListener(function( tabId , info ) {
	  // page is refreshed,, we need to clear the retry timer to avoid the reload action for which page is already loaded.
	  if (viewer.retryPage)
		  clearTimeout(viewer.retryPage);
	  if ( info.status == "complete" && viewer.processing && tabId == viewer.tabId()){
	    	// send data and rescrape the page refreshed when the "nextpage" tag exist.
			setTimeout(function() {
				$("#progressbar" ).progressbar( "option", "value", 0);
	  			viewer.scrape();
	  			viewer.retryPage=setTimeout(function() {
	  				var code = 'window.location.reload();';
	  				chrome.tabs.executeScript(tabId, {code: code});
	  			},5*600000);
		  	}, 1000);
	  }
	});
  
  $("#export-google").click(function() { 
	  viewer.spreadsheet(); 
	  return false; 
	});
  
  // close the window when the tab is closed
  chrome.tabs.onRemoved.addListener(function(tabId) {
    if (tabId == viewer.tabId()) {
      window.close();
    }
  });
  
  // update title whenever tab changes
  var updateMeta = function(tab) {
	
    document.title = "Scraper - " + tab.title;
    if (1==viewer.remote){
    	if ((viewer.urlIndex+1)<=viewer.remoteUrls().length){
    		document.title="Scraper: "+(viewer.urlIndex+1)+"/"+viewer.remoteUrls().length;
    	}
    }
    $('#options-meta-page').empty().append($('<a>').attr('href', tab.url).text(tab.title).click(function() {
      chrome.tabs.update(viewer.tabId(), { selected: true });
      return false;
    }));
    
    // resize content since the header height may change and this buggers up
    // the footer
    layout.resizeContent('west');
  };
  chrome.tabs.get(viewer.tabId(), updateMeta);
  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (tabId === viewer.tabId()) {
      updateMeta(tab);
    }
  });
  
  
  $('#scarper_button').click(function(){
	  if (viewer.retryDetail){
		  clearTimeout(viewer.retryDetail);
	  }
	  if (viewer.retryList){
		  clearTimeout(viewer.retryList);
	  }
	  if (viewer.processing == true){
		  $('input[name="remote_checkbox"]').removeAttr("disabled"); 
		  $(this).html('Start scraping');
		  viewer.processing=false;
		  return false;
		  clearInterval(viewer.interval);
	  }
	  $('input[name="remote_checkbox"]').attr('disabled', 'disabled');
	  viewer.setServer();
	  $(this).html('Stop scraping');
	  viewer.processing=true;
	  switch (viewer.remote){
	  	case 0:
	  		 viewer.remoteReceiver=viewer.remoteListReceiver;
			  //scrape will refresh the page.
			  viewer.scrape();
	  		break;
	  	case 1:
	  		viewer.remoteReceiver=viewer.remoteDetailReceiver;		 
			  var departement=$("#departement_name").val();
			  if (departement.length<4)
				  departement='france';	
			  viewer.getRemoteScript();
			  viewer.getRemoteUrl(departement);
	  		break;
	  	case 2: 
	  		viewer.remoteInitialize();
	  		break;
	  	default:
	  		
	  }
	  
	  return false; 
	  
  });
  
  // help dialog
  $('#about').dialog({
    autoOpen: false,
    draggable: false,
    resizable: false,
    title: 'About',
    width: 400,
    show: 'fade',
    hide: 'fade',
    modal: true,
    closeText: 'Close',
    buttons: [{
      text: "Close",
      click: function() { $(this).dialog("close"); }
    }]
  });
  $('#about-link').click(function() {
    $('#about').dialog('open');
    return false;
  });
  
  // presets
  $('#presets').dialog({
    autoOpen: false,
    width: Math.max(100, parseInt(JSON.parse(localStorage['viewer.presets.width'] || '400'), 10)),
    height: Math.max(100, parseInt(JSON.parse(localStorage['viewer.presets.height'] || '300'), 10)),
    position: JSON.parse(localStorage['viewer.presets.position'] || '"center"'),
    modal: true,
    title: 'Presets',
    beforeClose: function() {
      var position = $(this).dialog('option', 'position');      
      localStorage['viewer.presets.position'] = JSON.stringify([position[0], position[1]]);
      localStorage['viewer.presets.width'] = $(this).dialog('option', 'width');
      localStorage['viewer.presets.height'] = $(this).dialog('option', 'height');
    }
  });
  $('#options-presets-button').click(function() {
    $('#presets').dialog('open');
    return false;
  });
  $('#presets-form').submit(function() {
    var preset = {};
    var presetList = bit155.scraper.presets();
    var presetForm = $(this).serializeParams();
    var options = viewer.options();
    var i;
    
    // make sure it's a unique name
    if ($.trim(presetForm.name || '') === '') {
      viewer.error('You must specify a name for the preset.');
      return false;
    }
    
    for (i = 0; i < presetList.length; i++) {
      if (presetList[i].name === presetForm.name) {
        if (!confirm('There is already a preset with the name "' + presetForm.name + '". Do you want to overwrite the existing preset?')) {
          return false;
        }
      }
    }
    
    // configure preset
    preset.name = presetForm.name;
    preset.options = {};
    preset.options.language = options.language;
    preset.options.selector = options.selector;
    preset.options.attributes = $.extend(true, [], options.attributes);
    preset.options.filters = $.extend(true, [], options.filters);
    preset.options.nextpage= options.nextpage;
    // remove existing presets with the same name, append new preset, and save
    presetList = presetList.filter(function(p) { return p.name !== preset.name; });
    presetList.unshift(preset);
    bit155.scraper.presets(presetList);
    viewer.reloadPresets();
    
    return false;
  });
  $('#presets-list').sortable({
    update: function(event, ui) {
      var presetMap = {};
      var presetList = [];
      
      // map existing presets to identifier strings
      $.each(bit155.scraper.presets(), function(i, p) {
        presetMap['preset-' + i] = p;
      });
      
      // reorder the preset list
      $.each($(this).sortable('toArray'), function(i, id) {
        presetList.push(presetMap[id]);
      });
      
      bit155.scraper.presets(presetList);
      viewer.reloadPresets();
    }
  });
  viewer.reloadPresets();
  
  // reset button
  $('#options-reset-button').click(function() {
    if (confirm("Do you want to reset the options to their original values?")) {
      $('#presets-form-name').val('');
      viewer.options(options);
      viewer.scrape();
    }
    return false;
  });
  
  // language
  $('#options-language').change(function() {
    var lang = $('#options-language').val();
    $('#options-language-help').empty();
    if (lang === 'jquery') {
      $('#options-language-help').append($('<a href="http://api.jquery.com/category/selectors/" target="_blank">').text('jQuery Reference'));
    } else if (lang === 'xpath') {
      $('#options-language-help').append($('<a href="http://www.stylusstudio.com/docs/v62/d_xpath15.html" target="_blank">').text('XPath Reference'));
    }
  });
  $('#options-language').change();
  
  // initial scrape
  //viewer.scrape();
  
  // save dimensions upon resize
  addEventListener('resize', function(event) {
    localStorage['viewer.width'] = window.outerWidth;
    localStorage['viewer.height'] = window.outerHeight;
  });
  
  // save options on close
  addEventListener("unload", function(event) {
    var options = viewer.options();
    if (!options.filters) {
      options.filters = [];
    }
    localStorage['viewer.options'] = JSON.stringify(options);
    localStorage['viewer.west.size'] = layout.state.west.size;
    localStorage['viewer.west.closed'] = layout.state.west.isClosed;
  }, true);
  
  // give selectorinput focus
  $('#options-selector').select().focus();
  
  setTimeout(function() {
    layout.resizeAll();
  }, 100);
  
  // if error, wait a moment to show it
  if (options.error) {
    setTimeout(function() {
      viewer.error(options.error);
    }, 500);
  }
});

