
require("./config.js");


// Load Request-Promise
const Request = require('request-promise');
	
// Load JSSoup
const Soup = require('jssoup').default;


// Create and initialize global RSS parser
const Parser = require('rss-parser');
const parser = new Parser();

// Create and initialize discord botclient
const Discord = require('discord.js');
const client = new Discord.Client();

// Create and initialize filesystem support needed for "seen" file
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

let mzxItemQueue = [];
let mzxDevItemQueue = [];

// Utility functions

function format_review(title, link) {
	var spacesplit = title.split(" ");
	var author = spacesplit.shift();
	var rest = spacesplit.join(" ");
	return("***" + author + "*** " + rest + " " + link);
}

function format_release(title, link) {
	if (title.includes(" by ")) {
		var authorsplit = title.split(" by ");
		author = authorsplit.pop();
		title = authorsplit.join(" by "); // Might be wrong
	} else {
		if (link === "https://digitalmzx.net") {
			author = "MegaZeux Team";
		} else {
			author = "Unknown";
		}
	}
	return("**New on DigitalMZX**: " + title + " by ***" + author + "*** " + link);
}

async function get_thread_author(link) {
	const options = {
		method: `GET`
		,json: false
		,uri: link
	};
	var threadhtml = await Request(options);
	var threadsoup = new Soup(threadhtml);
	return threadsoup.findAll("span", "author")[0].nextElement.text;
}
	
async function format_thread(title, link) {
	author = await get_thread_author(link);
	return("**New Thread**: " + title + " by ***" + author + "*** " + link);
}

function format_issue(title, link, isRequest=false) {
	if (isRequest === false) {
		return("**New Bug Report**: " + title + " " + link);
	} else {
		return("**New Feature Request**: " + title + " " + link);
	}
}


async function load_seen() {
	try {
		var seenData = await readFile(mySeenFile, 'utf8');
		var retVal = seenData.split("\n");
	} catch (e) {
		console.error(e);
		var retVal = [];
	} finally {
		return retVal;
	}
}

async function read_vault() {
	var today = new Date();
	var feed = await parser.parseURL(myVaultUrl);
	var seenData = await load_seen();
	var messages = [];
	feed.items.forEach(item => {
		var posted = new Date(item.isoDate);
		age = (today - posted)/86400000; // difference will be in milliseconds, we want days.
		if (age < myMaxAge) {
			seenToken = item.title + ":" + item.link;
			if (!seenData.includes(seenToken)) {
				if (item.link.includes("review")) {
					messages.push(format_review(item.title, item.link));
				} else {
					messages.push(format_release(item.title, item.link));
				}
				seenData.push(seenToken);
			}
		}
	});
	try {
		await writeFile(mySeenFile, seenData.join("\n"));
	} catch (e) {
		console.error(e);
	}
	return messages;
}

async function read_issues(requests=false) {
	var today = new Date();
	if (requests === false) {
		var feed = await parser.parseURL(myBugUrl);
	} else {
		var feed = await parser.parseURL(myRequestUrl);
	}
	var seenData = await load_seen();
	var messages = [];
	feed.items.forEach(item => {
		var posted = new Date(item.isoDate);
		age = (today - posted)/86400000; // difference will be in milliseconds, we want days.
		if (age < myMaxAge) {
			var regex = /\?s=.+&app/gi;
			item.link = item.link.replace(regex, "?app");
			seenToken = item.title + ":" + item.link;
			if (!seenData.includes(seenToken)) {
				if (requests) {
					messages.push(format_issue(item.title, item.link, true));
				} else {
					messages.push(format_issue(item.title, item.link, false));
				}
				seenData.push(seenToken);
			}
		}
	});
	try {
		await writeFile(mySeenFile, seenData.join("\n"));
	} catch (e) {
		console.error(e);
	}
	return messages;
}

async function read_threads() {
	var today = new Date();
	var feed = await parser.parseURL(myForumUrl);
	var seenData = await load_seen();
	var messages = [];
	await asyncForEach(feed.items, async item => {
		var posted = new Date(item.isoDate);
		age = (today - posted)/86400000; // difference will be in milliseconds, we want days.
		if (age < myMaxAge) {
			seenToken = item.title + ":" + item.link;
			if (!seenData.includes(seenToken)) {
				var message = await format_thread(item.title, item.link);
				messages.push(message);
				seenData.push(seenToken);
			}
		}
	});
	try {
		await writeFile(mySeenFile, seenData.join("\n"));
	} catch (e) {
		console.error(e);
	}
	return messages;
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

async function feed_check() {
	console.log(`Checking feeds`);
	var messages = await read_vault();
	mzxItemQueue = mzxItemQueue.concat(messages);
	messages = await read_issues();
	mzxDevItemQueue = mzxDevItemQueue.concat(messages);
	messages = await read_threads(); 
	mzxItemQueue = mzxItemQueue.concat(messages);
}

async function queue_send(mzx, mzxdev) {
	console.log(`Checking for waiting messages`);
	mzxItemQueue.forEach(function(item){
		this.send(item);
	}, mzx);
	mzxItemQueue = [];
	mzxDevItemQueue.forEach(function(item){
		this.send(item);
	}, mzxdev);
	mzxDevItemQueue = [];
}


// Discord callbacks
client.on('ready', async () => { 
	console.log(`Logged in as ${client.user.tag}!`);
	console.log(`Finding mzx...`);
	var mzx = client.channels.find(channel => channel.name === "mzx");
	console.log(`Found` + mzx);
	console.log(`Finding mzx-development...`);
	var mzxdev = client.channels.find(channel => channel.name === "mzx-development");
	console.log(`Found` + mzxdev);
	console.log(`Doing initial feed check`);
	await feed_check();
	console.log(`Checking for initial feed entries`);
	await queue_send(mzx, mzxdev);
	console.log(`Setting up timer to check for new feed entries`);
	var interval = setInterval(queue_send, 60*1000, mzx, mzxdev);
	console.log(`Initialization Complete`);
});

var interval = setInterval(feed_check, 300*1000);


// Run botclient
client.login(myToken);

