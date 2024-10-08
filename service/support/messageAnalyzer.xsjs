var conn = $.hdb.getConnection();

var messageIterator = conn.executeQuery(
	'SELECT * FROM "_SYS_REPO"."ACTIVE_TEXT_CONTENT" WHERE PACKAGE_ID LIKE ? AND TEXT_ID LIKE ? AND OBJECT_NAME = ?',
	'sap.tm.trp.ui%',
	'MSG%',
	'i18n'
).getIterator();

var messageItems = {};
while (messageIterator.next()) {
	var messageText = messageIterator.value().TEXT_ID;
	var content = messageIterator.value().CONTENT;
	messageItems[messageText] = [content];
}

var fileIterator = conn.executeQuery(
	'SELECT * FROM "_SYS_REPO"."ACTIVE_OBJECT" WHERE OBJECT_SUFFIX IN (?, ?, ?) AND PACKAGE_ID LIKE ?',
	"xsjs",
	"xsjslib",
	"hdbprocedure",
	"sap.tm.trp%"
).getIterator();

// parse lines in file in order to get message lines
function parse(lines) {
	var regex = /MSG_\w+/gm;

	var result = [];

	lines.forEach(function(l, num) {
		var m = l.match(regex);

		if (m) {
			result.push({
				msg: m,
				line: num + 1
			});
		}
	});

	return result;
}

while (fileIterator.next()) {
	var file = fileIterator.value();
	var cdata = file.CDATA;
	var messages = parse(((typeof cdata === "string") ? cdata : $.util.stringify(cdata)).split("\n"));
	var relatedFiles = [];
	if (messages.length > 0) {
		messages.forEach(function(message) {
			var messageInfo = message.msg[0];
			var relatedFile = {
				"package": file.PACKAGE_ID,
				name: file.OBJECT_NAME + "." + file.OBJECT_SUFFIX,
				link: "/sap/hana/xs/dt/base/file/" + file.PACKAGE_ID.replace(/\./g, "/") + "/" + file.OBJECT_NAME + "." + file.OBJECT_SUFFIX,
				line: message.line
			};
			// check if the message exists in db
			if (!messageItems.hasOwnProperty(messageInfo)) {
				messageItems[messageInfo] = [''];
				relatedFile.isExistInDB = false;
			} else {
				relatedFile.isExistInDB = true;
			}

			messageItems[messageInfo].push(relatedFile);
		});
	}
}

conn.close();

var body = '';

function format(items) {
	var sortableItems = [];
	// convert object into an array in order to sort by file count
	for (var text in items) {
		sortableItems.push([text, items[text]]);
	}
	// sort items
	sortableItems.sort(function(a, b) {
		return b[1].length - a[1].length;
	});

	var title = '<h2><a href="#overview">Overview</a>&nbsp;&nbsp;<a href="#details">Details</a></h2>';

	var notes =
		'<h4><i style="padding-right:15px">NOTES:</i><div style="display:inline-block;background-color:yellow;">MESSAGE_TEXT</div> means text appears in file but doesn\'t exist in db&nbsp;&nbsp;&nbsp<div style="display:inline-block"><i>MESSAGE_TEXT</i></div> means text exists in db but never used</h4>';

	// index
	var messageIndex = '<table><a name="overview"/><tr><th>MessageText</th><th>Content</th><th>Count</th></tr>';
	messageIndex += sortableItems.map(function(msg) {
		var content = msg[1][0];
		var count = msg[1].length - 1;
		var style = (count === 0 || msg[1][1].isExistInDB) ? '' : 'style=" background-color: yellow"';
		return '<tr><td ' + style + '><a href="#' + msg[0] + '"/>' + msg[0] + '</td><td>' + content + '</td><td>' + count + '</td>';
	}).join('\n') + '</table>';
	body += title + notes + messageIndex;

	// details
	body += '<h2><a name="details">Details</h2>';
	body += sortableItems.map(function(msg) {
		var count = msg[1].length - 1;
		if (count === 0) {
			return '<p><i>' + msg[0] + '</i></p>';
		}
		var index = sortableItems.indexOf(msg) + 1;
		var style = msg[1][1].isExistInDB ? '' : 'style=" background-color: yellow"';
		return '<h3 ' + style + '><a name="' + msg[0] + '"/>' + index + '.&nbsp' + msg[0] + '</h3><h4><table>' + msg[1].map(function(file) {
			if (typeof file === 'string') {
				return '';
			}
			return '<tr><td>' + file.package + '</td><td><a href="' + file.link + '" target="_blank">' + file.name + '</a></td><td>' + file.line +
				'</td></tr>';
		}).join('\n') + '</table></h4>';
	}).join('\n');
	return body;
}

$.response.contentType = "text/html";
$.response.setBody(format(messageItems));
