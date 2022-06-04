myVaultUrl = "https://vault.digitalmzx.net/rss.xml";
myMaxAge = 30;
mySeenFile = "./seen.dat";

const Parser = require('rss-parser');
const parser = new Parser();
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

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
	feed.items.forEach(item => {
		var posted = new Date(item.isoDate);
		age = (today - posted)/86400000; // difference will be in milliseconds, we want days.
		if (age < myMaxAge) {
			seenToken = item.title + ":" + item.link;
			if (!seenData.includes(seenToken)) {
				console.log(item.title + "@" + age + ":" + item.link);
				seenData.push(seenToken);
			}
		}
	});
	try {
		await writeFile(mySeenFile, seenData.join("\n"));
	} catch (e) {
		console.error(e);
	}
}


read_vault();
