var DepartureRule = $.import("/sap/tm/trp/service/model/planningcockpit.xsjslib").DepartureRule;
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var Procedure = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib").procedure;
var Routing = $.import("/sap/tm/trp/service/routing/routing.xsjslib").Routing;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var utils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib");

var MSG_DEPARTURE_RULE_CREATE_FAILED = "MSG_DEPARTURE_RULE_CREATE_FAILED";
var MSG_DEPARTURE_RULE_DELETE_FAILED = "MSG_DEPARTURE_RULE_DELETE_FAILED";

var entity = new lib.SimpleRest({
    name: "Departure Rule",
    desc: "Departure Rule Service",
    model: new DepartureRule()
});

entity.create = function(params) {
    var conn;
    try {
        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);

        var routing = new Routing(conn);
        var result = routing.createDepartureRule(
                params.obj.PATH_ID,
                params.obj.CYCLE_TYPE,
                params.obj.PATTERN,
                params.obj.DEPARTURE_TIME,
                params.obj.TIMEZONE);

        if (result.RETURN_CODE !== 0) {
            throw new lib.InternalError(MSG_DEPARTURE_RULE_CREATE_FAILED, result);
        }

        logger.success("DEPARTURE_RULE_CREATE_SUCCEED",
                result.RETURN_CODE,
                result.RULE_NUMBER,
                result.MESSAGE,
                result.LOG);

        conn.commit();

        return {
            ID: result.RULE_NUMBER
        };
    } catch(e) {
        conn.rollback();
        logger.error("DEPARTURE_RULE_CREATE_FAILED", e, params);

        if (e instanceof lib.WebApplicationError) {
            throw e;
        }

        throw new lib.InternalError(MSG_DEPARTURE_RULE_CREATE_FAILED, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }

};

// a batch delete on given RULE ID
entity.delete = function(params) {
    var conn;
    var message;
    var log;
    try {
        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);

        var routing = new Routing(conn);

        var result = routing.deleteDepartureRules(params.obj.PATH_ID, params.obj.RULE_NUMBERS);

        if (result.RETURN_CODE !== 0) {
            throw new lib.InternalError(MSG_DEPARTURE_RULE_DELETE_FAILED, result);
        }

        log = result.LOG;
        message = result.MESSAGE;

        result = routing.refreshRouteOnTripGenerated(Number(params.obj.SIMULATION_PLAN_ID),
            Number(params.obj.SCENARIO_ID), Number(params.obj.PATH_ID));

        if (result.RETURN_CODE === 0) {
            result.MESSAGE.concat(message);
            result.LOG.concat(log);
        } else {
            throw new lib.InternalError(MSG_VOYAGE_GENERATE_FAILED, result);
        }

        logger.success("DEPARTURE_RULE_DELETE_SUCCEED",
                result.RETURN_CODE,
                result.ID,
                result.MESSAGE,
                result.LOG);

        conn.commit();
    } catch (e) {
        conn.rollback();
        logger.error("DEPARTURE_RULE_DELETE_FAILED", e, params);

        throw new lib.InternalError(MSG_DEPARTURE_RULE_DELETE_FAILED, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

entity.setFilters({
    filter: function(){
        var privilege = "sap.tm.trp.service::CreateDepartureRule";

        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                "DEPARTURE_RULE_CREATE_UNAUTHORIZED",
                privilege
            );

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["create"]
},{
    filter: function(){
        var privilege = "sap.tm.trp.service::DeleteDepartureRule";

        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                "DEPARTURE_RULE_DELETE_UNAUTHORIZED",
                privilege
            );

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["delete"]
},{
	filter:function(params){
		var planId=params.obj.SIMULATION_PLAN_ID;
		utils.checkSimulationPlanLock(planId);
		return true;
	},
	only:['create']
});

try {
    entity.handle();
} finally {
    logger.close();
}
