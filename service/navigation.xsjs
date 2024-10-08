var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var RemoteClient = $.import("/sap/tm/trp/service/xslib/remote.xsjslib").RemoteClient;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var MSG_NAVIGATE_TO_TU_FAILED = $.import("/sap/tm/trp/service/xslib/messages.xsjslib").MSG_NAVIGATE_TO_TU_FAILED;

var nav = new lib.SimpleRest({
    name: "Navigation",
    desc: "Provide navigation feature",
});

const TU_TYPE = "1122";

nav.TU = function(params) {
    var result;
    // FIXME: it's simple solution, need to convert IETF to SAP language code
    var lang = $.request.language.slice(0, 2).toUpperCase();
    var settings = {
        url : "/sap/bc/rest_trp/geturl",
        method : $.net.http.POST,
        data : {
            URL: {
                TOR_ID: params.id,
                TM_TYPE: TU_TYPE,
                LCODE: lang
            }
        },
        success : function(data) {
            try {
                result = data;
            } catch (e) {
                logger.error("NAVIGATE_TO_TU_FAILED", params.id, TU_TYPE, lang, e);

                throw new lib.InternalError(MSG_NAVIGATE_TO_TU_FAILED, e);
            }
        },
        error : function(data) {
            logger.error("NAVIGATE_TO_TU_FAILED", params.id, TU_TYPE, lang, data);

            throw new lib.InternalError(MSG_NAVIGATE_TO_TU_FAILED, data);
        }
    };

    var remote = new RemoteClient();
    remote.request(settings);

    return result;
};

nav.setRoutes([{
    method: $.net.http.GET,
    scope: "member",
    action: "TU"
}]);

nav.setFilters([{
    filter: function(params) {
        var privilege = "sap.tm.trp.service::NavigateToTM";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("NAVIGATE_TO_TU_NOT_AUTHORIZED", privilege);
            throw new lib.NotAuthorizedError(privilege);
        }

        return true;
    },
    only: ["TU"]
}]);

try {
    nav.handle();
} finally {
    logger.close();
}