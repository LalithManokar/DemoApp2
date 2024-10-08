var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var CSV = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSV)();
var csvParser = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSVParser)();
var zipper = new ($.import("/sap/tm/trp/service/xslib/zip.xsjslib").Zipper)();
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var model = $.import("/sap/tm/trp/service/model/dataprotection.xsjslib");

var mainDataService = new lib.SimpleRest(
        {
            name : "Main Data",
            desc : "download CSV",
            model: new model.mainData()
        });

mainDataService.download = function(params) {
    var data, downloadCSVProc;
    // get main data
    try {
        downloadCSVProc = new proc.procedure("_SYS_BIC", "sap.tm.trp.db.dataprotectionprivacy/cv_user_maindata_download/proc");
        data = downloadCSVProc(params.obj.userName, params.obj.timeZoneSet).VAR_OUT;
    } catch (e) {
        logger.error("MAIN_DATA_GET_DOWNLOAD_DATA_FAILED", e);
        throw new lib.InternalError(messages.MSG_ERROR_MAIN_DATA_DOWNLOAD, e);
    }
    
    // Export as CSV
    try {
        var fileInfo = constants.DATA_PROTECTION_AND_PRIVACY_CSV_FILES.MAIN_DATA;
        zipper.addFile(fileInfo.FILENAME, CSV.createFromAssociativeObjects(
                data, fileInfo.COLUMNS).toCSV(csvParser.LINE_SEPARATOR_UNIX,
                ","));
        // Here some manual override has to be done, not responding via RailXS
        $.response.status = $.net.http.OK;
        $.response.contentType = "application/zip";
        $.response.headers.set("Content-Disposition",
                "attachment; filename = \"main_data_" + params.obj.userName + ".zip\"");
        $.response.setBody(zipper.createZip());
    } catch (e) {
        logger.error("MAIN_DATA_DOWNLOAD_FAILED", params.id, e);
        throw new lib.InternalError(messages.MSG_ERROR_MAIN_DATA_DOWNLOAD, e);
    }
};

mainDataService.setRoutes([ {
    method : $.net.http.GET,
    scope : "collection",
    action : "download",
    response : $.net.http.OK
}]);

try {
    mainDataService.handle();
} finally {
    logger.close();
}