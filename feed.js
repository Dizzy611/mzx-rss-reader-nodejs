// Load Request-Promise
const Request = require('request-promise');

// Load JSSoup
const Soup = require('jssoup').default;

// Create and initialize global RSS parser
const Parser = require('rss-parser');
const parser = new Parser();

// Create and initialize filesystem support needed for "seen" file
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

class SeenData {

	constructor(file) {
		this.data = [];
		this.file = file;
	}

	async load() {
		try {
			let seenData = await readFile(this.file, 'utf8');
			this.data = seenData.split("\n");
		} catch (e) {
			console.error(e);
			this.data = [];
		}
	}

	async write() {
		try {
			await writeFile(this.file, this.data.join("\n"));
		} catch (e) {
			console.error(e);
		}
	}

	async check(token) {
		await this.load();
		return this.data.includes(token)
	}

	async add(token) {
		this.data.push(token);
		await this.write();
	}

}

class Feed {
	constructor(url, channels, maxage, seenfile) {
		this.url = url;
		this.channels = channels;
		this.maxage = maxage;
		this.queue = [];
		this.seen = new SeenData(seenfile);
	}
}

class VaultFeed extends Feed {
	constructor(url, channels, maxage, seenfile, approved) {
		super(url, channels, maxage, seenfile);
		this.approved = approved;
	}

	format_review(title, link) {
		let spacesplit = title.split(" wrote a review for ");
		let author = spacesplit.shift();
		let rest = spacesplit.join(" wrote a review for ");

		let retVal = "***" + author + "*** wrote a review for " + rest + " " + link;
		return(retVal);

	}

	format_release(title, link) {
		let author = "Unknown";
		if (title.includes(" by ")) {
			let authorsplit = title.split(" by ");
			author = authorsplit.pop();
			title = authorsplit.join(" by "); // Might be wrong
		} else {
			if (link === "https://digitalmzx.com") {
				author = "MegaZeux Team";
			} else {
				author = "Unknown";
			}
		}
		let header = "";
		if (this.approved) {
			header = "**New on DigitalMZX**";
		} else {
			header = "**For Approval**";
		}
		let retVal = header + title + " by ***" + author + "*** " + link;
		return(retVal);
	}

	format(title, link, isReview) {
		if (isReview) {
			return this.format_review(title, link);
		} else {
			return this.format_release(title, link);
		}
	}

	async check() {
		let today = new Date();
		let feed = await parser.parseURL(this.url);
		for (const item of feed.items) {
			let posted = new Date(item.isoDate);
			let age = (today - posted)/86400000; // difference will be in milliseconds, we want days.
			if (age < this.maxage) {
				let seenToken = item.title + ":" + item.link;
				let seen = await this.seen.check(seenToken);
				if (!seen) {
					if (item.link.includes("review")) {
						this.queue.push(this.format(item.title, item.link, true));
					} else {
						this.queue.push(this.format(item.title, item.link, false));
					}
					await this.seen.add(seenToken);
				}
			}
		}
	}

}


class IssueFeed extends Feed {
	constructor(url, channels, maxage, seenfile, requests) {
		super(url, channels, maxage, seenfile);
		this.requests = requests;
	}

	format(title, link) {
		if (this.requests) {
			return("**New Feature Request**: " + title + " " + link);
		} else {
			return("**New Bug Report**: " + title + " " + link);
		}
	}

	async check() {
		let today = new Date();
		let feed = await parser.parseURL(this.url);
		for (const item of feed.items) {
			let posted = new Date(item.isoDate);
			let age = (today - posted)/86400000; // difference will be in milliseconds, we want days.
			if (age < this.maxage) {
				let regex = /\?s=.+&app/gi;
				item.link = item.link.replace(regex, "?app");
				let seenToken = item.title + ":" + item.link;
				let seen = await this.seen.check(seenToken);
				if (!seen) {
					this.queue.push(this.format(item.title, item.link));
					await this.seen.add(seenToken);
				}
			}
		}
	}

}

class ThreadFeed extends Feed {

	constructor(url, channels, maxage, seenfile) {
		super(url, channels, maxage, seenfile);
	}

	async format(title, link) {
		let author = await this.author(link);
		return("**New Thread**: " + title + " by ***" + author + "*** " + link);
	}

	async author(link) {
		const options = {
			method: `GET`
			,json: false
			,uri: link
		};
		let threadhtml = await Request(options);
		let threadsoup = new Soup(threadhtml);
		return threadsoup.findAll("span", "author")[0].nextElement.text;
	}

	async check() {
		let today = new Date();
		let feed = await parser.parseURL(this.url);
		for (const item of feed.items) {
			let posted = new Date(item.isoDate);
			let age = (today - posted)/86400000; // difference will be in milliseconds, we want days.
			if (age < this.maxage) {
				let seenToken = item.title + ":" + item.link;
				let seen = await this.seen.check(seenToken);
				if (!seen) {
					let message = await this.format(item.title, item.link);
					this.queue.push(message);
					await this.seen.add(seenToken);
				}
			}
		}
	}

}

module.exports = {
	Feed : Feed,
	VaultFeed : VaultFeed,
	IssueFeed : IssueFeed,
	ThreadFeed : ThreadFeed
}

