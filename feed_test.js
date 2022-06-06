require("./config_new.js")
let FeedModule = require("./feed.js")


feeds = [];

// Instantiate each feed based on config
for (feed in config_feeds) {
	let myFeed = config_feeds[feed];
	if (myFeed.type === "vault") {
		let vaultFeed = new FeedModule.VaultFeed(myFeed.url, myFeed.channels, myFeed.max_age, myFeed.seen_file, myFeed.flag);
		feeds.push(vaultFeed);
	} else if (myFeed.type === "issue") {
		let issueFeed = new FeedModule.IssueFeed(myFeed.url, myFeed.channels, myFeed.max_age, myFeed.seen_file, myFeed.flag);
		feeds.push(issueFeed);
	} else if (myFeed.type === "thread") {
		let threadFeed = new FeedModule.ThreadFeed(myFeed.url, myFeed.channels, myFeed.max_age, myFeed.seen_file, myFeed.flag);
		feeds.push(threadFeed);
	}
}

console.log(feeds);

// Test each feed
for (feed in feeds) {
	let myFeed = feeds[feed];
	(async function() {
		await myFeed.check();
		console.log(myFeed.queue);
	})();
}



