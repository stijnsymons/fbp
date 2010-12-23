(function(config, window, undefined){

	var FBP = function(config) {
		this.apiKey = config.apiKey;
		this.FB = config.FB;
		this.loadState = [];
		this.list = new DoublyLinkedList();
		this.data = {};
		this.header = config.header;
		this.content = config.content;
		this.player = config.player;
		this.footer = config.footer;
		this.since = '-2%20weeks';
		this.current = 0;
		return this;
	};

	FBP.prototype.init = function() {
		// set the observers for private events
		document.observe('fbp:loggedin', function(){
			console.log('fbp:loggedin caught');
			// this.getStoredList();
			this.updateHomeList();
			this.updateGroupList();
		}.bind(this));
		
		document.observe('fbp:listloaded', function(evt){
			console.log('fbp:listloaded caught ' + evt.memo.type);
			this.handleListLoaded(evt.memo.type);
		}.bind(this));
		
		document.observe('beforeunload', function(){
			this.storeList();
		}.bind(this));
		
		document.observe('fbp:loadingcomplete', function(){
			console.log('loadingcomplete');
			this.updateInterfaceControls();
			this.play();
		}.bind(this));
		
		// check the state >> through private events
		this.FB.init({apiKey: this.apiKey});

		this.checkLoginStatus();
		
		return this;
	};
	
	FBP.prototype.appendData = function(data) {
		console.log('merging new data');
		this.data = $H(this.data).merge(data);
		return this;
	}
	
	FBP.prototype.getStoredList = function() {
		var value;
		if (this.hasLocalStorage()) {
			value = localStorage.getItem('fbp.'+this.user+'.list');
			if (value !== null) {
				this.appendList(value.evalJSON());
				return true;
			}
		}
		this.content.fire('fbp:listloaded', {type: 'storedlist'});
		return false;
	};
	
	FBP.prototype.storeList = function() {
		if (this.hasLocalStorage()) {
			return localStorage.setItem('fbp.'+this.user+'.list', this.list.toJSON());
		}
		return false;
	};
	
	// from: http://diveintohtml5.com/storage.html
	FBP.prototype.hasLocalStorage = function() {
		try {
			return 'localStorage' in window && window['localStorage'] !== null;
		} catch (e) {
			return false;
		}
	};
	
	FBP.prototype.handleLogin = function(response) {
		var FB = this.FB;

		if (!response.session) {
			//no session, set login button
			this.header.update(new Element('div', {'class': 'button'}).update('Login').observe('click', function(){
				this.FB.login(this.handleLogin.bind(this), {perms:'read_stream'});
			}.bind(this)));

			return this;
		}
		
		// check FB
		FB.api('/me', function(response){
			// remember user
			this.userResponse = response;
			this.header.update(new Element('img', {'src': 'https://graph.facebook.com/'+response.id+'/picture'}));
			this.header.insert(new Element('span').update(response.name));
			this.header.insert(new Element('div', {'class': 'button'}).update('Logout').observe('click', function(){
				this.FB.logout();
				this.header.update(new Element('div', {'class': 'button'}).update('Login').observe('click', function(){
					this.FB.login(this.handleLogin.bind(this), {perms:'read_stream'});
				}.bind(this)));
			}.bind(this)));
			this.header.fire('fbp:loggedin');
		}.bind(this));
		
		return this;
	};
	
	FBP.prototype.handleLoadHome = function(response) {
		
	};

	FBP.prototype.handleLoadGroup = function(response) {
		
	};
	
	FBP.prototype.handleListLoaded = function(type) {
		if (this.loadState.indexOf(type) < 0) {
			this.loadState.push(type);
			
			// update interface
			this.updateInterfaceList();
			
			if (this.loadState.length >= 2) {
				// fire event to trigger that all loading is done
				this.content.fire('fbp:loadingcomplete');
			}
		}
		return this;
	};
	
	FBP.prototype.updateInterfaceControls = function() {
		this.content.insert(new Element('a', {'class': 'button'}).update('previous').observe('click', function(){
			this.previous();
		}.bind(this)));
		this.content.insert(new Element('a', {'class': 'button'}).update('forward').observe('click', function(){
			this.forward();
		}.bind(this)));
	};
	
	FBP.prototype.updateInterfaceList = function() {
		var list, li;
		console.log('updating interface playlist');
		
		if (!this.listNode) {
			this.listNode = new Element('ul', {id: 'listNode'}).hide().observe('click', function(evt){
				var el,index;
				el = evt.findElement('a');
				index = el.name;
				
				this.seek(index);
				evt.stop();
			}.bind(this));
			this.content.insert(this.listNode);
		}
		else {
			this.listNode.hide();
		}
		
		// load updated list
		list = this.data.sortBy(function(el){
			// get a proper timestamp from this
			return el.created;
		});
		
		list.each(function(el,index){
			li = new Element('li').update(new Element('a',{'href':'#','name': index}).update(el.value.data[0].name));
			el.value.data.each(function(el){
				this.insert(new Element('span', {'class': 'list_from'}).update(el.from.name));
			}.bind(li));
			this.listNode.insert(li);
			this.list.add(el.value);
		}.bind({listNode: this.listNode, list: this.list}));
		
		// show it
		this.listNode.show();
		return this;
	};
	
	FBP.prototype.play = function(){
		this.player.hide();
		
		swfobject.embedSWF(
			'http://www.youtube.com/v/' + this.list.item(this.current).id + '&enablejsapi=1&playerapiid=player', 
			'player', '480', '295', '8', null, null, 
			{allowScriptAccess: 'always'},
			{id: 'player'}
		);
		
		this.player.show();
		
		return this;
	};
	
	FBP.prototype.forward = function(){
		this.current++;
		this.seek(this.current);
		return this;
	};
	
	FBP.prototype.previous = function(){
		this.current--;
		this.seek(this.current);
		return this;
	};
	
	FBP.prototype.seek = function(index) {
		this.player.loadVideoById(this.list.item(index).id);
		this.player.playVideo();
		return this;
	};
	
	FBP.prototype.updateHomeList = function() {
		return this.updateList('/me/home?q=youtube.com&since=' + this.since, 'homelist');
	};

	FBP.prototype.updateGroupList = function() {
		return this.updateList('/116486325080867/feed', 'grouplist');
	};

	FBP.prototype.updateList = function(url, loadedEventName) {
		var data = {};
		
		this.FB.api(url, function(response) {
			if (response.data && response.data.length > 0) {
				var key;
				response.data.each(function(item, index) {
					var created,date,time;
					if (item.link && item.type === 'video' && item.source.indexOf('youtube') >= 0) {
						this.key = item.link.split('v=')[1].split('&')[0];
						if (this.data['youtube_'+this.key]) {
							// found a duplicate
							// console.log(this.data);
							this.data['youtube_'+this.key]['data'].push(item);
							this.data['youtube_'+this.key]['count'] = this.data['youtube_'+this.key]['data'].length;
						}
						else {
							created = item.created_time.split('T');
							date = created[0].split('-');
							time = created[1].substr(0,created[1].indexOf('+')).split(':');
							this.data['youtube_'+this.key] = {
								type: 'youtube',
								id: this.key,
								created: new Date(date[0], date[1], date[2], time[0], time[1], time[2]),
								count: 1,
								data: [item]
							};
						}
					}
				}.bind({data: data, key: key}));
				
				this.that.appendData(data);
				this.that.content.fire('fbp:listloaded', {type: this.loadedEventName});
			}
		}.bind({that: this, loadedEventName: loadedEventName}));
		
		return this;
	};
	
	FBP.prototype.checkLoginStatus = function() {
		this.FB.getLoginStatus(this.handleLogin.bind(this));
		return this;
	};
	
	var fbp = new FBP(config).init();
	window.fbp = fbp;	//@todo: remove
	
	window.youtubePlayerStateChange = function(state) {
		if (state === 0) {
			console.log('forwarding');
			this.forward();
		}
	}.bind(fbp);

	window.onYouTubePlayerReady = function(playerId) {
		this.player = $(playerId);
		this.player.addEventListener('onStateChange', 'youtubePlayerStateChange');
		this.player.playVideo();
	}.bind(fbp);
	

})({apiKey: 'a887094ee69e067634556ed01a864cc4', FB: window.FB, header: $('header'), content: $('content'), footer: $('footer'), player: $('player')}, window);
