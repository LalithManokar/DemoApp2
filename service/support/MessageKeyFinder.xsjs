var conn = $.hdb.getConnection();

var fileIterator = conn.executeQuery(
    'SELECT * FROM "_SYS_REPO"."ACTIVE_OBJECT" WHERE OBJECT_SUFFIX IN (?, ?, ?) AND PACKAGE_ID LIKE ?',
    "xsjs",
    "xsjslib",
    "hdbprocedure",
    "sap.tm.trp%").getIterator();


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

var candidates = [];
while(fileIterator.next()) {
    var file = fileIterator.value();
    var cdata = file.CDATA
    var messages = parse(((typeof cdata === "string") ? cdata : $.util.stringify(cdata)).split("\n"));

    if (messages.length > 0) {
        candidates.push({
            "package": file.PACKAGE_ID,
            name: file.OBJECT_NAME + "." + file.OBJECT_SUFFIX,
            link: "/sap/hana/xs/dt/base/file/" + file.PACKAGE_ID.replace(/\./g, "/") + "/" + file.OBJECT_NAME + "." + file.OBJECT_SUFFIX,
            findings: messages
        });
    }
}
conn.close();

function format(files) {
    return files.map(function(msg) {
        return '<h3><i>' + msg.package + '</i><br><a href="' + msg.link + '" target="_blank">' + msg.name + '</a></h3><table>' + msg.findings.map(function(itm) {
            return "<tr><td>" + itm.msg + "</td><td>" + itm.line + "</td></tr>";
        }).join("\n") + "</table>";
    }).join("\n");
}


$.response.contentType = "text/html";
$.response.setBody(format(candidates));