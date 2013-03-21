var Iframes=function(payload,sendResponse){
	this.urls=[];
	this.urlIndex=-1;
	payload.data=JSON.parse(payload.data);
	this.payload=payload;
	this.sendResponse=sendResponse;
};
Iframes.prototype.callback=function(){
		var imager=new Images(this.payload,this.sendResponse);
		imager.getImages();
	
};

Iframes.prototype.setUrls=function(){
	var data=this.payload.data;
	var pattern = /^https?:\/\/[^\s]+$/i;
	for(var i=0;i<data.length;i++){
		for(var j=0;j<data[i].length;j++){
			if ((data[i][j].type=="iframe") ){
				if (pattern.test(data[i][j].string)){ //when it is a dirct img source.
					url=data[i][j].string;
					var info={};
					info.url=url;
					info.i=i;
					info.j=j;
					this.urls.push(info);
				}
			}
		}
	}
};

Iframes.prototype.getContent=function(){
	this.setUrls();
	this.getNextIframe(this.getNextUrl());

};

Iframes.prototype.getNextIframe=function(info){
	if (info==null || this.urlIndex>10){
		this.callback();
		return false;
	}
	
	var self=this;
	var xhr = new XMLHttpRequest();
	xhr.open('GET', info.url, true);
	xhr.onload = function(e) {
	    if (xhr.status == 200) { 	
	    	info.content=$(xhr.response).filter("table").find("#EBdescription").html();
	    	self.saveContent(info);
	    }
	    self.getNextIframe(self.getNextUrl());
	};
	xhr.send();
};

Iframes.prototype.saveContent=function(info){
	this.payload.data[info.i][info.j].string=info.content;
};

Iframes.prototype.getNextUrl=function(){
	this.urlIndex++;
	if (this.urlIndex<this.urls.length)
		return this.urls[this.urlIndex];
	return null;
};
