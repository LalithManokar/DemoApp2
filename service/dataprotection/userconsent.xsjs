var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var CSV = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSV)();
var csvParser = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSVParser)();
var zipper = new ($.import("/sap/tm/trp/service/xslib/zip.xsjslib").Zipper)();
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var model = $.import("/sap/tm/trp/service/model/dataprotection.xsjslib");

var userConsentService = new lib.SimpleRest(
        {
            name : "user consent",
            desc : "download CSV",
            model: new model.userConsent()
        });

userConsentService.download = function(params) {
    var data, downloadCSVProc;
    // get user consent
    try {
        downloadCSVProc = new proc.procedure("_SYS_BIC", "sap.tm.trp.db.dataprotectionprivacy/cv_user_consent_download/proc");
        data = downloadCSVProc(params.obj.userName, params.obj.timeZoneSet).VAR_OUT;
    } catch (e) {
        logger.error("USER_CONSENT_GET_DOWNLOAD_DATA_FAILED", e);
        throw new lib.InternalError(messages.MSG_ERROR_USER_CONSENT_DOWNLOAD, e);
    }
    
    // Export as CSV
    try {
        var fileInfo = constants.DATA_PROTECTION_AND_PRIVACY_CSV_FILES.USER_CONSENT;
        zipper.addFile(fileInfo.FILENAME, CSV.createFromAssociativeObjects(
                data, fileInfo.COLUMNS).toCSV(csvParser.LINE_SEPARATOR_UNIX,
                ","));
        // Here some manual override has to be done, not responding via RailXS
        $.response.status = $.net.http.OK;
        $.response.contentType = "application/zip";
        $.response.headers.set("Content-Disposition",
                "attachment; filename = \"user_consent_" + params.obj.userName + ".zip\"");
        $.response.setBody(zipper.createZip());
    } catch (e) {
        logger.error("USER_CONSENT_DOWNLOAD_FAILED", params.id, e);
        throw new lib.InternalError(messages.MSG_ERROR_USER_CONSENT_DOWNLOAD, e);
    }
};

userConsentService.setRoutes([ {
    method : $.net.http.GET,
    scope : "collection",
    action : "download",
    response : $.net.http.OK
}]);

try {
    userConsentService.handle();
} finally {
    logger.close();
}