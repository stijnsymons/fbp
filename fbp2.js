(function(config, window, undefined){

	var FBP = function(config) {
		this.apiKey = config.apiKey;
		this.FB = config.FB;
		this.loadState = [];
		this.data = {};
		this.header = config.header;
		this.content = config.content;
		this.player = config.player;
		this.footer = config.footer;
		this.since = '-2%20weeks';
		this.current = 0;
		this.blocklist = [{uid:582789594, nick:'Bart Becks'},{uid:123, nick: 'bla'}];	// block bb
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
			this.updateInterfaceList();
			this.updateInterfaceControls();
			this.play();
			
			// check if it's music or not
			this.requestIsMusic();
		}.bind(this));
		
		// check the state >> through private events
		this.FB.init({apiKey: this.apiKey});

		this.checkLoginStatus();
		
		return this;
	};
	
	FBP.prototype.requestIsMusic = function(id) {
		// http://gdata.youtube.com/feeds/api/videos/9jIwvQkBUt4?v=2&alt=json-in-script&callback=fbp.appendIsMusic&key=AI39si5Px-2l8kW5gZbCHrqMwwG5qywE5qlelDBZsZ9T5i9N9KITHcIjYCB9Un7nlWPzCRDu7wdlpYAzZcURhzFFCohBBu7H2g
		var script;
		
		if (id) {
			console.log('checking for [' + id + ']');
			script = new Element('script', {src: 'http://gdata.youtube.com/feeds/api/videos/'+id+'?v=2&alt=json-in-script&callback=fbp.appendIsMusic&key=AI39si5Px-2l8kW5gZbCHrqMwwG5qywE5qlelDBZsZ9T5i9N9KITHcIjYCB9Un7nlWPzCRDu7wdlpYAzZcURhzFFCohBBu7H2g', async: 'true'});
			document.getElementsByTagName('head')[0].appendChild(script);
		} else {
			this.data.each(function(el){
				this.requestIsMusic(el.value.id);
			}.bind(this));
		}
		return this;
	};
	
	FBP.prototype.appendIsMusic = function(root) {
		var cat, key, value;

		if (root && root.entry) {
			cat = root.entry['media$group']['media$category'].find(function(el) {
				return el.scheme === 'http://gdata.youtube.com/schemas/2007/categories.cat';
			});
			if (cat['$t'] === 'Music') {
				key = 'youtube_' + root.entry['media$group']['yt$videoid']['$t'];
				console.log('found music on YouTube for ['+key+']');
				value = this.data.get(key);
				value.isMusic = true;
				this.data.set(key, value);
				
				$(key).insert(new Element('span').update(new Element('a', {'href':'#', 'class': 'isMusic'}).update('&#9835;')));
			}
		}
		
		return this;
	};
	
	FBP.prototype.isMusic = function() {
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
	
	FBP.prototype.updateInterfaceList = function(config) {
		var list, li;
		console.log('updating interface playlist');
		
		if (!this.listNode) {
			this.listNode = new Element('ul', {id: 'listNode'}).hide().observe('click', function(evt){
				var el,index;
				el = evt.findElement('a');
				if (el) {
					if (el.hasClassName('track')) {
						this.seek(parseInt(el.name,10));
					}
					else if (el.hasClassName('isMusic')) {
						this.updateInterfaceList({type: 'onlyMusic'});
						if (!$('seeAllVideos')) {
							this.content.insert(
								new Element('a', {'id':'seeAllVideos','class': 'button'}).update('See All Videos').observe('click', function(){
									$('seeAllVideos').remove();
									this.updateInterfaceList();
								}.bind(this)));
						}
					}
					else if (el.hasClassName('user')) {
						console.log('loading for user ' + el.name);
						this.updateInterfaceList({type: 'uid', 'value': el.name});
						if (!$('seeAllControl')) {
							this.content.insert(
								new Element('a', {'id':'seeAllControl','class': 'button'}).update('All Friends').observe('click', function(){
									$('seeAllControl').remove();
									this.updateInterfaceList();
								}.bind(this)));
						}
					}
					// evt.stop();
				}
			}.bind(this));
			this.content.insert(this.listNode);
		}
		else {
			this.listNode.hide();
			this.listNode.update();
		}
		
		// load updated list
		list = this.data.sortBy(function(el){
			return el.created;
		});
		
		this.list = new DoublyLinkedList();
		
		list.each(function(el,index) {
			var isBlocked = false,
				uid = el.value.uid,
				blocklist = this.blocklist.pluck('uid');

			console.log(this.config);

			if (this.config && this.config.type === 'onlyMusic' && !el.value.isMusic) {
				return false;
			}

			uid = uid.select(function(u){
				return !blocklist.include(u);
			});
			
			if (uid.length <= 0) {
				isBlocked = true;
			}
			
			if (this.config && this.config.type === 'uid' && !uid.include(this.config.value)) {
				return false;
			}
			
			if (isBlocked === false) {
				li = new Element('li', {'id': 'youtube_' + el.value.id}).update(new Element('a',{'href':'#','name': index, 'class': 'track'}).update(el.value.data[0].name));
				el.value.data.each(function(el){
					this.insert(new Element('a', {'href':'#', 'class': 'list_from user', 'name': el.from.id}).update(el.from.name));
				}.bind(li));
				if (el.value.isMusic) {
					li.insert(new Element('span').update(new Element('a', {'href':'#', 'class': 'isMusic'}).update('&#9835;')));
				}
				this.listNode.insert(li);
				this.list.add(el.value);
			}
			
			return true;
		}.bind({listNode: this.listNode, list: this.list, blocklist:this.blocklist, config: config}));
		
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
		return this.seek(this.current+1);
	};
	
	FBP.prototype.previous = function(){
		return this.seek(this.current-1);
	};
	
	FBP.prototype.seek = function(index) {
		if (index >= 0 && index < this.list.size()) {
			console.log('seeking for ' + index + ' currently at ' + this.current);
			this.current = index;
			this.player.loadVideoById(this.list.item(index).id);
			this.player.playVideo();
		}
		else {
			console.log('outside of list');
		}
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
							if (!this.data['youtube_'+this.key]['uid'].include(item.from.id)) {
								this.data['youtube_'+this.key]['uid'].push(item.from.id);
							}
						}
						else {
							created = item.created_time.split('T');
							date = created[0].split('-');
							time = created[1].substr(0,created[1].indexOf('+')).split(':');
							this.data['youtube_'+this.key] = {
								type: 'youtube',
								id: this.key,
								uid: [item.from.id],
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
