var InternalError = ($.import("/sap/tm/trp/service/xslib/railxs.xsjslib")).InternalError;
var NotAuthorizedError = ($.import("/sap/tm/trp/service/xslib/railxs.xsjslib")).NotAuthorizedError;
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var RemoteClient = $.import("/sap/tm/trp/service/xslib/remote.xsjslib").RemoteClient;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var pathPrefix = "/sap/bc/rest_trp/trq";
var Procedure = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib').Procedure;

function createTRQ(trqsTM, scenarioId) {
    var trqs = [];

    var settings = {
        url : pathPrefix,
        method : $.net.http.POST,
        data : trqsTM,
        success : function(obj) {
            trqs = obj.TU_RET;

            logger.success("FINALIZE_TRQ_CREATED_SUCCESS", scenarioId);
        },
        error : function(response) {
            logger.error("FINALIZE_TRQ_CREATE_FAILED", scenarioId);

            if (response.status === $.net.http.UNAUTHORIZED) {
                throw new NotAuthorizedError(messages.MSG_FINALIZE_TRQ_NON_AUTHORIZE);
            } else if (response.status === $.net.http.INTERNAL_SERVER_ERROR || response.status === $.net.http.BAD_REQUEST){
                var result = JSON.parse(response.body.asString());

                throw new InternalError(messages.MSG_FINALIZE_FAILURE, result);
            }
        }
    };

    var remote = new RemoteClient();
    remote.request(settings);

    return trqs;
}