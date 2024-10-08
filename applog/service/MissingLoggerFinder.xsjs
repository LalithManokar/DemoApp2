var conn = $.hdb.getConnection();

var fileIterator = conn.executeQuery(
    'SELECT * FROM "_SYS_REPO"."ACTIVE_OBJECT" WHERE OBJECT_SUFFIX IN (?, ?) AND PACKAGE_ID LIKE ?',
    "xsjs",
    "xsjslib",
    "sap.tm.trp.service%").getIterator();


function parse(content) {
    var regex = /logger.(\w+)\(\s*("[\s\S]+?\));/gm;

    return content.match(regex);
}
var candidates = [];
while(fileIterator.next()) {
    var file = fileIterator.value();
    candidates.push({
        "package": file.PACKAGE_ID,
        name: file.OBJECT_NAME + "." + file.OBJECT_SUFFIX,
        logger: parse(file.CDATA)
    });
}

var registeredKeysIter = conn.executeQuery(
    'SELECT * FROM "_SYS_REPO"."ACTIVE_CONTENT_TEXT_CONTENT" WHERE PACKAGE_ID LIKE ? AND OBJECT_SUFFIX = ?',
    "sap.tm.trp.applog%",
    "hdbtextbundle").getIterator();

var registeredKeys = [];
while (registeredKeysIter.next()) {
    registeredKeys.push(registeredKeysIter.value().TEXT_ID);
}

var loggers = candidates.filter(function(item) {
    return item.logger !== null;
}).map(function(item) {
    var link = "/sap/hana/ide/editor/index.html?startURI=" + item["package"].replace(/\./g, "/") + "/" + item.name;
    var regex = /logger\.\w+\(\s*"([A-Z_]+)"[\s\S]*\);?/m;

    return {
        shortcut: link,
        name: item.name,
        findings: item.logger.map(function(itm) {
            regex.lastIndex = 0;
            var match = regex.exec(itm);
            return match[1];
        })
    };
});



function format(files) {
    return files.map(function(logger) {
        return '<h3><a href="' + logger.shortcut + '" target="_blank">' + logger.name + '</a></h3>\n<table>' + logger.findings.map(function(itm) {
            var missed = registeredKeys.indexOf(itm) === -1;
            return "<tr><td><span style=\"color:" + (missed ? "red" : "black") + "\">" + itm + "</span></td></tr>";
        }).join("\n") + "</table>";
    }).join("\n");
}

conn.close();

$.response.contentType = "text/html";
$.response.setBody(format(loggers));
