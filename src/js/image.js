var Images=function(payload,sendResponse){
	this.urlIndex=-1;
	this.urls=[];
	this.images=[];
	this.thumbImage=payload.thumbImage;
	this.payload=payload;
	this.sendResponse=sendResponse;
};


Images.prototype.getImages=function(){
	this.setUrls();
	this.getNextImage(this.getNextUrl());

};

Images.prototype.setUrls=function(){
	if (!this.payload.hasImage)
		return false;
	var data=this.payload.data;	
	var pattern = /^https?:\/\/[^\s]+$/i;
	var re = new RegExp(this.thumbImage.pattern,"i");
	for(var i=0;i<data.length;i++){
		for(var j=0;j<data[i].length;j++){
			if ((data[i][j].type=="image") ||data[i][j].type=="thumb" ){
				var images=data[i][j].string.split('||');
				for(var k=0;k<images.length;k++){
					if (images[k].match(/.*url\(\'.*\'\).*/gi)){//when it is a background image
						var url=images[k].replace(/.*url\(\'(.*)\'\).*/gi,"$1");
						if (pattern.test(url)){
							//this replacement only works for site who use thumbs/images path to sepreate them.
							//in fact we could add a parameter in option to parse them.
							if (data[i][j].type=="thumb"){
								url=url.replace('thumbs','images');
								if (typeof this.thumbImage!='undefined' && this.thumbImage.pattern !="" && this.thumbImage.replace!=""){
									url=url.replace(re,this.thumbImage.replace);
								}
							}
							var info={};
							info.url=url;
							info.i=i;
							info.j=j;
							info.k=k;
							this.urls.push(info);
						}
					}else if (pattern.test(images[k])){ //when it is a dirct img source.
							url=images[k];
							if (data[i][j].type=="thumb"){
								url=url.replace('thumbs','images');
								if (typeof this.thumbImage!='undefined' && this.thumbImage.pattern !="" && this.thumbImage.replace!=""){
									url=url.replace(re,this.thumbImage.replace);
								}
							}			
							var info={};
							info.url=url;
							info.i=i;
							info.j=j;
							info.k=k;
							this.urls.push(info);
					}
				}
			}
		};
	}
};

Images.prototype.callback=function(){
	var sendResponse=this.sendResponse;
	var self=this;
	var xhr = new XMLHttpRequest();
	  // the third parameter is a flag for preflight, true means no preflight, false means yes.
    xhr.open("POST",this.payload.url,true);
    xhr.onreadystatechange = function() {
    	  if (xhr.readyState == 4) {
	    	  var result = JSON.parse(xhr.responseText);
	    	  sendResponse(result);
    	  }
    	};
	xhr.upload.onprogress = function(evt){
        if (evt.lengthComputable) {  
    	    var request = {};
    	    // send getChildUrl request to background.js
    	    request.tab=self.payload.tab;
    	    request.command = 'uploading';
    	    request.percentage = Math.round(evt.loaded / evt.total * 100);
    	    chrome.extension.sendRequest(request);
          }  
	};  
	var fd = new FormData();
	//xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
	//FormData already do this.
    //fd.append('server-method', 'upload');
    // The native FormData.append method ONLY takes Blobs, Files or strings
    // The FormData for Web workers polyfill can also deal with array buffers
	for (var i=0;i<this.images.length;i++){
		var image=this.images[i];
		fd.append('images['+image.i+']['+image.j+']['+image.k+']', image.blob);
	}
    fd.append('data',JSON.stringify(this.payload.data));
    xhr.send(fd);
};


Images.prototype.getNextImage=function(info){
	if (info==null){
		this.callback();
		return false;
	}
	var self=this;
	var xhr = new XMLHttpRequest();
	xhr.open('GET', info.url, true);
	
	// Response type blob - XMLHttpRequest 2
	xhr.responseType = 'blob';
	xhr.onload = function(e) {
	    if (xhr.status == 200) {
	    	var blob = new Blob([xhr.response], {type: 'image/png'});
	    	info.blob=blob;
	    	self.saveImage(info);
	    }
	    self.getNextImage(self.getNextUrl());
	};
	xhr.send();
};	

Images.prototype.getNextUrl=function(){
	this.urlIndex++;
	if (this.urlIndex<this.urls.length)
		return this.urls[this.urlIndex];
	return null;
};

Images.prototype.saveImage=function(info){
	this.images.push(info);
};

Images.prototype.is_string=function(obj){
	 return toString.call(obj) == '[object String]';
};