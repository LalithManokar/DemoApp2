var BaseConnection = $.import("/sap/tm/trp/service/model/planningcockpit.xsjslib").BaseConnection;
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var Procedure = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib").procedure;
var Routing = $.import("/sap/tm/trp/service/routing/routing.xsjslib").Routing;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var utils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib");

var entity = new lib.SimpleRest({
    name: "Base Connection",
    desc: "Base Connection Service",
    model: new BaseConnection()
});

var MSG_BASE_CONNECTION_CREATE_FAILED = "MSG_BASE_CONNECTION_CREATE_FAILED";
var MSG_BASE_CONNECTION_UPDATE_FAILED = "MSG_BASE_CONNECTION_UPDATE_FAILED";
var MSG_BASE_CONNECTION_DELETE_FAILED = "MSG_BASE_CONNECTION_DELETE_FAILED";
var MSG_BASE_CONNECTION_QUERY_FAILED  = "MSG_BASE_CONNECTION_QUERY_FAILED";
var MSG_BASE_CONNECTION_QUERY_TOO_MUCH_LOCATION = "MSG_BASE_CONNECTION_QUERY_TOO_MUCH_LOCATION";
var MSG_BASE_CONNECTION_CALCULATE_COSTS_FAILED = "MSG_BASE_CONNECTION_CALCULATE_COSTS_FAILED";

entity.create = function(params) {
    var conn;
    try {
        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);

        var queryDatasetId = conn.loadProcedure("SAP_TM_TRP",
                "sap.tm.trp.db.planningcockpit::p_get_dataset_id_by_simulation_scenario_id");
        
        params.obj.SIMULATION_PLAN_ID = params.obj.SIMULATION_PLAN_ID===undefined?null:params.obj.SIMULATION_PLAN_ID;
        params.obj.SCENARIO_ID = params.obj.SCENARIO_ID===undefined?null:params.obj.SCENARIO_ID;

        var datasetId = queryDatasetId(params.obj.SIMULATION_PLAN_ID, params.obj.SCENARIO_ID).DATASET_ID;
        logger.info("BASE_CONNECTION_QUERY_DATASET_ID_SUCCEED",
                params.obj.SIMULATION_PLAN_ID,
                params.obj.SCENARIO_ID,
                datasetId);

        var routing = new Routing(conn);

        var result = routing.createConnection(datasetId, params.obj.BASE_CONNECTION);

        if (result.RETURN_CODE !== 0) {
            throw new lib.InternalError(MSG_BASE_CONNECTION_CREATE_FAILED, result);
        }

        logger.success("BASE_CONNECTION_CREATE_SUCCEED",
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
        logger.error("BASE_CONNECTION_CREATE_FAILED", e, params);

        if (e instanceof lib.WebApplicationError) {
            throw e;
        } else {
            throw new lib.InternalError(MSG_BASE_CONNECTION_CREATE_FAILED, e);
        }
    } finally {
        if (conn) {
            conn.close();
        }
    }

};

entity.update = function(params) {
    var conn;
    try {
        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);

        var queryDatasetId = conn.loadProcedure("SAP_TM_TRP",
                "sap.tm.trp.db.planningcockpit::p_get_dataset_id_by_simulation_scenario_id");
        
        params.obj.SIMULATION_PLAN_ID = params.obj.SIMULATION_PLAN_ID===undefined?null:params.obj.SIMULATION_PLAN_ID;
        params.obj.SCENARIO_ID = params.obj.SCENARIO_ID===undefined?null:params.obj.SCENARIO_ID;

        var datasetId = queryDatasetId(params.obj.SIMULATION_PLAN_ID, params.obj.SCENARIO_ID).DATASET_ID;
        logger.info("BASE_CONNECTION_QUERY_DATASET_ID_SUCCEED",
                params.obj.SIMULATION_PLAN_ID,
                params.obj.SCENARIO_ID,
                datasetId);

        var routing = new Routing(conn);

        params.obj.BASE_CONNECTION.ID = params.id;

        var result = routing.updateConnection(datasetId, params.obj.BASE_CONNECTION);

        if (result.RETURN_CODE !== 0) {
            throw new lib.InternalError(MSG_BASE_CONNECTION_UPDATE_FAILED, result);
        }

        logger.success("BASE_CONNECTION_UPDATE_SUCCEED",
                result.RETURN_CODE,
                result.ID,
                result.MESSAGE,
                result.LOG);

        conn.commit();
        return result.MESSAGE;
    } catch (e) {
        conn.rollback();

        logger.error("BASE_CONNECTION_UPDATE_FAILED", e, params);

        if (e instanceof lib.WebApplicationError) {
            throw e;
        }

        throw new lib.InternalError(MSG_BASE_CONNECTION_UPDATE_FAILED, e);
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

        var queryDatasetId = conn.loadProcedure("SAP_TM_TRP",
                "sap.tm.trp.db.planningcockpit::p_get_dataset_id_by_simulation_scenario_id");
        
        params.obj.SIMULATION_PLAN_ID = params.obj.SIMULATION_PLAN_ID===undefined?null:params.obj.SIMULATION_PLAN_ID;
        params.obj.SCENARIO_ID = params.obj.SCENARIO_ID===undefined?null:params.obj.SCENARIO_ID;

        var datasetId = queryDatasetId(params.obj.SIMULATION_PLAN_ID, params.obj.SCENARIO_ID).DATASET_ID;
        logger.info("BASE_CONNECTION_QUERY_DATASET_ID_SUCCEED",
                params.obj.SIMULATION_PLAN_ID,
                params.obj.SCENARIO_ID,
                datasetId);

        var routing = new Routing(conn);

        var result = routing.deleteConnection(datasetId, params.id);

        if (result.RETURN_CODE !== 0) {
            throw new lib.InternalError(MSG_BASE_CONNECTION_DELETE_FAILED, result);
        }

        logger.success("BASE_CONNECTION_DELETE_SUCCEED",
                result.RETURN_CODE,
                result.ID,
                result.MESSAGE,
                result.LOG);

        conn.commit();
        return result;
    } catch (e) {
        conn.rollback();
        logger.error("BASE_CONNECTION_DELETE_FAILED", e, params);

        if (e instanceof lib.WebApplicationError) {
            throw e;
        }

        throw new lib.InternalError(MSG_BASE_CONNECTION_DELETE_FAILED, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

entity.query = function(params) {
    try {
        var connection=$.hdb.getConnection();
        var query = connection.loadProcedure("SAP_TM_TRP",
                "sap.tm.trp.db.planningcockpit::p_query_basic_connection_for_map");
        
        //Handling undefined error for $.hdb changes
        params.obj.SIMULATION_PLAN_ID = params.obj.SIMULATION_PLAN_ID===undefined?null:params.obj.SIMULATION_PLAN_ID;
        params.obj.SCENARIO_ID = params.obj.SCENARIO_ID===undefined?null:params.obj.SCENARIO_ID;
        params.obj.FROM_LOCATION_NAME = params.obj.FROM_LOCATION_NAME===undefined?null:params.obj.FROM_LOCATION_NAME;
        params.obj.TO_LOCATION_NAME = params.obj.TO_LOCATION_NAME===undefined?null:params.obj.TO_LOCATION_NAME;
        params.obj.USED_FLAG = params.obj.USED_FLAG===undefined?null:params.obj.USED_FLAG;
        params.obj.MTR = params.obj.MTR===undefined?null:params.obj.MTR;
        params.obj.X_MIN= params.obj.X_MIN===undefined?null:params.obj.X_MIN;
        params.obj.X_MAX = params.obj.X_MAX===undefined?null:params.obj.X_MAX;
        params.obj.Y_MIN = params.obj.Y_MIN===undefined?null:params.obj.Y_MIN;
        params.obj.Y_MAX = params.obj.Y_MAX===undefined?null:params.obj.Y_MAX;

        var result = query(params.obj.SIMULATION_PLAN_ID,
                params.obj.SCENARIO_ID,
                params.obj.FROM_LOCATION_NAME,
                params.obj.TO_LOCATION_NAME,
                params.obj.USED_FLAG,
                params.obj.MTR,
                params.obj.X_MIN,
                params.obj.X_MAX,
                params.obj.Y_MIN,
                params.obj.Y_MAX);
        connection.commit();
        var gps;
        if (result.GPS_INFO) {
            gps = Object.keys(result.GPS_INFO).map(function(item) {
                return {
                    FROM: item.FROM_LOC,
                    TO: item.TO_LOC,
                    MTR: item.MTR,
                    GPS: utils.sampleArray(JSON.parse(item.GPS), params.obj.ZOOM_LEVEL).map(function(lane) {
                        return lane.concat(0.000).join(";");
                    })
                };
            });
        }
        
        if (result.TOO_MUCH_LOCATION_FLAG !== 0) {
            throw new lib.InternalError(MSG_BASE_CONNECTION_QUERY_TOO_MUCH_LOCATION, result.MESSAGE);
        }

        return {
            CONNECTIONS: result.CONNECTIONS,
            POINTS: result.POINTS,
            GPS_INFO: gps,
            INVALID_LOCATIONS: result.OUT_LOCATIONS_XPOS_YPOS_INVALID
        };
    } catch (e) {
        logger.error("BASE_CONNECTION_QUERY_FAILED", e, params);

        if (e instanceof lib.WebApplicationError) {
            throw e;
        }

        throw new lib.InternalError(MSG_BASE_CONNECTION_QUERY_FAILED, e);
    }
    connection.close();
};

entity.enable = entity.destroy;
entity.disable = entity.destroy;

entity.costs = function(params) {
    var conn;
    try {
        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);

        var getNetworkCode = conn.loadProcedure("SAP_TM_TRP",
                "sap.tm.trp.db.planningcockpit::p_get_networkcode_by_simulation_scenario_id");

        var networkCode = getNetworkCode(params.obj.SIMULATION_PLAN_ID, params.obj.SCENARIO_ID).NETWORK_CODE;
        logger.info("BASE_CONNECTION_QUERY_NETWORK_CODE_SUCCEED",
                params.obj.SIMULATION_PLAN_ID,
                params.obj.SCENARIO_ID,
                networkCode);

        var routing = new Routing(conn);

        var result;
        var cost;
        if (params.obj.CONNECTION_ID_LIST.length > 0) {
            result = routing.calculateConnectionCostById(networkCode, params.obj.CONNECTION_ID_LIST);
            cost=result.cost[0].TRANSPORT_COST;
        } else {
            result = routing.calculateConnectionCost(networkCode, params.obj.BASE_CONNECTION);
            cost=result.TRANSPORT_COST;
        }

        if (result.RETURN_CODE !== 0) {
            throw new lib.InternalError(MSG_BASE_CONNECTION_CALCULATE_COSTS_FAILED, result);
        }

        logger.success("BASE_CONNECTION_CALCULATE_COSTS_SUCCEED",
                result.RETURN_CODE,
                //result.ID,
                result.MESSAGE,
                result.LOG);

        conn.commit();

        //delete result.RETURN_CODE;
        //delete result.MESSAGE;

        return cost; 
    } catch (e) {
        conn.rollback();
        logger.error("BASE_CONNECTION_CALCULATE_COSTS_FAILED", e, params);

        if (e instanceof lib.WebApplicationError) {
            throw e;
        }

        throw new lib.InternalError(MSG_BASE_CONNECTION_CALCULATE_COSTS_FAILED, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

entity.setRoutes([
    {
        method: $.net.http.PUT,
        scope: "member",
        action: "enable",
    },
    {
        method: $.net.http.PUT,
        scope: "member",
        action: "disable",
    },
    {
        method: $.net.http.GET,
        scope: "collection",
        action: "query",
    },
    {
        method: $.net.http.GET,
        scope: "collection",
        action: "costs",
    }
]);

entity.setFilters({
    filter: function(){
        var privilege = "sap.tm.trp.service::CreateBaseConnection";

        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                "BASE_CONNECTION_CREATE_UNAUTHORIZED",
                privilege
            );

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["create"]
},{
    filter: function(){
        var privilege = "sap.tm.trp.service::UpdateBaseConnection";

        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                "BASE_CONNECTION_UPDATE_UNAUTHORIZED",
                privilege
            );

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["update"]
},{
    filter: function(){
        var privilege = "sap.tm.trp.service::DeleteBaseConnection";

        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                "BASE_CONNECTION_DELETE_UNAUTHORIZED",
                privilege
            );

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["destroy", "enable", "disable"]
},{
    filter: function(){
        var privilege = "sap.tm.trp.service::QueryBaseConnection";

        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                "BASE_CONNECTION_QUERY_UNAUTHORIZED",
                privilege
            );

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["query"]
},{
    filter:function(params){
        var planId=params.obj.SIMULATION_PLAN_ID;
        utils.checkSimulationPlanLock(planId);
        return true;
    },
    only:['create',"destroy", "enable", "disable",'update']
});

try {
    entity.handle();
} finally {
    logger.close();
}
