(function(config, connector, window, undefined){

	var FBP = function(config, connector) {
		this.config    = config;
		this.connector = connector;
		this.playlist  = false;
		this.player    = false;
		this.current   = false;
		return this;
	}
	
	FBP.prototype.init = function() {
		var conn   = this.connector,
			FB     = conn.FB,
			config = this.config;
		
		if (conn.type === 'FB') {
			FB.init({ apiKey: conn.apiKey});
			FB.getLoginStatus(this.handleFBSessionResponse.bind(this));

			// user controls
			config.user.login.observe('click', function() {this.login();}.bind(conn));
			config.user.logout.observe('click', function() {this.logout();}.bind(conn));
			
			conn.login = function() {
				FB.login(this.handleFBSessionResponse, {perms:'read_stream'});
				return this;
			}.bind(this);
			
			conn.logout = function () {
				FB.logout(this.handleFBSessionResponse);
				return this;
			}.bind(this);
		}
		
		// controls
		config.controls.forward.observe('click', function() {this.forward();}.bind(this));
		config.controls.previous.observe('click', function() {this.previous();}.bind(this));
		
		return this;
	};

	FBP.prototype.handleFBSessionResponse = function(response) {
		var youtubies = [],
			FB = this.connector.FB;
		
		// if we dont have a session, just hide the user info
		if (!response.session) {
			this.clear();
			return this;
		}

		// we have a session
		FB.api('/me', function(response){
			this.config.user.avatar.update(new Element('img', {'src': 'https://graph.facebook.com/'+response.id+'/picture'}));
			this.config.user.name.update(response.name);
		}.bind(this));

		FB.api('/me/home?q=youtube.com&since=' + this.since(), function(response){
			if (response.data && response.data.length > 0) {
				response.data.each(function(item, index){
					if (item.type==='video' && item.source.indexOf('youtube')>=0) {
						item.linkedList = {
							_previous: (index-1 > 0) ? this.data[index-1] : false,
							_forward: (index+1 < this.max) ? this.data[index+1] : false
						};
						this.youtubies.push(item);
					}
				}.bind({youtubies: youtubies, data: response.data, max: response.data.length}));
				this.set(youtubies);
				this.prep();
			}
		}.bind(this));
		return this;
	};

	FBP.prototype.clear = function () {
		this.config.userInfo.innerHTML = '';
		return this;
	};

	FBP.prototype.since = function() {
		return '-2%20weeks';
	};

	FBP.prototype.set = function (playlist) {
		this.playlist = playlist;
		return this;
	};
	
	FBP.prototype.prep = function() {
		this.current = this.playlist[0];
		swfobject.embedSWF("http://www.youtube.com/v/" + this.current.link.split('v=')[1] + "&enablejsapi=1&playerapiid=player", 
			'player', "480", "295", "8", null, null, 
			{allowScriptAccess: "always"}, 
			{id: "player"}
		);
		this.list();
		return this;
	};
	
	FBP.prototype.list = function() {
		var list = new Element('ul', {'id': 'list'}).observe('click', function(evt){
			var el = evt.findElement('a'),
				index = el.id.split('_')[1];
			this.seek(this.playlist[index]);
		}.bind(this));
		this.playlist.each(function(item,index){
			// var lia = new Element('a', {'id': 'item_'+item.id+'_a', href: "#"}).observe('click', function(){
			// 	this.seek(item);
			// }.bind(this.that));
			var lia = new Element('a', {'id': 'item_'+index+'_a', href: "#"});
			var li  = new Element('li', {'id': 'item_'+index}).insert(lia);
			lia.insert(new Element('span', {'id': 'item_'+index+'_from', 'class': 'list_from'}).insert(item.from.name));
			lia.insert(new Element('span', {'id': 'item_'+index+'_name', 'class': 'list_name'}).insert(item.name));
			this.insert(li);
		}.bind(list));
		this.config.placeholders.list.insert(list);
		return this;
	};

	FBP.prototype.play = function() {
		// shift the first one, we've used it for starting YT
		var player = this.player;
		this.updateCaption();
		player.addEventListener("onStateChange", 'youtubePlayerStateChange');
		player.playVideo();	// play the first video
		return this;
	};

	FBP.prototype.updateCaption = function() {
		var caption = new Element('div', {'id': 'caption'});
		caption.insert(new Element('img', {'id':'avatar', 'src': 'https://graph.facebook.com/'+this.current.from.id+'/picture'}));
		caption.insert(new Element('div', {'id':'from'}).insert(this.current.from.name));
		caption.insert(new Element('div', {'id':'dateadd'}).insert(this.current.create_time));
		caption.insert(new Element('div', {'id':'name'}).insert(this.current.name));
		caption.insert(new Element('div', {'id':'message'}).insert(this.current.message));
		this.config.placeholders.caption.update(caption);
		return this;
	};

	FBP.prototype.seek = function(obj){
		this.current = obj;
		this.updateCaption();
		this.player.loadVideoById(obj.link.split('v=')[1]);
		this.player.playVideo();
		return this;
	};

	FBP.prototype.forward = function() {
		return this.seek(this.current.linkedList._forward);
	};

	FBP.prototype.previous = function() {
		return this.seek(this.current.linkedList._previous);
	};

	var fbp = new FBP(config, connector).init();
	console.log(fbp);	//@todo: remove this

	window.youtubePlayerStateChange = function(state) {
		if (state === 0) {
			fbp.forward();
		}
	}

	window.onYouTubePlayerReady = function(playerId) {
		fbp.player = $(playerId);
		fbp.play();
	}

})({
	controls:{
		forward: $('controlsForward'),
		previous: $('controlsPrevious')
	}, 
	user: {
		login: $('userLogin'), 
		logout: $('userLogout'), 
		avatar: $('userAvatar'),
		name: $('userName')
	},
	placeholders: {
		list: $('placeholderList'),
		caption: $('placeholderCaption')
	}
}, {type: 'FB', FB: FB, apiKey: 'a887094ee69e067634556ed01a864cc4'}, window);
