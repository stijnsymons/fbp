(function(config, connector, window, undefined){

	var FBP = function(config, connector) {
		this.config    = config;
		this.connector = connector;
		this.playlist  = false;
		this.player    = false;
		return this;
	}
	
	FBP.prototype.init = function() {
		var conn   = this.connector,
			FB     = conn.FB,
			config = this.config;
		
		if (conn.type === 'FB') {
			FB.init({ apiKey: conn.apiKey});
			FB.getLoginStatus(this.handleFBSessionResponse.bind(this));
			
			config.user.login.observe('click', function() {
				this.login();
			}.bind(conn));

			config.user.logout.observe('click', function() {
				this.logout();
			}.bind(conn));
			
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
		config.controls.forward.observe('click', function() {
			this.forward();
		}.bind(this));
		
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
			console.log(response);
			var userInfo = this.config.user.info;
			userInfo.update(new Element('img', {'src': 'https://graph.facebook.com/'+response.id+'/picture'}));
			userInfo.insert(response.name);
		}.bind(this));

		FB.api('/me/home?q=youtube.com&since=' + this.since(), function(response){
			if (response.data && response.data.length > 0) {
				response.data.each(function(item){
					if (item.type==='video' && item.source.indexOf('youtube')>=0) {
						this.push(item);
					}
				}.bind(youtubies));
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
		if (this.playlist && this.playlist.length > 0) {
			swfobject.embedSWF("http://www.youtube.com/v/" + this.playlist[0].link.split('v=')[1] + "&enablejsapi=1&playerapiid=player", 
				'player', "480", "295", "8", null, null, 
				{allowScriptAccess: "always"}, 
				{id: "player"}
			);
			this.list();
		}
		return this;
	};
	
	FBP.prototype.list = function() {
		var list = new Element('ul', {'id': 'list'});
		this.playlist.each(function(item){
			var lia = new Element('a', {'id': 'item_'+item.id+'_a'});
			var li = new Element('li', {'id': 'item_'+item.id}).insert(lia);
			lia.insert(new Element('span', {'id': 'item_'+item.id+'_from', 'class': 'list_from'}).insert(item.from.name));
			lia.insert(new Element('span', {'id': 'item_'+item.id+'_name', 'class': 'list_name'}).insert(item.name));
			this.insert(li);
		}.bind(list));
		this.config.placeholders.list.insert(list);
		return this;
	};
	
	FBP.prototype.play = function() {
		// shift the first one, we've used it for starting YT
		var item = this.playlist.shift(),
			player = this.player;
		this.updateCaption(item);
		player.addEventListener("onStateChange", 'youtubePlayerStateChange');
		player.playVideo();	// play the first video
		return this;
	};

	FBP.prototype.updateCaption = function(item) {
		var caption = new Element('div', {'id': 'caption'});
		caption.insert(new Element('img', {'id':'avatar', 'src': 'https://graph.facebook.com/'+item.from.id+'/picture'}));
		caption.insert(new Element('div', {'id':'from'}).insert(item.from.name));
		caption.insert(new Element('div', {'id':'dateadd'}).insert(item.create_time));
		caption.insert(new Element('div', {'id':'name'}).insert(item.name));
		caption.insert(new Element('div', {'id':'message'}).insert(item.message));
		this.config.placeholders.caption.update(caption);
		return this;
	};

	FBP.prototype.forward = function() {
		var item = this.playlist.shift();
		this.updateCaption(item);
		this.player.loadVideoById(item.link.split('v=')[1]);
		return this;
	};

	var fbp = new FBP(config, connector).init();
	

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
		forward: $('controlsForward')
	}, 
	user: {
		login: $('userLogin'), 
		logout: $('userLogout'), 
		info: $('userInfo')
	},
	placeholders: {
		list: $('placeholderList'),
		caption: $('placeholderCaption')
	}
}, {type: 'FB', FB: FB, apiKey: 'a887094ee69e067634556ed01a864cc4'}, window);
