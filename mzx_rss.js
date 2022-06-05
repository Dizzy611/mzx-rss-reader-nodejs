
require("./config_new.js");
// Load feed classes
let FeedModule = require("./feed.js")

// Instantiate feeds based on config
feeds = [];
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

// Create and initialize discord botclient
const Discord = require('discord.js');
const client = new Discord.Client();

async function feed_check() {
	console.log(`Checking feeds`);
	for (feed in feeds) {
		await feeds[feed].check();
	}
}

async function queue_send() {
	console.log(`Checking for waiting messages`);
	for (feed in feeds) {
		for (channelnum in feeds[feed].channels) {
			let feedChannel = feeds[feed].channels[channelnum];
			let myChannel = client.channels.cache.find(channel => channel.name === feedChannel);
			for (const item in feeds[feed].queue) {
				myChannel.send(feeds[feed].queue[item]);
			}
		}
		feeds[feed].clear_queue();
	}
}


// Discord callbacks
client.on('ready', async () => { 
	console.log(`Logged in as ${client.user.tag}!`);
	console.log(`Doing initial feed check`);
	await feed_check();
	console.log(`Sending queued messages`);
	await queue_send();
	console.log(`Setting up timer to check for new feed entries`);
	let interval = setInterval(queue_send, 30*1000);
	console.log(`Initialization Complete`);
});

let interval = setInterval(feed_check, 60*1000);


// Run botclient
client.login(token);

