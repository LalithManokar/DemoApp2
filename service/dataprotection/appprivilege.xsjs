var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var CSV = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSV)();
var csvParser = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSVParser)();
var zipper = new ($.import("/sap/tm/trp/service/xslib/zip.xsjslib").Zipper)();
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var model = $.import("/sap/tm/trp/service/model/dataprotection.xsjslib");

var appPrivilegeService = new lib.SimpleRest(
        {
            name : "Application Privileges",
            desc : "download CSV",
            model: new model.appPrivilege()
        });

appPrivilegeService.download = function(params) {
    var data, downloadCSVProc;
    var dataErrMsg = "APP_PRIVILEGE_GET_DOWNLOAD_DATA_FAILED";
    // get user consent
    try {
        downloadCSVProc = new proc.procedure("_SYS_BIC", "sap.tm.trp.db.dataprotectionprivacy/cv_user_privileges/proc");
        data = downloadCSVProc(params.obj.userName).VAR_OUT;
    } catch (e) {
        logger.error(dataErrMsg, e);
        throw new lib.InternalError(messages.MSG_ERROR_APP_PRIVILEGE_DOWNLOAD, e);
    }
    
    // Export as CSV
    var exportErrMsg = "APP_PRIVILEGE_DOWNLOAD_FAILED";
    try {
        var fileInfo = constants.DATA_PROTECTION_AND_PRIVACY_CSV_FILES.APP_PRIVILEGE;
        zipper.addFile(fileInfo.FILENAME, CSV.createFromAssociativeObjects(
                data, fileInfo.COLUMNS).toCSV(csvParser.LINE_SEPARATOR_UNIX,
                ","));
        // Here some manual override has to be done, not responding via RailXS
        $.response.status = $.net.http.OK;
        $.response.contentType = "application/zip";
        $.response.headers.set("Content-Disposition",
                "attachment; filename = \"app_privilege_" + params.obj.userName + ".zip\"");
        $.response.setBody(zipper.createZip());
    } catch (e) {
        logger.error(exportErrMsg, params.id, e);
        throw new lib.InternalError(messages.MSG_ERROR_APP_PRIVILEGE_DOWNLOAD, e);
    }
};

appPrivilegeService.setRoutes([ {
    method : $.net.http.GET,
    scope : "collection",
    action : "download"
}]);

try {
    appPrivilegeService.handle();
} finally {
    logger.close();
}