var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var model = $.import("/sap/tm/trp/service/model/dashboard.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var geoCheck = $.import("/sap/tm/trp/service/xslib/geoCheck.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

var kpi = new lib.SimpleRest({
    name : "KPI",
    desc : "KPI Service",
    model : new model.KPI()
});

kpi.index = function(params) {
    try {
        var getExecutionResult = new proc.procedure(
                "SAP_TM_TRP",
                "sap.tm.trp.db.pipeline::p_get_execution_result_by_plan_id_list_location_resource");
        var result = getExecutionResult(params.obj.planIds, params.obj.geoIds,
                params.obj.resIds);
        var kpis = [];
        result.PLANS.forEach(function(item) {
            var data = [];
            var nodeType = null;
            
            result.RESULTS.filter(function(itm) {
                return itm.PLAN_ID === item.PLAN_ID;
            }).forEach(function(itm) {
                var kpi = {
                    SEQUENCE : itm.SEQUENCE,
                    START_TIME : itm.START_TIME,
                    END_TIME : itm.END_TIME,
                    INTERVAL : itm.INTERVAL,
                    RESOURCE_ID : itm.RESOURCE_TYPE_ID,
                    GEO_ID : itm.GEO_ID,
                    VALUE : itm.OUTPUT_VALUE
                };
                
                nodeType = itm.OUTPUT_KEY;
                
                data.push(kpi);
            });

            kpis.push({
                PLAN_ID : item.PLAN_ID,
                PLAN_NAME : item.PLAN_NAME,
                OUTPUT_NODE_NAME : item.OUTPUT_NODE_NAME,
                OUTPUT_NODE_TYPE : nodeType,
                OUTPUT_NODE_UNIT : item.OUTPUT_NODE_UNIT,
                DATA : data
            });
        });
        return {
            START_TIME : result.START_TIME,
            END_TIME : result.END_TIME,
            TIME_INTERVALS : result.INTERVALS,
            KPI : kpis
        };
    } catch (e) {
        logger.error("KPI_RESULTS_GET_FAILED",
            JSON.stringify(params),
            e);
        
        throw new lib.InternalError(messages.MSG_ERROR_GET_KPI_DASHBOARD, e);
    }
};

kpi.setFilters({
    filter : function(params) {
        try {
            var planIdList = params.get("plan_id").split(',').map(function(i) {
                return {
                    ID : i
                };
            });
            var checkFlag = geoCheck.authorizeReadByPlanIdList(planIdList);
            if (!checkFlag) {
                logger.error("LOCATION_FILTER_AUTHORIZE_FAILED");
                throw new lib.NotAuthorizedError(
                        messages.MSG_LOCATION_FILTER_NOT_AUTHORIZED);
            }
            return true;
        } catch (e) {
            throw e;
        }
    },
    only : [ "index" ]
});

try {
    kpi.handle();
} finally {
    logger.close();
}