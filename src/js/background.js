/*
 * background.js
 *
 * Author: dave@bit155.com
 * Modifier: ferdinandfly@gmail.com
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
 
//context menus
function onClickHandler(info, tab) {
	if (info.menuItemId=='PageScraper'){
		 var active = false;
	
		 // get selection options and open viewer with the response
		 chrome.tabs.sendRequest(tab.id, { command: 'scraperSelectionOptions' }, function(response) {
		   active = true;
		   bit155.scraper.viewer(tab, response);
		 });
		 
		 // offer to reload page if no response
		 setTimeout(function() {
		   if (!active && confirm('You need to reload this page before you can use Scraper. Press ok if you would like to reload it now, or cancel if not.')) {
		     chrome.tabs.update(tab.id, {url: "javascript:window.location.reload()"});
		   }
		 }, 500);
	}
};

chrome.contextMenus.onClicked.addListener(onClickHandler);
var scrapeSimilarItem = chrome.contextMenus.create({title: "Scrape similar...",contexts: ['all'],id: "PageScraper"});



// oauth
var oauth = ChromeExOAuth.initBackgroundPage({
  'request_url': 'https://www.google.com/accounts/OAuthGetRequestToken',
  'authorize_url': 'https://www.google.com/accounts/OAuthAuthorizeToken',
  'access_url': 'https://www.google.com/accounts/OAuthGetAccessToken',
  'consumer_key': 'anonymous',
  'consumer_secret': 'anonymous',
  'scope': 'https://docs.google.com/feeds/',
  'app_name': 'Scraper'
});


chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  var command = request.command;
  var payload = request.payload;
  var response = $.extend({}, payload);
  if (command === 'scraperScrapeTab') {
    // forward requests for "scraperScrape" to the appropriate tab
	
    chrome.tabs.sendRequest(parseInt(payload.tab, 10), { command: 'scraperScrape', payload: payload.options ,script:payload.script}, sendResponse);
  } else if (command === 'scraperSpreadsheet') {
     
    // export spreadsheet to google docs
    oauth.authorize(function() {
      // remove trailing colons from slug as this will result in error due to
      // http://code.google.com/a/google.com/p/apps-api-issues/issues/detail?id=2136
      var title = payload.title || '';
      var slug = encodeURIComponent(title.replace(/[:]+\s*$/,''));
      var request = {
        'method': 'POST',
        'headers': {
          'GData-Version': '3.0',
          'Content-Type': 'text/csv',
          'Slug': slug
        },
        'parameters': {
          'alt': 'json'
        },
        'body': payload.csv
      };
      var url = 'https://docs.google.com/feeds/default/private/full';
    
      var callback = function(response, xhr) {
        if (xhr.status == 401) {
          // unauthorized, token probably bad so clear it
          oauth.clearTokens();
          sendResponse({error: 'Google authentication failed. Please try exporting again, and you will be re-authenticated.'});
        } else if (xhr.status - 200 < 100) {
          try {
            var json = JSON.parse(response);
        
            // open page
            if (json && json.entry && json.entry.link) {
              var links = json.entry.link;
              for (var i = 0; i < links.length; i++) {
                if (links[i].rel === 'alternate' && links[i].type === 'text/html') {
                  chrome.tabs.create({
                    url: links[i].href
                  });
                }
              }
            }
          
            // forward response to the caller
            sendResponse(json);
          } catch (error) {
            sendResponse({
              error: error
            });
          }
        } else {
          sendResponse({
            error: 'Received an unexpected response.\n\n' + response
          });
        }
      };
      oauth.sendSignedRequest(url, callback, request);
    });
  }else if (command === 'scraperSendData'){
	  var framer=new Iframes(payload,sendResponse);
	  framer.getContent();

  }else if (command ==='getChildUrl'){
      var xhr = new XMLHttpRequest();
      xhr.open("GET",payload.url,true);
      xhr.onreadystatechange = function() {
    	  if (xhr.readyState == 4) {
	    	  var result = JSON.parse(xhr.responseText);
	    	  response=$.extend(result, response);
	    	  sendResponse(response);
    	  }
    	};
      xhr.send();
  }else if (command==='scraperAskForDelete'){
      var xhr = new XMLHttpRequest();
      xhr.open("GET",payload.url,true);
      xhr.onreadystatechange = function() {
    	  if (xhr.readyState == 4) {
	    	  var result = JSON.parse(xhr.responseText);
	    	  response=$.extend(result, response);
	    	  sendResponse(response);
    	  }
      };
      xhr.send();
  }else if (command=='getServerScript'){
      var xhr = new XMLHttpRequest();
      xhr.open("GET",payload.url,true);
      xhr.onreadystatechange = function() {
    	  if (xhr.readyState == 4) {
	    	  sendResponse(xhr.responseText);
    	  }
      };
      xhr.send();
  }else if (command=='scraperNextpage'){
	  	var payloadChild={};
	  	payloadChild.nextpage=payload.nextpage;
	  	payloadChild.sendAgain=payload.sendAgain;
	    chrome.tabs.sendRequest(parseInt(payload.tab, 10), { command: 'scraperNextpage', payload:payloadChild}, sendResponse);
  }else if (command=='scraperRemoteInitialize'){
      var xhr = new XMLHttpRequest();
      xhr.open("GET",payload.url,true);
      xhr.onreadystatechange = function() {
    	  if (xhr.readyState == 4) {
	    	  sendResponse(xhr.response);
    	  }
      };
      xhr.send();
  }
});


// make some default presets
// the image and thumb must be named as image /thumb, or this program will not download them.
if (!bit155.scraper.presets()) {
  bit155.scraper.presets([
	  {
	    name: 'boncoin-list', 
	    options: {
	      language: 'xpath',
	      selector: '//div[11]/div/div[1]/a',
	      attributes: [
	        { xpath: "./@href", name: 'Url' },
	        { xpath: "./div[@class='lbc']/div[@class='detail']/div[@class='title']", name: 'Title' },
	        { xpath: "./div[@class='lbc']/div[@class='detail']/div[@class='category']", name:'Category'},
	        { xpath: "./div[@class='lbc']/div[@class='detail']/div[@class='placement']", name:'Address'},
	        { xpath: "./div[@class='lbc']/div[@class='detail']/div[@class='price']", name:'Price'}
	      ],
	      filters: ['empty'],
	      servercontroller: "boncoin",
	      server: "http://admin.spoop.fr",
	      departement: "france",
	      nextpage: "#ContainerMain ul.paging li.page a:contains(Page suivante)", 
	      testOption: 'test',
	      remotescript: "",
	      thumbToImagePattern:"",
	      thumbToImageReplace: "",
	    }
	  },
	  { 
	    name: 'boncoin-detail', 
	    options: {
	      language: 'xpath',
	      selector: "/html/body/div[@id='page_align']/div[@id='page_width']/div[@id='ContainerMain']/div[@class='content-border']/div[@class='content-color']/div[@class='lbcContainer']",
	      attributes: [
	        { xpath: "./div[@class='header_adview']/div", name: 'Date' },
	        { xpath: "./div[@class='lbcOptions']/div[@class='lbc_option_box'][1]/div[2]/div[@class='lbc_links'][2]/div[2]/div/span[@class='lbcPhone']/img[@class='AdPhonenum']/@src", name: 'Phone' },
	        { xpath: "./div[3]/div[1]/div[@class='lbcImages']/div/div[@id='thumbs_carousel']/a/span[@class='thumbs']/@style", name:'thumb'},	        
	        { xpath: "./div[3]/div[@class='lbcParams']/table/tbody/tr", name:'Infomation'},
	        { xpath: "./div[3]/div[@class='AdviewContent']/div[2]", name:'description'},
	        { xpath: "./div[3]/div[1]/div[@class='lbcImages']/div[@class='images_cadre']/a[@id='image']/@style", name:'image'}
	      ],
	      filters: ['empty'],
	      servercontroller: "boncoin",
	      server: "http://admin.spoop.fr",
	      departement: "france",
	      nextpage: '',
	      remotescript: "",
	      thumbToImagePattern:"",
	      thumbToImageReplace: "",
	    }
	  },
	  { 
	    name: 'viva-list', 
	    options: {
	      language: 'xpath',
	      selector: "/html/body/div/div[@id='vs_content']/table[@id='classified_table']/tbody/tr/td[@id='classified_cell']/table/tbody/tr",
	      attributes: [
	        { xpath: "./td/a[@class='classified-link']/@href", name: 'Url' },
	        { xpath: "./td[@class='summary']/a/strong", name: 'Title' },
	        { xpath: "./td[@class='photo']/a[@class='classified-link']/span[@class='photo-num']", name:'photoNumber'}
	      ],
	      filters: ['empty'],
	      servercontroller: "vivastreet",
	      server: "http://admin.spoop.fr",
	      departement: "france",
	      nextpage: "#vs_content .kiwii-box-footer>ul>li>a:contains(Suivante)",
	      remotescript: "",
	      thumbToImagePattern:"",
	      thumbToImageReplace: "",
	    }
	  },
	  { 
	    name: 'viva-detail', 
	    options: {
	      language: 'xpath',
	      selector: "/html/body/div",
	      attributes: [
	        { xpath: "./div[@id='vs_content']/div/div[@class='kiwii-box-padding-xxsmall']/table[@class='kiwii-width-full kiwii-padding-top-xxsmall kiwii-clear-both']/tbody/tr",name: 'info'},
	        { xpath: "./div/div[@id='vs_header']/div[@class='inner']/div[@id='vs_breadcrumbs']/div[@class='inner ']/ul[@class='kiwii-h-list mmmenu']/li[@class='tab last']/a[@id='vs_bc_cat_link']",name: 'category'},
	        { xpath: "./div[@id='vs_content']/div[@class='kiwii-fine-span-68 kiwii-float-left kiwii-box-white']/div[@class='kiwii-box-padding-xxsmall']/div[@class='kiwii-margin-ver-xxsmall']/div[@class='kiwii-float-left kiwii-btn-container-size']/div[@class='kiwii-float-right kiwii-margin-left-large kiwii-padding-left-large phone']/div[@id='vs-phone-nbr']/div[@id='phone_number']", name: 'Phone' },
	        { xpath: "./div[@id='vs_content']/div[@class='kiwii-fine-span-68 kiwii-float-left kiwii-box-white']/div[@class='kiwii-box-padding-xxsmall']/div[@class='kiwii-padding-ver-xxsmall']", name:'description'},
	        { xpath: "./div[@id='vs_content']/div[@class='kiwii-fine-span-68 kiwii-float-left kiwii-box-white']/div[@class='kiwii-box-padding-xxsmall']/div[@id='vs_photo_viewer']/div[@class='large']/img[@id='vs_image_viewer']/@src", name:'image'},
	        { xpath: "./div[@id='vs_content']/div[@class='kiwii-fine-span-68 kiwii-float-left kiwii-box-white']/div[@class='kiwii-box-padding-xxsmall']/div[@id='vs_photo_viewer']/div[@class='selector']/a/img/@src", name : 'thumb'}
	      ],
	      filters: ['empty'],
	      remotescript: "/js/vivastreet.js",
	      servercontroller: "vivastreet",
	      server: "http://admin.spoop.fr",
	      departement: "france",
	      thumbToImagePattern:"",
	      thumbToImageReplace: ""
	    }
	  },
	  { 
	    name: 'ebay-list', 
	    options: {
	      language: 'xpath',
	      selector: "/html/body/div/div[@id='blending_central_panel']/div[@class='cm-central_panel cm-gy']/div[@class='rs-oDiv cm-bg']/div[@class='rs-iDiv cm-br no-inline']",
	      attributes: [
	        { xpath: "./table[@class='lvt']/tbody/tr[1]/td[@class='lv-p140']/div[@class='lv-od lv-bcb']/a/@href", name: 'Url' },
	        { xpath: "./table[@class='lvt']/tbody/tr[1]/td[@class='lv-desc-box lv-pl']/div[@class='wrapper']/div[@class='lv-pb5 lv-title-box']/a", name: 'Title' },
	        { xpath: "./table[@class='lvt']/tbody/tr[1]/td[@class='lv-desc-box lv-pl']/div/div[2]/span[@class='lv-slt']", name:'type'},
	        { xpath: "./table[@class='lvt']/tbody/tr[1]/td[@class='lv-ps']/div[@class='lv-dvpr']/div[@class='lv-pb5']/b",name:'price'}
	      ],
	      filters: ['empty'],
	      servercontroller: "ebay",
	      server: "http://admin.spoop.fr",
	      departement: "",
	      nextpage: ".cm-central_panel .pg-w .pg-rp a",
	      remotescript: "",
	      thumbToImagePattern:"(.*\/)small(\/.*)",
	      thumbToImageReplace: "$1large$2"
	    }
	  },
	  { 
	    name: 'ebay-detail', 
	    options: {
	      language: 'xpath',
	      selector: "/html/body[@id='body']/div[@id='vi-container']",
	      attributes: [
	        { xpath: "./table[@id='vi-tTbl']/tbody/tr/td[@id='vi-tTblC2']/table/tbody/tr/td/div[1]/div[@class='vi-cf-ts']/div[@id='v4-33_tb']/span[@class='vi-cf-box'][1]/span",name: 'tel'},
	        { xpath: "./table[@id='vi-tTbl']/tbody/tr/td[@id='vi-tTblC2']/table/tbody/tr/td/div[1]/div[@id='v4-33_ss']/div[@class='vi-cf-p0'][1]/span",name: 'seller'},
	        { xpath: "./table[@id='vi-tTbl']/tbody/tr/td[@id='vi-tTblC2']/table/tbody/tr/td/div[1]/div[@id='v4-33_ss']/div[3]/span", name: 'address' },
	        { xpath: "./table[@id='vi-tTbl']/tbody/tr/td[@id='vi-tTblC1']/div[@class='vi-ipic1']/div[1]/table/tbody/tr[3]/td/div[@id='pD_vv4-32']/div[@id='vv4-32_div']/table/tbody/tr/td/img/@src", name:'thumb'},
	        { xpath: "./table[@id='vi-tTbl']/tbody/tr/td[@id='vi-tTblC1']/div[@class='vi-ipic1']/div[1]/table/tbody/tr[1]/td[@class='vs_w-a']//div[@class='ic-w500 ic-m']/center/img/@src", name:'image'},
	        { xpath: "./div[@id='vi-top']/div[@class='vi-cmb']/div[@class='vi-ih-header']/table[@class='vi-ih-area_nav']/tbody/tr/td[3]/table/tbody/tr/td[2]/div/div[@class='bbc-in bbc bbc-nav']/ul/li", name:'category'},
	        { xpath: "./div[@id='vi-content']/div[4]/table/tbody/tr/td[@class='storeDescTd']/div/div[@class='item_description']/div[@id='ngvi_desc_div']/div[@class='d-iframe']/iframe/@src", name:'description-iframe'},
	        { xpath: "./table[@id='vi-tTbl']/tbody/tr/td[@id='vi-tTblC2']/table/tbody/tr/td/div[1]/div[@id='v4-33_ss']/div[4]/span", name: 'date'},
	        { xpath: "./div[@id='vi-content']/div[4]/table/tbody/tr/td[@class='storeDescTd']/div/div[@class='item_description']/div[@id='ngvi_desc_div']/div/div",name: 'description'},
	        { xpath: "./table[@id='vi-tTbl']/tbody/tr/td[@id='vi-tTblC2']/table/tbody/tr/td/div[1]/div[@class='vi-cf-stl']/span", name: 'type'}
	      ],
	      filters: ['empty'],
	      remotescript: "",
	      servercontroller: "ebay",
	      server: "http://admin.spoop.fr",
	      departement: "france",
	      thumbToImagePattern:"(.*\~\~60_)(14)(.*)",
	      thumbToImageReplace: "$112$3"
	    }
	  },
	]);
};


