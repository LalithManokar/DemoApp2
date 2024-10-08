var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var Route = ($.import('/sap/tm/trp/service/model/planningcockpit.xsjslib')).Route;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var Procedure = ($.import('/sap/tm/trp/service/xslib/procedures.xsjslib')).procedure;
var utils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib");

var entity = new lib.SimpleRest({
    name: "Routes",
    desc: "Routes",
    model: new Route()
});

entity.query = function(params) {
    var conn=$.hdb.getConnection();
    try {
        var query, result;

        if (params.obj.search_by === "filters"){
            query= conn.loadProcedure("SAP_TM_TRP", "sap.tm.trp.db.planningcockpit::p_query_route_for_map");
            
            //Handling undefined error for $.hdb changes
        params.obj.planId = params.obj.planId===undefined?null:parseInt(params.obj.planId);
        params.obj.scenarioId = params.obj.scenarioId===undefined?null:parseInt(params.obj.scenarioId);
        params.obj.FROM_LOC = params.obj.FROM_LOC===undefined?null:params.obj.FROM_LOC;
        params.obj.TO_LOC = params.obj.TO_LOC===undefined?null:params.obj.TO_LOC;
        params.obj.START_TIME = params.obj.START_TIME===undefined?null:params.obj.START_TIME;
        params.obj.END_TIME = params.obj.END_TIME===undefined?null:params.obj.END_TIME;
        params.obj.X_MIN= params.obj.X_MIN===undefined?null:parseFloat(params.obj.X_MIN);
        params.obj.X_MAX = params.obj.X_MAX===undefined?null:parseFloat(params.obj.X_MAX);
        params.obj.Y_MIN = params.obj.Y_MIN===undefined?null:parseFloat(params.obj.Y_MIN);
        params.obj.Y_MAX = params.obj.Y_MAX===undefined?null:parseFloat(params.obj.Y_MAX);

            result = query({
                SIM_PLAN_ID: params.obj.planId,
                SCENARIO_ID: params.obj.scenarioId,
                FROM_LOC_NAME: params.obj.FROM_LOC,
                TO_LOC_NAME: params.obj.TO_LOC,
                START_TIME: params.obj.START_TIME,
                END_TIME: params.obj.END_TIME,
                XMIN: params.obj.X_MIN,
                XMAX: params.obj.X_MAX,
                YMIN: params.obj.Y_MIN,
                YMAX: params.obj.Y_MAX
            });

        }else{
            query= conn.loadProcedure("SAP_TM_TRP", "sap.tm.trp.db.planningcockpit::p_query_route_for_map_by_route_id");
            params.obj.planId=params.obj.planId===undefined?null:parseInt(params.obj.planId);
            params.obj.ROUTE_ID=params.obj.ROUTE_ID===undefined?null:parseInt(params.obj.ROUTE_ID);
            result = query({
                SIM_PLAN_ID: params.obj.planId,
                ROUTE_ID: params.obj.ROUTE_ID
            });
        }
        conn.commit();

        var gps;
        if (result.GPS_INFO) {
            gps = Object.keys(result.GPS_INFO).map(function(item) {
                return {
                    FROM: result.GPS_INFO[item].FROM_LOC,
                    TO: result.GPS_INFO[item].TO_LOC,
                    MTR: result.GPS_INFO[item].MTR,
                    GPS: utils.sampleArray(JSON.parse(result.GPS_INFO[item].GPS), params.obj.ZOOM_LEVEL).map(function(lane) {
                        return lane.concat(0.000).join(";");
                    })
                };
            });
        }

        if (result.MESSAGE !== "MSG_SUCCESS") {
            throw new lib.InternalError(result.MESSAGE);
        }
        conn.commit();
        return {
            ROUTES: result.ROUTES,
            ROUTE_CONNECTION: result.ROUTE_CONNECTION,
            POINTS: result.POINTS,
            GPS_INFO: gps,
            INVALID_LOCATIONS: result.OUT_LOCATIONS_XPOS_YPOS_INVALID
        };
    } catch (e) {
        logger.error("ROUTE_QUERY_FAILED", params, e);

        if (e instanceof lib.WebApplicationError) {
            throw e;
        }

        throw new lib.InternalError("MSG_ROUTE_QUERY_FAILED", e);
    }
    conn.close();
};

entity.setRoutes({
    method: $.net.http.GET,
    scope: "collection",
    action: "query"
});

entity.setFilters([{
    filter: function() {
        var privilege = "sap.tm.trp.service::GetRoute";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("ROUTE_GET_AUTHORIZE_FAILED", privilege);

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["query"]
}]);

try {
    entity.handle();
} finally {
    logger.close();
}