
const Request = require("request-promise");
const Soup = require('jssoup').default;

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

async function doathing() {
	retval = await get_thread_author("https://www.digitalmzx.net/forums/index.php?showtopic=15779");
	console.log(retval);
}

doathing();
