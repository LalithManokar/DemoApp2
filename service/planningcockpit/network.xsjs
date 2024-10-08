var Network = $.import("/sap/tm/trp/service/model/planningcockpit.xsjslib").Network;
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var Procedure = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib").procedure;
var Routing = $.import("/sap/tm/trp/service/routing/routing.xsjslib").Routing;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var utils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib");

var entity = new lib.SimpleRest({
    name: "Network",
    desc: "Network Service",
    model: new Network()
});

var MSG_NETWORK_REFRESH_FAILED = "MSG_NETWORK_REFRESH_FAILED";

entity.checkValid = function(params) {
    var procName, checkProc;
    var conn=$.hdb.getConnection();
    try {
        procName = "sap.tm.trp.db.planningcockpit::p_get_network_valid_flag_by_simulation_scenario_id";
        checkProc = conn.loadProcedure("SAP_TM_TRP", procName);
        
        //Handling undefined error for $.hdb changes
        params.obj.SIMULATION_PLAN_ID = params.obj.SIMULATION_PLAN_ID===undefined?null:params.obj.SIMULATION_PLAN_ID;
        params.obj.SCENARIO_ID = params.obj.SCENARIO_ID===undefined?null:params.obj.SCENARIO_ID;
        
        var validFlag = checkProc(params.obj.SIMULATION_PLAN_ID, params.obj.SCENARIO_ID).VALID_FLAG;

        return {
            validStatus : validFlag !== 'X'
        };
    } catch(e) {
    	logger.error("NETWORK_CHECK_VALID_FAILED", params, e);

    	throw new lib.InternalError(messages.MSG_NETWORK_CHECK_VALID_FAILED, e);
    }
    conn.close();
};

entity.refresh = function(params) {
    var conn;
    try {
        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);

        var getNetworkCode = conn.loadProcedure("SAP_TM_TRP",
                "sap.tm.trp.db.planningcockpit::p_get_networkcode_by_simulation_scenario_id");
                
        //Handling undefined error for $.hdb changes
        params.obj.SIMULATION_PLAN_ID = params.obj.SIMULATION_PLAN_ID===undefined?null:params.obj.SIMULATION_PLAN_ID;
        params.obj.SCENARIO_ID = params.obj.SCENARIO_ID===undefined?null:params.obj.SCENARIO_ID;

        var networkCode = getNetworkCode(params.obj.SIMULATION_PLAN_ID, params.obj.SCENARIO_ID).NETWORK_CODE;
        logger.info("NETWORK_QUERY_NETWORK_CODE_SUCCEED",
                params.obj.SIMULATION_PLAN_ID,
                params.obj.SCENARIO_ID,
                networkCode);

        var routing = new Routing(conn);

        var result = routing.refreshNetwork(networkCode, params.obj.SIMULATION_PLAN_ID);

        if (result.RETURN_CODE !== 0) {
            throw new lib.InternalError(MSG_NETWORK_REFRESH_FAILED, result);
        }

        logger.success("NETWORK_REFRESH_SUCCEED",
                result.RETURN_CODE,
                result.ID,
                result.MESSAGE,
                result.LOG);

        conn.commit();
    } catch (e) {
        conn.rollback();
        logger.error("NETWORK_REFRESH_FAILED", e, params);

        if (e instanceof lib.WebApplicationError) {
            throw e;
        }

        throw new lib.InternalError(MSG_NETWORK_REFRESH_FAILED, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

entity.setRoutes([
    {
        method: $.net.http.PUT,
        scope: "collection",
        action: "refresh",
        response: $.net.http.NO_CONTENT
    },{
        method: $.net.http.GET,
        scope: "collection",
        action: "checkValid"
    }
]);

entity.setFilters({
    filter: function(){
        var privilege = "sap.tm.trp.service::RefreshNetwork";

        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                "NETWORK_REFRESH_UNAUTHORIZED",
                privilege
            );

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["refresh"]
},{
	filter:function(params){
		var planId=params.obj.SIMULATION_PLAN_ID;
		utils.checkSimulationPlanLock(planId);
		return true;
	},
	only:['refresh']
});

try {
    entity.handle();
} finally {
    logger.close();
}
