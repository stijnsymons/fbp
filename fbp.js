(function(config, connector, window, undefined){

	var FBP = function(config, connector) {
		this.config     = config;
		this.connector  = connector;
		this.playlist   = false;
		this.player     = false;
		this.current    = false;
		this.isStorable = this.hasLocalStorage();
		if (this.isStorable) {
			document.observe('storage', this.handleStorageEvent);
		}
		this.user       = false;
		this.following  = false;
		return this;
	};
	
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
			
			conn.getUser = function(url) {
				var params = url.split('?')[1].toQueryParams(),
					uid = false;
				// grouppage: 'http://www.facebook.com/home.php?sk=group_116486325080867&ap=1'
				if (params.sk && params.sk.indexOf('groups_') !== false) {
					uid = params.sk.split('_')[1];
				}
				return uid;
			}
		}

		// if we have local storage, enable extras menu
		if (this.isStorable) {
			this.config.extras.follow.observe('click', this.clearInput);
			this.config.extras.followButton.observe('click', function(){
				this.follow(this.config.extras.follow.getValue());
			}.bind(this));
			
			// show extras menu
			this.config.placeholders.extras.show();
		}
		
		// controls
		config.controls.forward.observe('click', function() {this.forward();}.bind(this));
		config.controls.previous.observe('click', function() {this.previous();}.bind(this));
		
		return this;
	};

	FBP.prototype.clearInput = function(evt) {
		var el = evt.findElement('input');
		if (el) {
			el.clear();
		}
	};

	FBP.prototype.updatePersonals = function() {
		this.updateUnfollowList();
		return this;
	}

	FBP.prototype.updateUnfollowList = function() {
		this.displayUnfollowList();
		this.config.placeholders.unfollowList.show();
		return this;
	}

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
			// remember user
			this.user = response;
			this.config.user.avatar.update(new Element('img', {'src': 'https://graph.facebook.com/'+response.id+'/picture'}));
			this.config.user.name.update(response.name);
			this.updatePersonals();
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
		
		
		// FB.api('/me/home?q=vimeo.com&since=' + this.since(), function(response){
		// 	console.log(response);
		// });
		
		return this;
	};

	FBP.prototype.handleStorageEvent = function(evt) {
		alert('Unfollowing someone');
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
				index = false;
			if (el.hasClassName('list_unfollow')) {
				this.unfollow(el.id.split('_')[2]);
			}
			else if (el.hasClassName('list_from')) {
				alert('sorry, still todo - try selecting the song title');
			}
			else if (el.hasClassName('list_name')) {
				index = el.id.split('_')[2];
				console.log('index ' + index + '  -- ' + el.id);
				this.seek(this.playlist[index]);
			}
			else{
				alert(el.className);
			}
		}.bind(this));
		this.playlist.each(function(item,index){
			var lia = new Element('a', {'id': 'item_a_'+index, href: "#"});
			var li  = new Element('li', {'id': 'item_li_'+index}).insert(lia);
			if (this.isStorable) {
				lia.insert(new Element('a', {'id': 'item_unfollow_'+item.from.id,'href': '#','class': 'list_unfollow'}).insert('x'));
			}
			lia.insert(new Element('a', {'id': 'item_from_'+index, 'class': 'list_from'}).insert(item.from.name));
			lia.insert(new Element('a', {'id': 'item_name_'+index, 'class': 'list_name'}).insert(item.name));
			this.list.insert(li);
		}.bind({list: list, isStorable: this.isStorable}));
		this.config.placeholders.list.insert(list);
		return this;
	};

	FBP.prototype.displayUnfollowList = function() {
		var unfollowList = this.fetch('unfollow'),
			list = new Element('ul', {'id': 'unfollowList'});
		
		unfollowList.each(function(item){
			var li  = new Element('li').insert(item);
			this.insert(li);
		}.bind(list));

		this.config.placeholders.unfollowList.update(list);
		return this;
	}

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

	// from: http://diveintohtml5.com/storage.html
	FBP.prototype.hasLocalStorage = function() {
		try {
			return 'localStorage' in window && window['localStorage'] !== null;
		} catch (e) {
			return false;
		}
	};

	FBP.prototype.getStorageKey = function(key) {
		if (Object.isArray(key)) {
			key = key.join('.');
		}
		return 'user.' + this.user.id + '.' + key;
	};

	FBP.prototype.unfollow = function(uid) {
		var unfollow = false;
		if (this.isStorable) {
			// check if we're following this outside our friendslist
			this.remove('follow', [uid]);
			this.store('unfollow', [uid]);
			this.updateUnfollowList();
		}
		return this;
	};

	FBP.prototype.follow = function(url) {
		var user = false;
		if (this.isStorable) {
			user = this.connector.getUser(url);
			if (user) {
				localStorage.setItem('user.'+this.user.id+'.follow', user.id);
			}
		}
		return this;
	};

	FBP.prototype.store = function(key, value) {
		var original = this.fetch(key);
		if (Object.isArray(original)) {
			if (!Object.isArray(value)) {
				value = [].push(value);
			}
			value = original.concat(value).uniq();
		}
		localStorage.setItem(this.getStorageKey(key), value.toJSON());
		return this;
	};

	FBP.prototype.fetch = function(key) {
		var value = localStorage.getItem(this.getStorageKey(key));
		console.log('fetching');
		console.log(key);
		console.log(value);
		console.log(this.getStorageKey(key));
	    return (value !== null) && value.evalJSON();
	};
	
	FBP.prototype.remove = function(key, mixed) {
		var value;
		if (mixed !== undefined) {
			// removed parts of value
			value = this.fetch(key);
			if (Object.isArray(value)) {
				this.store(value.without(mixed));
			}
		} else {
			localStorage.removeItem(this.getStorageKey(key));
		}
		return this;
	};

/*	
	FBP.prototype.tag = function(item) {
		if (this.isStorable) {
			
		}
		return this;
	};
	
	FBP.prototype.untag = function(item) {
		if (this.isStorable) {
			
		}
		return this;
	};
*/

	var fbp = new FBP(config, connector).init();
	window.fbp = fbp;	//@todo: remove this
	console.log(fbp);	//@todo: remove this

	window.youtubePlayerStateChange = function(state) {
		if (state === 0) {
			this.forward();
		}
	}.bind(fbp);

	window.onYouTubePlayerReady = function(playerId) {
		fbp.player = $(playerId);
		fbp.play();
	};

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
		caption: $('placeholderCaption'),
		extras: $('placeholderExtras'),
		unfollowList: $('placeholderUnfollowList')
	},
	extras: {
		follow: $('extraFollow'),
		followButton: $('extraFollowButton')
	}
}, {type: 'FB', FB: FB, apiKey: 'a887094ee69e067634556ed01a864cc4'}, window);
