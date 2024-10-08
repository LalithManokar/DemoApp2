var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var CSV = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSV)();
var csvParser = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSVParser)();
var zipper = new ($.import("/sap/tm/trp/service/xslib/zip.xsjslib").Zipper)();
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var model = $.import("/sap/tm/trp/service/model/dataprotection.xsjslib");

var userroleService = new lib.SimpleRest(
        {
            name : "User Roles",
            desc : "download CSV",
            model: new model.userRole()
        });

userroleService.download = function(params) {
    var data, downloadCSVProc;
    var dataErrMsg = "USER_ROLE_GET_DOWNLOAD_DATA_FAILED";
    // get user role
    try {
        downloadCSVProc = new proc.procedure("_SYS_BIC", "sap.tm.trp.db.dataprotectionprivacy/cv_user_roles/proc");
        data = downloadCSVProc(params.obj.userName).VAR_OUT;
    } catch (e) {
        logger.error(dataErrMsg, e);
        throw new lib.InternalError(messages.MSG_ERROR_USER_ROLE_DOWNLOAD, e);
    }
    
    // Export as CSV
    var exportErrMsg = "USER_ROLE_DOWNLOAD_FAILED";
    try {
        var fileInfo = constants.DATA_PROTECTION_AND_PRIVACY_CSV_FILES.USER_ROLE;
        zipper.addFile(fileInfo.FILENAME, CSV.createFromAssociativeObjects(
                data, fileInfo.COLUMNS).toCSV(csvParser.LINE_SEPARATOR_UNIX,
                ","));
        // Here some manual override has to be done, not responding via RailXS
        $.response.status = $.net.http.OK;
        $.response.contentType = "application/zip";
        $.response.headers.set("Content-Disposition",
                "attachment; filename = \"user_roles_" + params.obj.userName + ".zip\"");
        $.response.setBody(zipper.createZip());
    } catch (e) {
        logger.error(exportErrMsg, params.id, e);
        throw new lib.InternalError(messages.MSG_ERROR_USER_ROLE_DOWNLOAD, e);
    }
};

userroleService.setRoutes([ {
    method : $.net.http.GET,
    scope : "collection",
    action : "download"
}]);

try {
    userroleService.handle();
} finally {
    logger.close();
}