var File = ($.import('/sap/tm/trp/service/xslib/file.xsjslib')).File;

var conn = $.hdb.getConnection();
var htmlString = "";

function getFileStatus() {
	var activeFile = conn.executeQuery(
		'SELECT PACKAGE_ID PACKAGE,OBJECT_NAME FILENAME,OBJECT_SUFFIX EXTENSION FROM "_SYS_REPO"."ACTIVE_OBJECT" WHERE PACKAGE_ID LIKE ?',
		'sap.tm.trp%');
	var inactiveFile = conn.executeQuery(
		'SELECT PACKAGE_ID PACKAGE,OBJECT_NAME FILENAME,OBJECT_SUFFIX EXTENSION FROM "_SYS_REPO"."INACTIVE_OBJECT" WHERE PACKAGE_ID LIKE ?',
		'sap.tm.trp%');

	return {
		inactiveFile: inactiveFile,
		activeFile: activeFile
	};
}

function setFileStatus(fileMeta) {
	var name = fileMeta.FILENAME + '.' + fileMeta.EXTENSION;
	var path = '/' + fileMeta.PACKAGE.replace(/\./g, '/') + '/';
	var file = new File(name, path);
	try {
		file.activate(true);
		fileMeta.success = true;
	} catch (err) {
		fileMeta.success = err.Message;
	} finally {
		return JSON.stringify(fileMeta);
	}

}

function formatTableRow(row, status) {
	var temp = "<tr><td>" + row.PACKAGE + "</td><th>" + row.FILENAME + "." + row.EXTENSION + "</td>";
	if (status === "active") {
		temp += "<td>active</td>";
	} else {
		temp += "<td>" + "<form method='POST'><span style='background-color:red'>inactive<span></td>";
	}
	temp += "<td>" + "<form method='POST'><input style='display:none' name='active' value='" + JSON.stringify(row) +
		"'><input type='submit' value='regenerate'></form>" + "</td>";
	return temp;
}

function handleGet() {
	// Retrieve data here and return results in JSON/other format 
	function format(files) {
		var tableString = Object.keys(files.inactiveFile).map(function(key) {
			var item = files.inactiveFile[key];
			return formatTableRow(item, "inactive");
		}).join('\n');
		tableString += Object.keys(files.activeFile).map(function(key) {
			var item = files.activeFile[key];
			return formatTableRow(item, "active");
		}).join('\n');
		return tableString;
	}
	$.response.status = $.net.http.OK;
	var fileStatusList = getFileStatus();
	htmlString =
		"<h1 style='text-align:center'>FILE STATUS</h1><table style='text-align:left'><tr><th>package</th><th>file name</th><th>file status</th><th>regenerate</th></tr>" +
		format(
			fileStatusList) + "</table>";
	return htmlString;
}
//Implementation of POST call

function handlePost() {
	var bodyStr = $.request.body ? $.request.body.asString() : undefined;
	if (bodyStr === undefined) {
		$.response.status = $.net.http.INTERNAL_SERVER_ERROR;
		return "Missing BODY";
	}
	var file;
	if ((file = $.request.parameters.get('active'))) {
		return setFileStatus(JSON.parse(file));
	} else if ((file = $.request.parameters.get('inactive'))) {
		return setFileStatus(JSON.parse(file));
	}
	// Extract body insert data to DB and return results in JSON/other format
	return "error parameters\n";
}

// Request process 
function processRequest() {
	try {
		switch ($.request.method) {
			//Handle your GET calls here
			case $.net.http.GET:
				$.response.setBody(handleGet());
				break;
				//Handle your POST calls here
			case $.net.http.POST:
				$.response.setBody(handlePost() + handleGet());
				break;
				//Handle your other methods: PUT, DELETE
			default:
				$.response.status = $.net.http.METHOD_NOT_ALLOWED;
				$.response.setBody("Wrong request method");
				break;
		}
		$.response.contentType = "text/html";
	} catch (e) {
		$.response.setBody("Failed to execute action: " + e.toString());
	}
}
// Call request processing  
processRequest();