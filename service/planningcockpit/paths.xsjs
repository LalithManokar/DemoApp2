var Path = $.import("/sap/tm/trp/service/model/planningcockpit.xsjslib").Path;
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var Procedure = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib").procedure;
var Routing = $.import("/sap/tm/trp/service/routing/routing.xsjslib").Routing;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var utils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib");

var entity = new lib.SimpleRest({
    name: "Basic/Composite Path",
    desc: "Basic/Composite Path Service",
    model: new Path()
});

var MSG_PATH_CREATE_FAILED = "MSG_PATH_CREATE_FAILED";
var MSG_PATH_UPDATE_FAILED = "MSG_PATH_UPDATE_FAILED";
var MSG_PATH_DELETE_FAILED = "MSG_PATH_DELETE_FAILED";
var MSG_PATH_CALCULATE_COST_FAILED = "MSG_PATH_CALCULATE_COST_FAILED";
var MSG_PATH_QUERY_FAILED = "MSG_PATH_QUERY_FAILED";

function getDatasetId(simulationId, scenarioId, conn) {
    var queryDatasetId = conn.loadProcedure("SAP_TM_TRP",
            "sap.tm.trp.db.planningcockpit::p_get_dataset_id_by_simulation_scenario_id");
            
    //Handling undefined error for $.hdb changes
    simulationId = simulationId===undefined?null:simulationId;
    scenarioId = scenarioId===undefined?null:scenarioId;

    var datasetId = queryDatasetId(simulationId, scenarioId).DATASET_ID;

    logger.info("PATH_QUERY_DATASET_ID_SUCCEED",
            simulationId, scenarioId, datasetId);

    return datasetId;
}

function getNetworkId(simulationId, scenarioId, conn) {
    var queryNetworkId = conn.loadProcedure("SAP_TM_TRP",
            "sap.tm.trp.db.planningcockpit::p_get_networkid_by_simulation_scenario_id");
            
    //Handling undefined error for $.hdb changes
    simulationId = simulationId===undefined?null:simulationId;
    scenarioId = scenarioId===undefined?null:scenarioId;

    var networkId = queryNetworkId(simulationId, scenarioId).NETWORK_ID;

    logger.info("PATH_QUERY_NETWORK_ID_SUCCEED",
            simulationId, scenarioId, networkId);

    return networkId;
}

entity.create = function(params) {
    var conn;
    try {
        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);

        var routing = new Routing(conn);
        //Handling undefined error for $.hdb changes
        params.obj.SIMULATION_PLAN_ID = params.obj.SIMULATION_PLAN_ID===undefined?null:params.obj.SIMULATION_PLAN_ID;
        params.obj.SCENARIO_ID = params.obj.SCENARIO_ID===undefined?null:params.obj.SCENARIO_ID;

        var result;
        if (params.obj.compositeType) {
            var networkId = getNetworkId(params.obj.SIMULATION_PLAN_ID, params.obj.SCENARIO_ID, conn);

            var log;
            var message;
            result = routing.createCompositePath(networkId, params.obj.COMPOSITE_PATH);

            if (result.RETURN_CODE !== 0) {
                throw new lib.InternalError(MSG_PATH_CREATE_FAILED, result);
            }
            log = result.LOG;
            message = result.MESSAGE;

            result = routing.generateRoute4CompositePath(Number(params.obj.SIMULATION_PLAN_ID),
                Number(params.obj.SCENARIO_ID), result.ID);

            if (result.RETURN_CODE === 0) {
                result.MESSAGE.concat(message);
                result.LOG.concat(log);
            }
        } else {
            var datasetId = getDatasetId(params.obj.SIMULATION_PLAN_ID, params.obj.SCENARIO_ID, conn);

            result = routing.createPath(datasetId, params.obj.BASIC_PATH);
        }

        if (result.RETURN_CODE !== 0) {
            throw new lib.InternalError(MSG_PATH_CREATE_FAILED, result);
        }

        logger.success("PATH_CREATE_SUCCEED",
                result.RETURN_CODE,
                result.ID,
                result.MESSAGE,
                result.LOG);

        conn.commit();

        return {
            ID: parseInt(result.ID.toString())
        };
    } catch(e) {
        conn.rollback();
        logger.error("PATH_CREATE_FAILED", e, params);

        if (e instanceof lib.WebApplicationError) {
            throw e;
        }

        throw new lib.InternalError(MSG_PATH_CREATE_FAILED, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }

};

// use a different name since update won"t return any response, but in fact, a newly created path will be generated
entity.updatePath = function(params) {
    var conn;
    try {
        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);
        
        //Handling undefined error for $.hdb changes
        params.obj.SIMULATION_PLAN_ID = params.obj.SIMULATION_PLAN_ID===undefined?null:params.obj.SIMULATION_PLAN_ID;
        params.obj.SCENARIO_ID = params.obj.SCENARIO_ID===undefined?null:params.obj.SCENARIO_ID;

        var datasetId = getDatasetId(params.obj.SIMULATION_PLAN_ID, params.obj.SCENARIO_ID,conn);

        var routing = new Routing(conn);

        params.obj.BASIC_PATH.ID = params.id;
        params.obj.BASIC_PATH.ID= params.obj.BASIC_PATH.ID===undefined?null:params.obj.BASIC_PATH.ID;
        var result = routing.updatePath(datasetId, params.obj.BASIC_PATH);

        if (result.RETURN_CODE !== 0) {
            throw new lib.InternalError(MSG_PATH_UPDATE_FAILED, result);
        }

        logger.success("PATH_UPDATE_SUCCEED",
                result.RETURN_CODE,
                result.ID,
                result.MESSAGE,
                result.LOG);

        conn.commit();

        return result;
    } catch (e) {
        conn.rollback();

        logger.error("PATH_UPDATE_FAILED", e, params);

        if (e instanceof lib.WebApplicationError) {
            throw e;
        }

        throw new lib.InternalError(MSG_PATH_UPDATE_FAILED, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

entity.destroy = function(params) {
    var conn;
    try {
        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);
        
        //Handling undefined error for $.hdb changes
        params.obj.SIMULATION_PLAN_ID = params.obj.SIMULATION_PLAN_ID===undefined?null:params.obj.SIMULATION_PLAN_ID;
        params.obj.SCENARIO_ID = params.obj.SCENARIO_ID===undefined?null:params.obj.SCENARIO_ID;

        var routing = new Routing(conn);

        var result;

        if (params.obj.compositeType) {
            var networkId = getNetworkId(params.obj.SIMULATION_PLAN_ID, params.obj.SCENARIO_ID, conn);

            result = routing.deleteCompositePath(networkId, params.id);
        } else {
            var datasetId = getDatasetId(params.obj.SIMULATION_PLAN_ID, params.obj.SCENARIO_ID,conn);

            result = routing.deletePath(datasetId, params.id);
        }

        if (result.RETURN_CODE !== 0) {
            throw new lib.InternalError(MSG_PATH_DELETE_FAILED, result);
        }

        logger.success("PATH_DELETE_SUCCEED",
                result.RETURN_CODE,
                result.ID,
                result.MESSAGE,
                result.LOG);

        conn.commit();
        return result.ID;
    } catch (e) {
        conn.rollback();
        logger.error("PATH_DELETE_FAILED", e, params);

        if (e instanceof lib.WebApplicationError) {
            throw e;
        }

        throw new lib.InternalError(MSG_PATH_DELETE_FAILED, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

entity.restore = entity.destroy;
entity.enable = entity.destroy;
entity.disable = entity.destroy;

entity.costs = function(params) {
    var conn;
    try {
        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);

        var getNetworkCode =conn.loadProcedure("SAP_TM_TRP",
                "sap.tm.trp.db.planningcockpit::p_get_networkcode_by_simulation_scenario_id");
        
        //Handling undefined error for $.hdb changes
        params.obj.SIMULATION_PLAN_ID = params.obj.SIMULATION_PLAN_ID===undefined?null:params.obj.SIMULATION_PLAN_ID;
        params.obj.SCENARIO_ID = params.obj.SCENARIO_ID===undefined?null:params.obj.SCENARIO_ID;
        
        var networkCode = getNetworkCode(params.obj.SIMULATION_PLAN_ID, params.obj.SCENARIO_ID).NETWORK_CODE;
        logger.info("PATH_QUERY_NETWORK_CODE_SUCCEED",
                params.obj.SIMULATION_PLAN_ID,
                params.obj.SCENARIO_ID,
                networkCode);

        var routing = new Routing(conn);

        var result;
        var cost;
        params.obj.BASIC_PATH   = params.obj.BASIC_PATH===undefined?null:params.obj.BASIC_PATH;
        
        if (params.obj.PATH_ID_LIST)  { // batch mode
            result = routing.calculatePathCostById(networkCode, params.obj.PATH_ID_LIST);
            cost=result.cost[0].TRANSPORT_COST;
        } else {
            if (params.obj.compositeType) {
                result = routing.calculateCompositePathMeasure(networkCode, params.obj.COMPOSITE_PATH);
                cost=result.TOTAL_COST;
            } else {
                result = routing.calculatePathCost(networkCode, params.obj.BASIC_PATH);
                cost=result.TRANSPORT_COST;
            }
        }

        if (result.RETURN_CODE !== 0) {
            throw new lib.InternalError(MSG_PATH_CALCULATE_COST_FAILED, result);
        }

        logger.success("PATH_CALCULATE_COST_SUCCEED",
                result.RETURN_CODE,
                //result.ID,
                result.MESSAGE);
                //result.LOG);

        conn.commit();
        
        //delete r.RETURN_CODE;
        //delete r.MESSAGE;

        return cost;
    } catch (e) {
        conn.rollback();
        logger.error("PATH_CALCULATE_COST_FAILED", e, params);

        if (e instanceof lib.WebApplicationError) {
            throw e;
        }

        throw new lib.InternalError(MSG_PATH_CALCULATE_COST_FAILED, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

entity.query = function(params) {
    try {
        var query, result, gps;
        var conn=$.hdb.getConnection();
        
        //Handling undefined error for $.hdb changes
        params.obj.SIMULATION_PLAN_ID = params.obj.SIMULATION_PLAN_ID===undefined?null:parseInt(params.obj.SIMULATION_PLAN_ID);
        params.obj.SCENARIO_ID = params.obj.SCENARIO_ID===undefined?null:parseInt(params.obj.SCENARIO_ID);
        params.obj.FROM_LOCATION_NAME = params.obj.FROM_LOCATION_NAME===undefined?null:params.obj.FROM_LOCATION_NAME;
        params.obj.TO_LOCATION_NAME = params.obj.TO_LOCATION_NAME===undefined?null:params.obj.TO_LOCATION_NAME;
        params.obj.MTR = params.obj.MTR===undefined?null:params.obj.MTR;
        params.obj.X_MIN= params.obj.X_MIN===undefined?null:Number(params.obj.X_MIN);
        params.obj.X_MAX = params.obj.X_MAX===undefined?null:Number(params.obj.X_MAX);
        params.obj.Y_MIN = params.obj.Y_MIN===undefined?null:Number(params.obj.Y_MIN);
        params.obj.Y_MAX = params.obj.Y_MAX===undefined?null:Number(params.obj.Y_MAX);
        params.obj.USED_FLAG = params.obj.USED_FLAG===undefined?null:params.obj.USED_FLAG;
        
        if (params.obj.compositeType) {
            query = conn.loadProcedure("SAP_TM_TRP",
                "sap.tm.trp.db.planningcockpit::p_query_composite_path_for_map");

            result = query(params.obj.SIMULATION_PLAN_ID,
                    params.obj.SCENARIO_ID,
                    params.obj.FROM_LOCATION_NAME,
                    params.obj.TO_LOCATION_NAME,
                    params.obj.MTR,
                    params.obj.X_MIN,
                    params.obj.X_MAX,
                    params.obj.Y_MIN,
                    params.obj.Y_MAX);
        } else {
            query = new Procedure("SAP_TM_TRP",
                "sap.tm.trp.db.planningcockpit::p_query_basic_path_for_map");

            result = query(params.obj.SIMULATION_PLAN_ID,
                    params.obj.SCENARIO_ID,
                    params.obj.FROM_LOCATION_NAME,
                    params.obj.TO_LOCATION_NAME,
                    params.obj.USED_FLAG,
                    params.obj.MTR,
                    params.obj.X_MIN,
                    params.obj.X_MAX,
                    params.obj.Y_MIN,
                    params.obj.Y_MAX);
        }

        conn.commit();
        if (result.MESSAGE !== "MSG_SUCCESS") {
            throw new lib.InternalError(result.MESSAGE);
        }
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

        return {
            POINTS: result.POINTS,
            PATHS: result.PATHS,
            PATH_CONNECTION: result.PATH_CONNECTION,
            GPS_INFO: gps,
            INVALID_LOCATIONS: result.OUT_LOCATIONS_XPOS_YPOS_INVALID
        };
    } catch (e) {
        logger.error("PATH_QUERY_FAILED", e, params);

        if (e instanceof lib.WebApplicationError) {
            throw e;
        }

        throw new lib.InternalError(MSG_PATH_QUERY_FAILED, e);
    }
    conn.close();
};

entity.setRoutes([
    {
        method: $.net.http.PUT,
        scope: "member",
        action: "restore",
        response : $.net.http.NO_CONTENT
    },
    {
        method: $.net.http.PUT,
        scope: "member",
        action: "enable",
        response : $.net.http.NO_CONTENT
    },
    {
        method: $.net.http.PUT,
        scope: "member",
        action: "disable",
        response : $.net.http.NO_CONTENT
    },
    {
        method: $.net.http.POST,
        scope: "collection",
        action: "costs"
    },
    {
        method: $.net.http.GET,
        scope: "collection",
        action: "query"
    },
    {
        method: $.net.http.PUT,
        scope: "member",
        action: "updatePath",
        response : $.net.http.OK
    }
]);

entity.setFilters({
    filter: function(params){
        var privilege = params.obj.compositeType ?
                "sap.tm.trp.service::CreateCompositePath" : "sap.tm.trp.service::CreateBasicPath";

        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                "PATH_CREATE_UNAUTHORIZED",
                privilege
            );

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["create"]
},{
    filter: function(){
        var privilege = "sap.tm.trp.service::UpdateBasicPath";

        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                "PATH_UPDATE_UNAUTHORIZED",
                privilege
            );

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["updatePath"]
},{
    filter: function(params){
        var privilege = params.obj.compositeType ?
                "sap.tm.trp.service::DeleteCompositePath" : "sap.tm.trp.service::DeleteBasicPath";

        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                "PATH_DELETE_UNAUTHORIZED",
                privilege
            );

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["destroy", "enable", "disable", "restore"]
},{
    filter: function(params){
        var privilege = params.obj.compositeType ?
                "sap.tm.trp.service::CalculateBasicPathCosts" : "sap.tm.trp.service::CalculateCompositePathCosts";

        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                "PATH_CALCULATE_COSTS_UNAUTHORIZED",
                privilege
            );

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["costs"]
},{
    filter: function(){
        var privilege = "sap.tm.trp.service::QueryPath";

        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                "PATH_QUERY_UNAUTHORIZED",
                privilege
            );

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["query"]
},{
    filter: function(params){
        if (params.obj.compositeType) { // composite path cannot be updated
            throw new lib.MethodNotAllowedError(params);
        }

        return true;
    },
    only: ["updatePath"]
},{
	filter:function(params){
		utils.checkSimulationPlanLock(params.obj.SIMULATION_PLAN_ID);

		return true;
	},
	only:["create", "enable", "cost", "updatePath"]
});

try {
    entity.handle();
} finally {
    logger.close();
}
