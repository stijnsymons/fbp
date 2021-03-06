(function(config, window, undefined){

	var FBP = function(config) {
		
		/*
		
		soundcloud.addEventListener('onPlayerReady', function(player, data) {
			player.api_play();
		});

		<object height="81" width="100%" id="yourPlayerId" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000">
			<param name="movie" value="http://player.soundcloud.com/player.swf?url=http%3A%2F%2Fsoundcloud.com%2Fmatas%2Fhobnotropic&enable_api=true&object_id=yourPlayerId"></param>
			<param name="allowscriptaccess" value="always"></param>
			<embed allowscriptaccess="always" height="81" src="http://player.soundcloud.com/player.swf?url=http%3A%2F%2Fsoundcloud.com%2Fmatas%2Fhobnotropic&enable_api=true&object_id=yourPlayerId" type="application/x-shockwave-flash" width="100%" name="yourPlayerId"></embed>
		</object>

		
		*/
		
		this.apiKey    = config.apiKey;
		this.FB        = config.FB;
		this.player    = config.player;
		this.data      = null;
		this.loadState = [];
		this.groups    = [];
		this.blocklist = [];
		this.current   = 0;
		this.offset    = 0;
		this.fetched   = {
			configGroups: false,
			configBlocklist: false
		};
		return this;
	};
	
	/* MAIN ------------------------------------------------------ */
	
	FBP.prototype.init = function() {
		// set the observers for private events
		document.observe('fbp:loggedin', function(){
			console.log('fbp:loggedin caught');
			$('status').update('Fetching feeds&hellip;');
			
			// this.data = this.load('data');
			// this.since = this.load('since');
			this.updateHomeData('youtube.com');
			this.updateHomeData('soundcloud.com');
			this.updateGroupData();
		}.bind(this));
		
		document.observe('fbp:listloaded', function(evt){
			console.log('fbp:listloaded caught ' + evt.memo.type);
			this.handleListLoaded(evt.memo.type);
		}.bind(this));
		
		document.observe('fbp:loadingcomplete', function(){
			console.log('loadingcomplete');
			$('status').update('Starting interface&hellip;');
			this.updateInterfaceList();
			this.updateInterfaceControls();
			this.updateInterfaceConfig();
			this.play();
			
			// check if it's music or not
			this.requestIsMusic();
		}.bind(this));

		soundcloud.addEventListener('onPlayerReady', function(player, data) {
			player.api_play();
		});


		
		// window.onbeforeunload = function(){
		// 	alert('going away, saving your shit');
		// 	this.save('data', this.data);
		// }.bind(this);
		
		// check the state >> through private events
		this.FB.init({apiKey: this.apiKey});

		this.checkLoginStatus();
		
		return this;
	};

	FBP.prototype.save = function(key, value) {
		console.log('saving this:');
		console.log(value);
		localStorage.setItem('fbp.'+this.userResponse.id+'.'+key, Object.toJSON(value));
		return this;
	};
	
	FBP.prototype.load = function(key) {
		var obj = localStorage.getItem('fbp.'+this.userResponse.id+'.'+key);
		if (obj!==null) {
			return obj.evalJSON();
		}
		return null;
	}

	/* CONFIG ---------------------------------------------------- */
	
	FBP.prototype.appendToBlocklist = function(uid, nick) {
		if (!this.blocklist.pluck('uid').include(uid)) {
			this.blocklist.push({uid: uid, nick: nick});
			this.save('blocklist', this.blocklist);

			this.updateInterfaceList();
		}
		return this;
	};
	
	FBP.prototype.removeFromBlocklist = function(uid) {
		var blocklistUids = this.blocklist.pluck('uid'),
			index;

		index = blocklistUids.indexOf(uid);

		if (index >= 0) {
			this.blocklist.splice(index, 1);
			this.save('blocklist', this.blocklist);
			
			this.updateInterfaceList();
		}

		return this;
	};

	FBP.prototype.appendToGroups = function(group) {
		if (group.name && group.uid) {
			if (!this.groups.pluck('uid').include(group.uid)) {
				this.groups.push(group);
				
				this.save('groups', this.groups);
				
				//dirty should be done with messaging
				this.fetched.configGroups = false;
				$('configGroups').hide();
				$('hideConfigGroupsButton').hide();
				$('showConfigGroupsButton').show();
				this.updateGroupData();
			}
		}
		
		return this;
	};
	
	FBP.prototype.removeFromGroups = function(group) {
		var groupUids = this.groups.pluck('uid'),
			index;

		index = groupUids.indexOf(group);

		if (index >= 0) {
			this.groups.splice(index, 1);
			this.save('groups', this.groups);
			this.fetched.configGroups = false;
			$('configGroups').hide();
			$('hideConfigGroupsButton').hide();
			$('showConfigGroupsButton').show();
			this.updateGroupData();
		}

		return this;
	};

	/* LOGIN ---------------------------------------------------- */

	FBP.prototype.handleLogin = function(response) {
		var FB = this.FB;

		if (!response.session) {
			//no session, set login button
			$('status').update('Please log in');
			$('header').update(
				new Element('a', {'href': '#', 'class': 'nav right'}).update('Login').observe('click', function(){
					this.FB.login(this.handleLogin.bind(this), {perms:'read_stream,user_groups'});
				}.bind(this))
			);

			return this;
		}
		
		// check FB
		FB.api('/me', function(response){
			// remember user
			var header = $('header');
			
			this.userResponse = response;

			// load the saved groups
			this.groups = this.load('groups') || [];
			
			// load the blocked users
			this.blocklist = this.load('blocklist') || [];

			header.update(new Element('img', {'src': 'https://graph.facebook.com/'+response.id+'/picture', 'class': 'left'}));
			header.insert(new Element('span', {'class': 'nav left'}).update(response.name));
			header.insert(new Element('a', {'href': '#', 'class': 'nav right'}).update('Logout').observe('click', function(){
				this.FB.logout(function(){
					window.location.reload();
				});
			}.bind(this)));
			document.fire('fbp:loggedin');
		}.bind(this));
		
		return this;
	};
	
	FBP.prototype.handleListLoaded = function(type) {
		if (this.loadState.indexOf(type) < 0) {
			this.loadState.push(type);
			console.log('-----'+this.loadState.length+'----------'+this.groups.length+'---------------')
			if (this.loadState.length >= this.groups.length + 2) {
				// fire event to trigger that all loading is done
				console.log('--------------------- tis op');
				document.fire('fbp:loadingcomplete');
			}
		}
		return this;
	};

	FBP.prototype.checkLoginStatus = function() {
		this.FB.getLoginStatus(this.handleLogin.bind(this));
		return this;
	};
	
	/* DATA ------------------------------------------------------ */

	FBP.prototype.requestIsMusic = function(id) {
		var script;
		
		if (id) {
			script = new Element('script', {src: 'http://gdata.youtube.com/feeds/api/videos/'+id+'?v=2&alt=json-in-script&callback=fbp.appendIsMusic&key=AI39si5Px-2l8kW5gZbCHrqMwwG5qywE5qlelDBZsZ9T5i9N9KITHcIjYCB9Un7nlWPzCRDu7wdlpYAzZcURhzFFCohBBu7H2g', async: 'true'});
			document.getElementsByTagName('head')[0].appendChild(script);
		} else {
			this.data.each(function(el){
				if (el.value.type=="youtube") {
					this.requestIsMusic(el.value.id);
				}
			}.bind(this));
		}
		return this;
	};
	
	FBP.prototype.appendIsMusic = function(root) {
		var cat, key, value, link;

		if (root && root.entry) {
			cat = root.entry['media$group']['media$category'].find(function(el) {
				return el.scheme === 'http://gdata.youtube.com/schemas/2007/categories.cat';
			});
			if (cat['$t'] === 'Music') {
				key = 'youtube_' + root.entry['media$group']['yt$videoid']['$t'];
				value = this.data.get(key);
				value.isMusic = true;
				this.data.set(key, value);
				
				link = $(key);
				if (link) {
					link = link.down('a');
					if (link) {
						link.insert({before: new Element('span', {'class': 'music'}).update(new Element('a', {'href':'#'}).update('&#9835;'))});
					}
				}
			}
		}
		
		return this;
	};
	
	// FBP.prototype.isMusic = function() {
	// 	return this;
	// };
	// 
	FBP.prototype.appendData = function(data) {
		console.log('merging new data');
		this.data = $H(this.data).merge(data);
		return this;
	}
	
	FBP.prototype.updateHomeData = function(site) {
		return this.updateData('/me/home?q='+site+'&limit=50', 'homelist');
	};

	FBP.prototype.updateGroupData = function() {
		this.groups.each(function(el){
			this.updateData('/'+el.uid+'/feed?limit=50', 'grouplist-'+el.name, el);
		}.bind(this));
		return this;
	};

	FBP.prototype.updateData = function(url, loadedEventName, group) {
		this.FB.api(url, this.parseFBResponse.bind({that: this, loadedEventName: loadedEventName, group: group}));
		return this;
	};

	FBP.prototype.parseFBResponse = function(response) {
		console.log('response data');
		console.log(response);
		
		if (response.data && response.data.length > 0) {
			var key, data = {};
			this.that.offset = this.that.offset + 50;	// @todo
			response.data.each(function(item, index) {
				var created,date,time,key,end;
				if (item.source && item.type === 'video' && item.source.indexOf('youtube') >= 0) {
					// 2 patterns: 
					// http://www.youtube.com/v/-hDl3tCuYf0&autoplay=1
					// http://www.youtube.com/watch?v=-hDl3tCuYf0&NR=1
					if (item.source.indexOf('/v/') >= 0) {
						this.key = item.source.split('/')[4].split('&')[0];
					}
					else if (item.source.indexOf('v=') >= 0) {
						this.key = item.source.split('v=')[1].split('&')[0];
					}

					if (this.data['youtube_'+this.key]) {
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
							group: [],
							created: new Date(),
							count: 1,
							data: [item]
						};
						this.data['youtube_'+this.key].created.setFullYear(parseInt(date[0],10), parseInt(date[1],10)-1, parseInt(date[2],10));
						this.data['youtube_'+this.key].created.setHours(parseInt(time[0],10), parseInt(time[1],10), parseInt(time[2],10));
					}
					
					if (this.group && !this.data['youtube_'+this.key]['group'].include(this.group)) {
						this.data['youtube_'+this.key]['group'].push(this.group);
					}
					
				}
				else if (item.source && item.type === 'video' && item.source.indexOf('soundcloud') >= 0) {
					// 2 patterns: 
					// http://www.youtube.com/v/-hDl3tCuYf0&autoplay=1
					// http://www.youtube.com/watch?v=-hDl3tCuYf0&NR=1

					end = item.link.indexOf('?');
					if (end < 0) {
						end = item.link.length;
					}
					this.key = item.link.slice(22, end).gsub('/', '%2F');

					if (this.data['soundcloud_'+this.key]) {
						this.data['soundcloud_'+this.key]['data'].push(item);
						this.data['soundcloud_'+this.key]['count'] = this.data['youtube_'+this.key]['data'].length;
						if (!this.data['soundcloud_'+this.key]['uid'].include(item.from.id)) {
							this.data['soundcloud_'+this.key]['uid'].push(item.from.id);
						}
					}
					else {
						created = item.created_time.split('T');
						date = created[0].split('-');
						time = created[1].substr(0,created[1].indexOf('+')).split(':');
						
						this.data['soundcloud_'+this.key] = {
							type: 'soundcloud',
							id: this.key.gsub('%2F','/'),
							uid: [item.from.id],
							isMusic: true,
							group: [],
							created: new Date(),
							count: 1,
							data: [item]
						};
						this.data['soundcloud_'+this.key].created.setFullYear(parseInt(date[0],10), parseInt(date[1],10)-1, parseInt(date[2],10));
						this.data['soundcloud_'+this.key].created.setHours(parseInt(time[0],10), parseInt(time[1],10), parseInt(time[2],10));
					}
					
					if (this.group && !this.data['soundcloud_'+this.key]['group'].include(this.group)) {
						this.data['soundcloud_'+this.key]['group'].push(this.group);
					}
					
				}
			}.bind({data: data, key: key, group: this.group}));
			
			this.that.appendData(data);
			
			if (response.paging && response.paging.previous) {
				console.log(response.paging.previous);
				console.log(this.that.offset);
				if (this.that.offset <= 200) {
					var q,limit, params,url;
					console.log('still going');
					
					url    = response.paging.previous.substring(26,response.paging.previous.indexOf('?')) + '?';
					params = response.paging.previous.toQueryParams();
					
					if (params.q) {
						url = url + '&q=' + params.q;
					}
					if (params.limit) {
						url = url + '&limit=' + params.limit;
					}
					
					console.log('requesting ' + url + '&offset=' + this.that.offset);
					
					this.that.FB.api(url + '&offset=' + this.that.offset, this.that.parseFBResponse.bind({that: this.that, data: this.data, loadedEventName: this.loadedEventName+'1'}));
				}
				else {
					document.fire('fbp:listloaded', {type: this.loadedEventName});
				}
				
			}
			else {
				document.fire('fbp:listloaded', {type: this.loadedEventName});
			}
		}
		else {
			document.fire('fbp:listloaded', {type: this.loadedEventName});
		}
	};

	/* INTERFACE ------------------------------------------------- */

	FBP.prototype.updateCaption = function() {
		var dataArray = this.list[this.current].data,
			caption = $('caption');
		
		caption.update(new Element('div', {'class': 'name'}).update(dataArray[0].name));
		caption.insert(new Element('div', {'class': 'description'}).insert(dataArray[0].description));
		
		dataArray.each(function(el){
			var captionItem = new Element('div', {'class': 'captionItem'}),
				wrapper;

				console.log('dataArray');
				console.log(el);

			captionItem.insert(new Element('div', {'class': 'left'}).update(new Element('img', {'src': 'https://graph.facebook.com/'+el.from.id+'/picture'})));
			
			if (el.message && el.message.length > 0 && el.name !== el.message) {
				wrapper = new Element('div', {'class': 'wrapper left'})
				// wrapper.insert(new Element('div', {'class': 'name'}).insert(el.message));
				wrapper.insert(new Element('div', {'class': 'description'}).insert(el.message));
				captionItem.insert(wrapper);
			}
			this.insert(captionItem);
		}.bind(caption));
		return this;
	};
	
	FBP.prototype.updateInterfaceControls = function() {
		var controls = $('controls');
		
		controls.observe('click', function(evt){
			var el = evt.findElement('a');
			
			switch (el.id) {
				case 'previousButton':
					this.previous();
					break;
				case 'startButton':
					this.player.playVideo();
					el.hide();
					$('pauseButton').show();
					break;
				case 'pauseButton':
					this.player.pauseVideo();
					el.hide();
					$('startButton').show();
					break;
				case 'forwardButton':
					this.forward();
					break;
				case 'nsfwButton':
					this.player.setStyle({'visibility': 'visible', 'height': '185px'});
					el.hide();
					$('sfwButton').show();
					break;
				case 'sfwButton':
					this.player.setStyle({'visibility': 'hidden', 'height': '0px'});
					el.hide();
					$('nsfwButton').show();
					break;
			}
		}.bind(this));
		
		controls.show();
		
		return this;
	};
	
	FBP.prototype.updateInterfaceConfig = function(){
		var configUl = $('config');
		
		configUl.observe('click', function(evt){
			var el = evt.findElement('a'),
				li;
			
			if (el.hasClassName('addGroup')) {
				this.appendToGroups({uid: el.name, name: el.innerHTML});
			}
			else if (el.hasClassName('removeGroup')) {
				this.removeFromGroups(el.name);
			}
			else if (el.hasClassName('removeBlocked')) {
				this.removeFromBlocklist(el.name);
			}
			else {
				switch (el.id) {
					case 'showConfigGroupsButton':
						if (!this.fetched.configGroups) {
							$('configSubscribedGroupsList').update();
							$('configMyGroupsList').update();
							this.groups.each(function(group) {
								this.li = new Element('li').update(
									new Element('a', {'href': '#', 'class': 'removeGroup', 'name': group.uid}).update(group.name)
								);
								this.ul.insert(this.li);
							}.bind({ul:$('configSubscribedGroupsList'), li:li}));

							this.fetched.configGroups = true;
							this.getMyGroups($('configMyGroupsList'));
						}
						$('showConfigGroupsButton').hide();
						$('hideConfigGroupsButton').show();
						$('configGroups').show();
						break;
					case 'hideConfigGroupsButton':
						$('hideConfigGroupsButton').hide();
						$('showConfigGroupsButton').show();
						$('configGroups').hide();
						break;
					case 'refreshConfigGroupsButton':
						$('configSubscribedGroupsList').update();
						this.fetched.configGroups = false;
						$('showConfigGroupsButton').fire('click');
						break;
					case 'showConfigBlocklistButton':
						if (!this.fetched.configBlocklist) {
							$('configBlocklistList').update();
							this.blocklist.each(function(user) {
								this.li = new Element('li').update(
									new Element('a', {'href': '#', 'class': 'removeBlocked', 'name': user.uid}).update(user.nick)
								);
								this.ul.insert(this.li);
							}.bind({ul:$('configBlocklistList'), li:li}));

							this.fetched.configBlocklist = true;
						}
						$('showConfigBlocklistButton').hide();
						$('hideConfigBlocklistButton').show();
						$('configBlocklist').show();
						break;
					case 'hideConfigBlocklistButton':
						$('hideConfigBlocklistButton').hide();
						$('showConfigBlocklistButton').show();
						break;
				}
			}
		}.bind(this));
		
		configUl.show();
		
		return this;
	};
	
	FBP.prototype.getMyGroups = function(container){
		console.log('requesting url [/me/groups?limit=50]');
		this.FB.api('/me/groups?limit=50', function(response){
			console.log('requested [/me/groups?limit=50]');
			console.log(response);
			var li,
				groupUids = this.groups.pluck('uid');
			
			if (response && response.data) {
				response.data.each(function(el) {
					if (!groupUids.include(el.id)) {
						this.li = new Element('li').update(
							new Element('a', {'href': '#', 'class': 'addGroup', 'name': el.id, 'rel': el.name}).update(el.name)
						);
						this.ul.insert(this.li);
					}
				}.bind({ul:this.container, li:li}));
			}
		}.bind({container: container, groups: this.groups}));
	};
	
	FBP.prototype.updateInterfaceList = function(config) {
		var list, 
			li, 
			playlistItem, 
			counter = 0;
		console.log('updating interface playlist');
		
		if (!this.listNode) {
			this.listNode = new Element('ul', {id: 'listNode'}).hide().observe('click', function(evt){
				var index,
					el = evt.findElement('a');
					
				if (el) {
					if (el.hasClassName('track')) {
						this.seek(parseInt(el.name,10));
					}
					else if (el.up(0).hasClassName('music')) {
						this.updateInterfaceList({type: 'onlyMusic'});
						if (!$('seeAllVideos')) {
							$('controls').insert(
								new Element('a', {'id':'seeAllVideos','class': 'button'}).update('See All Videos').observe('click', function(){
									$('seeAllVideos').remove();
									this.updateInterfaceList();
								}.bind(this)));
						}
					}
					else if (el.hasClassName('block')) {
						console.log('blocking user ' + el.name + ' -- ' + el.previous().innerHTML);
						this.appendToBlocklist(el.name, el.previous().innerHTML);
					}
					else if (el.hasClassName('group')) {
						console.log('loading for group ' + el.name);
						this.updateInterfaceList({type: 'group', 'value': el.name});
						if (!$('seeAllControl')) {
							$('controls').insert(
								new Element('a', {'id':'seeAllControl','class': 'button'}).update('All Friends').observe('click', function(){
									$('seeAllControl').remove();
									this.updateInterfaceList();
								}.bind(this)));
						}
					}
					else if (el.hasClassName('user')) {
						console.log('loading for user ' + el.name);
						this.updateInterfaceList({type: 'uid', 'value': el.name});
						if (!$('seeAllControl')) {
							$('controls').insert(
								new Element('a', {'id':'seeAllControl','class': 'button'}).update('All Friends').observe('click', function(){
									$('seeAllControl').remove();
									this.updateInterfaceList();
								}.bind(this)));
						}
					}
					// evt.stop();
				}
			}.bind(this));
			$('list').insert(this.listNode);
		}
		else {
			this.listNode.hide();
			this.listNode.update();
		}
		
		list = this.data.values().sortBy(function(el){
			return el.created.valueOf();
		});
		
		this.list = [];
		
		list.each(function(el) {
			var isBlocked = false,
				uid = el.uid,
				blocklist = this.blocklist.pluck('uid'),
				prefix = el.type;

			// don't non-music include if we're only doing music
			if (this.config && this.config.type === 'onlyMusic' && !el.isMusic) {
				return false;
			}

			uid = uid.select(function(u){
				return !blocklist.include(u);
			});

			if (uid.length <= 0) {
				isBlocked = true;
			}
			
			// filter on uid
			if (this.config && this.config.type === 'uid' && !uid.include(this.config.value)) {
				return false;
			}

			// filter on group
			if (this.config && this.config.type === 'group' && !el.group.pluck('uid').include(this.config.value)) {
				return false;
			}
			
			if (isBlocked === false) {
				li = new Element('li', {'id': prefix+'_' + el.id});
				playlistItem = new Element('div', {'id': 'playlist-'+this.counter}).update(
					new Element('a',{'href':'#','name': this.counter, 'class': 'track'}).update(el.data[0].name)
				);

				el.data.each(function(el){
					this.insert(new Element('span', {'class': 'label', 'name': el.from.id}).update(
							new Element('a', {'href': '#', 'class': 'user', 'name': el.from.id}).update(el.from.name)
						).insert(new Element('a', {'href': '#', 'class': 'hidden block', 'name': el.from.id}).update('x'))
					);
				}.bind(playlistItem));

				if (el.group && el.group.length > 0) {
					el.group.each(function(el, index){
						this.insert(new Element('a', {'href':'#', 'class': 'label group', 'name': el.uid}).update(el.name));
					}.bind(playlistItem));
				}
				
				if (el.isMusic) {
					playlistItem.down('a').insert({before: new Element('span', {'class': 'music'}).update(new Element('a', {'href':'#'}).update('&#9835;'))});
				}
				
				this.listNode.insert(li.insert(playlistItem));
				this.list.push(el);
				this.counter++;
			}
			
			return true;
		}.bind({listNode: this.listNode, list: this.list, blocklist:this.blocklist, groups: this.groups, counter: counter, config: config}));
		
		// show it
		this.listNode.show();
		return this;
	};

	/* PLAYER ---------------------------------------------------- */

	FBP.prototype.play = function(){
		$('status').update('Loaded ' + this.list.length + ' videos');
		Effect.SlideUp('status', {duration: 3.0});
		// swfobject.embedSWF(
		// 	'http://www.youtube.com/v/' + this.list[this.current].id + '&enablejsapi=1&playerapiid=youtubePlayer',
		// 	'youtubePlayer', '300', '185', '8', null, null, 
		// 	{allowScriptAccess: 'always'},
		// 	{id: 'youtubePlayer'}
		// );

		var flashvars = {
			enable_api: true, 
			object_id: "myPlayer", 
			url: "http://soundcloud.com/a-trak/robyn-indestructible-a-trak-remix"
		};

		swfobject.embedSWF("http://player.soundcloud.com/player.swf", 
			"myContent", "81", "100%", "9.0.0","expressInstall.swf", flashvars, {allowscriptaccess: "always"}, 
			{id: "soundcloudPlayer", name: "soundcloudPlayer"}
		);

		
		this.updateCaption();
		return this;
	};
	
	FBP.prototype.forward = function(){
		return this.seek(this.current+1);
	};
	
	FBP.prototype.previous = function(){
		return this.seek(this.current-1);
	};
	
	FBP.prototype.seek = function(index) {
		if (index >= 0 && index < this.list.length) {
			console.log('seeking for ' + index + ' currently at ' + this.current);
			if ($('playlist-'+this.current)) {
				$('playlist-'+this.current).removeClassName('playing');
			}
			$('playlist-'+index).addClassName('playing');
			this.current = index;
			console.log('seeking ('+index+') ('+this.list[index]+')')
			this.player.loadVideoById(this.list[index].id);
			this.player.playVideo();
			this.updateCaption();
		}
		else {
			console.log('outside of list');
		}
		return this;
	};
	
	if (Prototype.Browser.IE) {
		$('content').update('sorry no IE support yet');
	}
	
	var fbp = new FBP(config).init();
	window.fbp = fbp;	//@todo: remove
	
	/* YOUTUBE GLOBAL DIRT ------------------------------------ */
	window.youtubePlayerStateChange = function(state) {
		if (state === 0) {
			console.log('forwarding');
			this.forward();
		}
	}.bind(fbp);

	window.onYouTubePlayerReady = function(playerId) {
		this.player = $(playerId);
		this.player.addEventListener('onStateChange', 'youtubePlayerStateChange');
		this.player.setStyle({'visibility': 'hidden', 'height': '0px'});
		// this.player.playVideo();
		this.seek(0);
	}.bind(fbp);
	

})({apiKey: 'a887094ee69e067634556ed01a864cc4', FB: window.FB, player: $('player')}, window);
