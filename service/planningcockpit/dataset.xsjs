var Dataset = $.import("/sap/tm/trp/service/model/planningcockpit.xsjslib").Dataset;
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var Procedure = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib").procedure;
var Routing = $.import("/sap/tm/trp/service/routing/routing.xsjslib").Routing;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var utils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib");
var MSG_DATASET_UPDATE_FAILED = "MSG_DATASET_UPDATE_FAILED";
var MSG_DATASET_RETRIEVE_FAILED = "MSG_DATASET_RETRIEVE_FAILED";

var entity = new lib.SimpleRest({
    name: "Dataset",
    desc: "Dataset Service",
    model: new Dataset()
});

entity.update = function(params) {
    var conn;
    try {
        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);
        var routing = new Routing(conn);
        var result;

        if (!params.obj.SIMULATION_PLAN_ID) {
            result = routing.updateGlobalDataset();
        } else {
            result = routing.updateLocalDatasetBySimulationPlanId(params.obj.SIMULATION_PLAN_ID);
        }

        if (result.RETURN_CODE !== 0) {
            throw new lib.InternalError(MSG_DATASET_UPDATE_FAILED, result);
        }

        logger.success("DATASET_UPDATE_SUCCEED", result);

        conn.commit();

        return result;
    } catch(e) {
        conn.rollback();
        logger.error("DATASET_UPDATE_FAILED", e, params);

        if (e instanceof lib.WebApplicationError) {
            throw e;
        }

        throw new lib.InternalError(MSG_DATASET_UPDATE_FAILED, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }

};

entity.index = function(params) {
    var conn;
    try {
        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);

        var routing = new Routing(conn);
        var result;
        if (!params.obj.SIMULATION_PLAN_ID) {
            result = routing.readGlobalDataset(params.obj.WITH_SUMMARY);
        } else {
            var queryDatasetCode = conn.loadProcedure("SAP_TM_TRP",
                    "sap.tm.trp.db.planningcockpit::p_get_dataset_code_by_simulation_scenario_id");

            result = queryDatasetCode(params.obj.SIMULATION_PLAN_ID, 0);

            if (result.MESSAGE !== "MSG_SUCCESS_STATUS") {
                throw new lib.InternalError(MSG_DATASET_RETRIEVE_FAILED, result);
            }

            var datasetCode = result.DATASET_CODE;

            result = routing.readDatasetByCode(datasetCode, params.obj.WITH_SUMMARY);
        }

        conn.commit();

        return {
            DATASET: result.DATASET,
            SUMMARY: result.SUMMARY
        };
    } catch (e) {
        conn.rollback();
        logger.error("DATASET_RETRIEVE_FAILED", e, params);

        if (e instanceof lib.WebApplicationError) {
            throw e;
        }

        throw new lib.InternalError(MSG_DATASET_RETRIEVE_FAILED, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

entity.setRoutes({
    method: $.net.http.PUT,
    scope: "collection",
    action: "update",
});

entity.setFilters([{
    filter: function(params){
        var privilege = params.obj.SIMULATION_PLAN_ID ? // data set comes after simulation plan, then it's a local data set
                "sap.tm.trp.service::UpdateLocalDataset" : "sap.tm.trp.service::UpdateGlobalDataset";

        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                "DATASET_UPDATE_UNAUTHORIZED",
                privilege
            );

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["update"]
}, {
    filter: function(){
        var privilege = "sap.tm.trp.service::RetrieveDataset";

        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                "DATASET_RETRIEVE_UNAUTHORIZED",
                privilege
            );

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["show"]
},{
	filter:function(params){
		var planId=params.obj.SIMULATION_PLAN_ID;
		if(planId){
			utils.checkSimulationPlanLock(planId);
		}
		return true;
	},
	only:['update']
}]);

try {
    entity.handle();
} finally {
    logger.close();
}
