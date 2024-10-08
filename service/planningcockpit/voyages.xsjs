var Voyage = $.import("/sap/tm/trp/service/model/planningcockpit.xsjslib").Voyage;
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var Procedure = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib").procedure;
var Routing = $.import("/sap/tm/trp/service/routing/routing.xsjslib").Routing;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var utils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib");
var MSG_VOYAGE_GENERATE_FAILED = "MSG_VOYAGE_GENERATE_FAILED";
var MSG_VOYAGE_UPDATE_CAPACITY_FAILED = "MSG_VOYAGE_UPDATE_CAPACITY_FAILED";

var entity = new lib.SimpleRest({
    name: "Voyage",
    desc: "Voyage Service",
    model: new Voyage()
});

function getDatasetCode(simulationId, scenarioId, conn) {
    var conn=$.hdb.getConnection();
    var queryDatasetId = conn.loadProcedure("SAP_TM_TRP",
            "sap.tm.trp.db.planningcockpit::p_get_dataset_code_by_simulation_scenario_id");
    
    //Handling undefined error for $.hdb changes
    simulationId = simulationId===undefined?null:simulationId;
    scenarioId = scenarioId===undefined?null:scenarioId;

    var datasetCode = queryDatasetId(simulationId, scenarioId).DATASET_CODE;

    logger.info("PATH_QUERY_DATASET_ID_SUCCEED",
            simulationId, scenarioId, datasetCode);
    conn.close();
    return datasetCode;
}

entity.generate = function(params) {
    var conn;
    var log;
    var message;
    
    //Handling undefined error for $.hdb changes
    params.obj.simulationId = params.obj.simulationId===undefined?null:params.obj.simulationId;
    params.obj.scenarioId = params.obj.scenarioId===undefined?null:params.obj.scenarioId;
    params.obj.PATH_ID=params.obj.PATH_ID==='null'?null:params.obj.PATH_ID;
    try {
        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);

        var routing = new Routing(conn);
        var result = routing.generateTrips(
                params.obj.FROM_TIME,
                params.obj.TO_TIME,
                params.obj.PATH_ID,
                params.obj.RULE_NUMBERS);

        if (result.RETURN_CODE !== 0) {
            throw new lib.InternalError(MSG_VOYAGE_GENERATE_FAILED, result);
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

        logger.success("VOYAGE_GENERATE_SUCCEED",
                result.RETURN_CODE,
                result.ID,
                result.MESSAGE,
                result.LOG);

        conn.commit();
    } catch(e) {
        conn.rollback();
        logger.error("VOYAGE_GENERATE_FAILED", e, params);

        throw new lib.InternalError(MSG_VOYAGE_GENERATE_FAILED, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }

};

entity.updateCapacity = function(params) {
    var conn;
    try {
        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);
        
        //Handling undefined error for $.hdb changes
    params.obj.simulationId = params.obj.simulationId===undefined?null:params.obj.simulationId;
    params.obj.scenarioId = params.obj.scenarioId===undefined?null:params.obj.scenarioId;
        
        var datasetCode = getDatasetCode(Number(params.obj.SIMULATION_PLAN_ID),
            Number(params.obj.SCENARIO_ID))

        var routing = new Routing(conn);

        if (params.obj.CAPACITY && params.obj.CAPACITY_UOM) {
            var resultGlobal = routing.updatePathGlobalCapacity(
                    datasetCode,
                    params.obj.PATH_ID,
                    params.obj.CAPACITY,
                    params.obj.CAPACITY_UOM);

            if (resultGlobal.RETURN_CODE !== 0) {
                throw new lib.InternalError(MSG_VOYAGE_UPDATE_CAPACITY_FAILED, resultGlobal);
            }

            logger.success("VOYAGE_UPDATE_CAPACITY_SUCCEED",
                    resultGlobal.RETURN_CODE,
                    resultGlobal.ID,
                    resultGlobal.MESSAGE,
                    resultGlobal.LOG);
        }

        if (params.obj.CAPACITY_LIST && params.obj.CAPACITY_LIST.length > 0) {
            var result = routing.updateTripCapacity(datasetCode, params.obj.CAPACITY_LIST);

            if (result.RETURN_CODE !== 0) {
                throw new lib.InternalError(MSG_VOYAGE_UPDATE_CAPACITY_FAILED, result);
            }

            logger.success("VOYAGE_UPDATE_CAPACITY_SUCCEED",
                    result.RETURN_CODE,
                    result.ID,
                    result.MESSAGE,
                    result.LOG);
        }

        conn.commit();
    } catch (e) {
        conn.rollback();
        logger.error("VOYAGE_UPDATE_CAPACITY_FAILED", e, params);

        throw new lib.InternalError(MSG_VOYAGE_UPDATE_CAPACITY_FAILED, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};


entity.setRoutes([
    {
        method: $.net.http.POST,
        scope: "collection",
        action: "generate",
        response: $.net.http.NO_CONTENT
    },
    {
        method: $.net.http.POST,
        scope: "collection",
        action: "updateCapacity",
        response: $.net.http.NO_CONTENT
    },
]);

entity.setFilters({
    filter: function(){
        var privilege = "sap.tm.trp.service::GenerateVoyage";

        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                "VOYAGE_GENERATE_UNAUTHORIZED",
                privilege
            );

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["generate"]
},{
    filter: function(){
        var privilege = "sap.tm.trp.service::UpdateVoyage";

        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                "VOYAGE_UPDATE_UNAUTHORIZED",
                privilege
            );

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["updateCapacity"]
},{
	filter:function(params){
		var planId=params.obj.SIMULATION_PLAN_ID;
		utils.checkSimulationPlanLock(planId);
		return true;
	},
	only:['generate','updateCapacity']
});

try {
    entity.handle();
} finally {
    logger.close();
}