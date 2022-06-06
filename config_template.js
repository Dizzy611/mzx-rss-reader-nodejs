token = "foo"; // Discord token

// for vault feeds, flag is "have these records been approved.", for issue feeds, flag is "is this a requests feed"
// for forum feeds, flag is unused

config_feeds = [
		{ "type": "vault",
	  	  "url": "https://foo/rss.xml",
		  "channels": ["bim"],
		  "max_age": 365,
		  "seen_file": "./vault_seen.dat",
		  "flag": true },

		{ "type": "vault",
		  "url": "https://foo/adminfeed.xml",
		  "channels": ["bim"],
		  "max_age": 365,
		  "seen_file": "./admin_seen.dat",
		  "flag": false },

		{ "type": "issue",
		  "url": "https://foo/forums/bar&baz=9",
		  "channels": ["bim"],
		  "max_age": 365,
		  "seen_file": "./request_seen.dat",
		  "flag": true },

		{ "type": "issue",
		  "url": "https://foo/forums/bar&baz=4",
		  "channels": ["bim"],
		  "max_age": 365,
		  "seen_file": "./bug_seen.dat",
		  "flag": false },

		{ "type": "thread",
		  "url": "https://foo/forums/bar&baz=1",
		  "channels": ["bim"],
		  "max_age": 365,
		  "seen_file": "./forum_seen.dat",
		  "flag": true }
]

