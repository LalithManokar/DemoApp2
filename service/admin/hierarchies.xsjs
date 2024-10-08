var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var model = $.import("/sap/tm/trp/service/model/user.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var handler = $.import("/sap/tm/trp/service/leasecontract/materializedViewHandler.xsjslib");
var RemoteClient = $.import("/sap/tm/trp/service/xslib/remote.xsjslib").RemoteClient;
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");

var hierarchy = new lib.SimpleRest({
    name: "Hierarchy",
    desc: "Hierarchy Service",
    model: new model.Hierarchy()
});

var notifier = new handler.MaterializedViewNotifier(handler.SOURCE.LOCATION);

var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE = constants.SP_PKG_LOC;

var pathPrefix = "/sap/bc/rest_trp/regions";

function buildRequestBody(obj) {
    return JSON.stringify({
        REGION: obj
    });
}

hierarchy.update = function(params) {
    var remote = new RemoteClient();

    remote.request({
        url : pathPrefix,
        method : $.net.http.PUT,
        data : buildRequestBody(params.obj),
        success : function() {
            try {
                (new proc.procedure(SCHEMA, 'sap.tm.trp.db.systemmanagement.location::p_update_root_for_hierarchy'))();

                notifier.notify(params.id,-1,handler.ACTION.UPDATE);
                logger.success("HIERARCHY_UPDATED",params.id);
            } catch (e) {
                throw new lib.InternalError(messages.MSG_ERROR_UPDATE_HIERARCHY, e);
            }
        },
        error : function(response) {
            logger.error("HIERARCHY_UPDATE_FAILED", params.id, response);

            throw new lib.InternalError(messages.MSG_ERROR_UPDATE_HIERARCHY, response.body ? response.body.asString() : "MSG_SERVER_ERROR");
        }
    });
};

hierarchy.sync = function() {
    // synchronize hierarchy with TM
    try {
        var procName = "sap.tm.trp.db.systemmanagement.location::p_update_root_for_hierarchy";
        var syncProc = new proc.procedure(constants.SCHEMA_NAME, procName);
        syncProc();
        logger.success("HIERARCHY_SYNCHRONIZED");

        return true;
    } catch(e) {
        logger.error("HIERARCHY_SYNCHRONIZE_FAILED",
            logger.Parameter.Exception(0, e));

        throw new lib.InternalError(messages.MSG_ERROR_SYNC_HIERARCHY, e);
    }
};

hierarchy.setFilters({
    filter: function() {
        var privilege = "sap.tm.trp.service::UpdateZoneHierarchy";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                    "HIERARCHY_UPDATE_AUTHORIZE_FAILED",
                    logger.Parameter.String(0, privilege));
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["update"]
},{
    filter : function(params) {
        if (params.obj.NAME === 'RELH_ZONE'){
        	lib.logger.error("HIERARCHY_UPDATE_FORBIDDEN");
            throw new lib.InternalError("MSG_HIERARCHY_UPDATE_FORBIDDEN");
        }
            return true;
    },
    only : ["update"]
});

hierarchy.setRoutes([{
    method: $.net.http.POST,
    scope: "collection",
    action: "sync",
    response: $.net.http.OK
}]);

try {
    hierarchy.handle();
} finally {
    logger.close();
}