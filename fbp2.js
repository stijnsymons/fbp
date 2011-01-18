(function(config, window, undefined){

	var document = window.document;
	if (!console || !console.log) {
		console = {log: function(){}};
	}

	var FBP = function(config) {
		this.storage  = new Storage();
		this.ui       = new UI();
		this.data     = new Data();
		this.playlist = new Playlist('playlist', 'playlistWrapper');
		this.players  = {
			youtube: new YouTubePlayer(),
			soundcloud: new SoundCloudPlayer(),
			vimeo: new VimeoPlayer()
		};

		return this;
	};
	
	FBP.prototype = {
		init: function() {
			// fake push some data into the playlist
			this.playlist.push({
				id: '-x1TFxao0oI',
				provider: 'youtube',
				type: 'music',
				title: 'youtube 1',
				uid: ['123','456','789'],
				groups: ['321','654','987']
			});
			this.playlist.push({
				id: '-hDl3tCuYf0',
				provider: 'youtube',
				type: 'other',
				title: 'youtube 2',
				uid: ['123','456','789'],
				groups: ['321','654','987']
			});
			this.playlist.push({
				id: 'bpitch-control/fall-into-me-d-edge-version',
				provider: 'soundcloud',
				type: 'music',
				title: 'soundcloud 1',
				uid: ['123','456','789'],
				groups: ['321','654','987']
			});
			this.playlist.push({
				id: 'modeselektor/siriusmo-high-together-taken-from-the-upcoming-debut-album-mosaik',
				provider: 'soundcloud',
				type: 'music',
				title: 'soundcloud 2',
				uid: ['123','456','789'],
				groups: ['321','654','987']
			});
			this.playlist.push({
				id: '12135115',
				provider: 'vimeo',
				type: 'music',
				title: 'vimeo 1',
				uid: ['123','456','789'],
				groups: ['321','654','987']
			});
			
			this.playlist.render();

			$(document).observe('fbp.player:play', function(evt) {
				console.log('### play event');

				var newTrack    = evt.memo.track,
					lastTrack   = evt.memo.last,
					newProvider = Helper.getDataAttribute(newTrack, 'provider'),
					lastProvider;

				// stopping previous track (player indep.)
				if (lastTrack) {
					console.log('# stopping previous player');
					currentProvider = Helper.getDataAttribute(lastTrack, 'provider');

					if (currentProvider !== newProvider) {
						console.log('# stopping previous player');
						this.players[currentProvider].stop();
					}
				}

				if (this.players[newProvider]) {
					this.players[newProvider].play(newTrack);
				}
			}.bind(this));

			$(document).observe('fbp.player:pause', function(evt) {
				var track = evt.memo.track,
					provider = Helper.getDataAttribute(track, 'provider');
				
				console.log('paused provider ' + provider);
				
				if (this.players[provider]) {
					this.players[provider].pause();
				}
				
			}.bind(this));

			$(document).observe('fbp.ui:updateCaption', function(evt) {
				console.log('caught: fbp.ui:updateCaption');
			});

			return this;
		}
	};
	
	var Helper = {
		getDataAttribute: function(element, key) {
			return element.readAttribute('data-' + key);
		},
		setDataAttribute: function(element, key, data) {
			element.writeAttribute('data-' + key, data);
			return element;
		},
		removeDataAttribute: function(element, key) {
			element.writeAttribute('data-' + key, null);
			return element;
		},
	};
	
	var Storage = Class.create({
		save: function(key, value) {
			return this;
		},
		load: function(key) {
			return this;
		},
		sync: function() {
			return this;
		}
	});

	var UI = Class.create({
		initialize: function() {
			this.setControls();
			this.playerMeta = {};
			$(document).observe('fbp.ui:playerEvent', this.handlePlayerEvents.bind(this));
			$(document).observe('fbp.ui:playlistEvent', this.handlePlaylistEvents.bind(this));
		},
		setCaption: function() {
			
		},
		hidePlayers: function() {
			$('players').childElements().each(function(el) {
				if (!this.playerMeta[el.id]) this.playerMeta[el.id] = {};
				this.playerMeta[el.id]['height'] = el.height;
				el.setStyle({'visibility': 'hidden', 'height': '0'});
			}.bind(this));
			
			return this;
		},
		showPlayer: function(provider) {
			this.hidePlayers();
			$(provider+'Player').setStyle({'visibility': 'visible', 'height': this.playerMeta[provider+'Player']['height']+'px'});
			
			return this;
		},
		setControls: function() {
			var controls = $('controls');
			controls.on('click', 'a', function(evt, el) {
				var controlPressed = Helper.getDataAttribute(el, 'control');

				switch(controlPressed) {
					case 'sfw':
						el.hide();
						$('nsfwButton').show();
						this.hidePlayers('players');
						break;
					case 'nsfw':
						el.hide();
						$('sfwButton').show();
						this.showCurrentPlayer('players');
						break;
					case 'play':
						el.hide();
						$('pauseButton').show();
						break;
					case 'pause':
						el.hide();
						$('playButton').show();
						break;
				}
				
				$(document).fire('fbp.playlist:controlEvent', {action: controlPressed});

			}.bind(this));

			controls.show();

			return this;
		},
		handlePlaylistEvents: function(evt) {
			switch(evt.memo.event) {
				case 'move':
					if (evt.memo.last) {
						evt.memo.last.removeClassName('playing');
					}
					if (evt.memo.track) {
						evt.memo.track.addClassName('playing');
					}
					
					this.showPlayer(Helper.getDataAttribute(evt.memo.track, 'provider'));
					
					break;
			}
		},
		handlePlayerEvents: function(evt) {
			var event = evt.memo.event,
				play = $('playButton'),
				pause = $('pauseButton');
			
			switch (event) {
				case 'playing':
					if (play.visible()) {
						play.hide();
						pause.show();
					}
					break;
				case 'paused':
					if (pause.visible()) {
						pause.hide();
						play.show();
					}
					break;
			}
			
		}
	});

	var Data = Class.create({
		login: function() {
			return this;
		},
		fetch: function(url, config) {
			return this;
		}
	});
	
	var Player = Class.create({
		initialize: function(player) {
			return this;
		},
		play: function(track) {
			document.fire('fbp.ui:updateCaption', {index: this.current});
			return this;
		},
		pause: function() {
			
		},
		load: function() {
			
		},
		stop: function() {
			
		}
	});
	
	var YouTubePlayer = Class.create(Player, {
		initialize: function() {
			this.youtube = false;
			return this;
		},
		handleLoaded: function() {
			console.log('** youtube ready');
			this.youtube = $('youtubePlayer');
			this.youtube.addEventListener('onStateChange', 'youtubePlayerStateChange');
			this.youtube.playVideo();

			// todo: do the callback
			// todo: warn all that we're ready to start receiving play requests
		},
		load: function(track) {
			swfobject.embedSWF(
				'http://www.youtube.com/v/' + Helper.getDataAttribute(track, 'id') + '&enablejsapi=1',
				'youtubePlayer', '300', '185', '8', null, null, 
				{allowScriptAccess: 'always'},
				{id: 'youtubePlayer'}
			);
						
			document.observe('fbp.player:youtubeready', this.handleLoaded.bind(this));
			
		},
		play: function($super, track) {
			// do the parent thingie
			console.log('youtube play request');
			console.log(track);
			if (!this.youtube) {
				console.log('* loading first youtube play');
				this.load(track);
			}
			else {
				if (track) {
					this.youtube.loadVideoById(Helper.getDataAttribute(track, 'id'));
					this.youtube.playVideo();
				}
				else {
					this.youtube.playVideo();
				}
			}
			
			return $super.play();
		},
		pause: function() {
			this.youtube.pauseVideo();
			return this;
		},
		stop: function() {
			this.youtube.stopVideo();
			return this;
		}
	});

	var SoundCloudPlayer = Class.create(Player, {
		initialize: function() {
			console.log('*** soundcloud init');
			this.soundcloud = false;
			$(document).observe('soundcloud:onPlayerReady', this.handleLoaded.bind(this));
			$(document).observe('soundcloud:onMediaPause', function() {
				$(document).fire('fbp.playlist:playerEvent', {'event': 'paused'});
			});
			$(document).observe('soundcloud:onMediaEnd', function() {
				document.fire('fbp.playlist:playerEvent', {'event': 'ended'});
			});
			$(document).observe('soundcloud:onMediaPlay', function() {
				document.fire('fbp.playlist:playerEvent', {'event': 'playing'});
			});
			
			return this;
		},
		load: function(track) {
			var soundCloudId = 'http://soundcloud.com/'+Helper.getDataAttribute(track, 'id'),
				flashvars = {
				enable_api: true, 
				object_id: "soundcloudPlayer", 
				url: soundCloudId
			};
			
			swfobject.embedSWF("http://player.soundcloud.com/player.swf", 
				"soundcloudPlayer", "100%", "81", "9.0.0","expressInstall.swf", flashvars, {allowscriptaccess: "always"}, 
				{id: "soundcloudPlayer", name: "soundcloudPlayer"}
			);
		},
		play: function($super, track) {
			console.log('* soundcloud play request');

			if (this.soundcloud === false) {
				console.log('* loading first soundcloud track');
				this.load(track);
			} 
			else {
				if (track) {
					console.log('* loading a soundcloud track');
					this.soundcloud.api_load('http://soundcloud.com/'+Helper.getDataAttribute(track, 'id'));
				}
				else {
					this.soundcloud.api_play();
				}
			}
			
			return $super.play();
		},
		handleLoaded: function(evt) {
			console.log('** soundcloud handleLoaded');
			
			var mediaUri  = evt.memo.mediaUri,
				mediaId   = evt.memo.mediaId,
				flashNode = evt.target;
			
			this.soundcloud = soundcloud.getPlayer('soundcloudPlayer');
			this.soundcloud.api_play();

			// todo: do the callback
			return this;
		},
		pause: function() {
			this.soundcloud.api_pause();
			return this;
		},
		stop: function() {
			this.soundcloud.api_stop();
			return this;
		}
	});	

	var VimeoPlayer = Class.create(Player, {
		initialize: function() {
			console.log('*** vimeo init');
			this.vimeo = false;
			
			return this;
		},
		load: function(track) {
			// load first track to player
			var flashvars = {
				clip_id: Helper.getDataAttribute(track, 'id'),
				show_portrait: 1,
				show_byline: 1,
				show_title: 1,
				js_api: 1, // required in order to use the Javascript API
				js_onLoad: 'vimeo_player_loaded', // moogaloop will call this JS function when it's done loading (optional)
				js_swf_id: 'vimeoPlayer' // this will be passed into all event methods so you can keep track of multiple moogaloops (optional)
			};
			var params = {
				allowscriptaccess: 'always',
				allowfullscreen: 'true'
			};
			var attributes = {};

			// For more SWFObject documentation visit: http://code.google.com/p/swfobject/wiki/documentation
			swfobject.embedSWF("http://vimeo.com/moogaloop.swf", 'vimeoPlayer', "504", "340", "9.0.0","expressInstall.swf", flashvars, params, attributes);

			$(document).observe('fbp.player:vimeoready', this.handleLoaded.bind(this));

			return this;
		},
		play: function($super, track) {
			console.log('* vimeo play request');

			if (track) {
				console.log('* loading a vimeo track');
				this.load(track);
			}
			else {
				// just play
				this.vimeo.api_play();
			}
			
			return $super.play();
		},
		handleLoaded: function(evt) {
			this.vimeo = $('vimeoPlayer');
			
			// subscribe to player events
			this.vimeo.api_addEventListener('onFinish', 'vimeo_on_finish');
			this.vimeo.api_addEventListener('onPlay', 'vimeo_on_play');
			this.vimeo.api_addEventListener('onPause', 'vimeo_on_pause');
			
			this.vimeo.api_play();
			return this;
		},
		pause: function() {
			this.vimeo.api_pause();
			return this;
		},
		stop: function() {
			this.vimeo.api_stop();
			return this;
		}
	});	

	
	/* Enumerable playlist object */
	var Playlist = Class.create({
		initialize: function(playlist, wrapper) {
			this.playlist = $(playlist),
			this.wrapper  = $(wrapper),
			this.array    = [];
			this.list     = [];
			this.last     = false;
			this.current  = 0;
			this.filter   = {
				type: [],	// 'soundcloud','fb','vimeo','youtube'
				uid:  []	// userids to block
			}
			
			$(document).observe('fbp.playlist:controlEvent', this.handleControlEvents.bind(this));
			$(document).observe('fbp.playlist:playerEvent', this.handlePlayerEvents.bind(this));
		},
		push: function(el) {
			this.array.push(el);
			return this;
		},
		setFilter: function(k, v) {
			this[k].push(v);
			this.doFilter();
			return this;
		},
		doFilter: function() {
			var playlist = this.playlist.remove();
			
			this.playlist.childElements().each(function(track){
				// uid filtering
				// take all users that posted the video, and see if all posters are blocked, if so remove the element 
				if (track.findChildElements('a .user').pluck('name').intersect(this.filter.uid).length === this.filter.uid.length) {
					track.remove();
				}
				// type filtering
				if (this.filter.type.include(Helper.getDataAttribute(track, 'type'))) {
					track.remove();
				}
			}.bind(this));
			
			this.wrapper.update(playlist);
			return this;
		},
		sortBy: function(track) {
			// if you need the list sorted by something else, 
			// put a new function on the instance
			// todo
			// return track.getCreatedTime();
			return 1;
		},
		resetFilter: function() {
			this.filter = {type: [], uid: []};
		},
		play: function(track) {
			$(document).fire('fbp.player:play', {track: this.current, last: this.last});
			return this;
		},
		pause: function() {
			$(document).fire('fbp.player:pause', {track: this.current});
			return this;
		},
		previous: function() {
			var previous = false;
			
			if (this.current) {
				previous  = this.current.previous();
				this.last = this.current;
			}
			
			if (previous) {
				this.current = previous;
				this.current.addClassName('playing');
				this.play(this.current);
			}

			$(document).fire('fbp.ui:playlistEvent', {'event': 'move', track: this.current, last: this.last});

			return this;
		},
		forward: function() {
			var next = false;
			
			if (this.current) {
				next = this.current.next();
				this.last = this.current;
			}
			
			if (next) {
				this.current = next;
				this.play(this.current);
			}
			
			$(document).fire('fbp.ui:playlistEvent', {'event': 'move', track: this.current, last: this.last});

			return this;
		},
		render: function() {
			var playlist = this.playlist.remove(),	// detach from DOM before we get crazy
			
				trackTemplate = new Template('<li class="track" data-type="#{type}" data-provider="#{provider}" data-id="#{id}"><a class="track" name="#{id}" href="#!#{id}">#{title}</a>#{users}#{groups}</li>');

			this.array.each(function(track){
				this.playlist.insert(this.trackTemplate.evaluate(track));
			}.bind({playlist: playlist, trackTemplate: trackTemplate}));

			this.current = playlist.firstDescendant();

			this.wrapper.update(this.playlist);
			this.playlist.on('click', 'a', this.handleClicked.bind(this));
			return this;
		},
		handleClicked: function(evt, el) {
			var ul, previous;
			if (el.hasClassName('track')) {
				if (this.last) {
					this.last = this.current;
				}
				this.current = el.up('li');
				
				$(document).fire('fbp.ui:playlistEvent', {'event': 'move', track: this.current, last: this.last});

				this.play(this.current);
			}
			else if (el.hasClassName('user')) {
				this.setFilter('uid', el.name);
			}
			else if (el.hasClassName('group')) {
				
			}
			
			return this;
		},
		handleControlEvents: function(evt) {
			var action = evt.memo.action;
			
			console.log('handleControlEvents ['+action+']');
			
			if (['play','previous','forward','pause'].include(action)) {
				$(document).fire('fbp.ui:playlistEvent', {'event': 'move', track: this.current, last: null});
				return this[action]();
			}
			
			return false;
		},
		handlePlayerEvents: function(evt) {
			var event = evt.memo.event;
			console.log('handlePlayerEvents ['+event+']');
			
			switch (event) {
				case 'ended':
					$(document).fire('fbp.playlist:controlEvent', {action: 'forward'});
					break;
				default:
					$(document).fire('fbp.ui:playerEvent', evt.memo);
					break;
			}
		}
	});

	// 2 required callbacks for youtube, 
	// just flag the right component to do stuff
	window.youtubePlayerStateChange = function(state) {
		switch (state) {
			case 0:
				$(document).fire('fbp.playlist:playerEvent', {'event': 'ended'});
				break;
			case 1:
				$(document).fire('fbp.playlist:playerEvent', {'event': 'playing'});
				break;
			case 2:
				$(document).fire('fbp.playlist:playerEvent', {'event': 'paused'});
				break;
		}
	};
	
	window.vimeo_player_loaded = function() {
		$(document).fire('fbp.player:vimeoready');
	};
	window.vimeo_on_finish = function() {
		$(document).fire('fbp.playlist:playerEvent', {'event': 'ended'});
	};
	window.vimeo_on_play = function() {
		$(document).fire('fbp.playlist:playerEvent', {'event': 'playing'});
	};
	window.vimeo_on_pause = function() {
		$(document).fire('fbp.playlist:playerEvent', {'event': 'paused'});
	};
		
	window.onYouTubePlayerReady = function(playerId) {
		$(document).fire('fbp.player:youtubeready');
	};

	// todo: remove the global assignment
	$(document).observe('dom:loaded', function(){
		var fbp = window.fbp = new FBP(config).init();
	});
	
})({apiKey: 'a887094ee69e067634556ed01a864cc4', FB: window.FB}, window);
