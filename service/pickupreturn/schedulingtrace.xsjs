var model = $.import('/sap/tm/trp/service/model/pickupreturn.xsjslib');
var restLib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var procLib = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var facetFilterUtils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib').facetFilterUtils;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

var SERVICE_PKG = "sap.tm.trp.service";

var schedulingTraceService = new restLib.SimpleRest({
    name: 'schedulingTrace',
    desc: 'scheduling trace service',
    model: new model.SchedulingTrace()
});

schedulingTraceService.facetFilter = function(params) {
    try {
        var facetFilterProc = new procLib.procedure(
            constants.SCHEMA_NAME,
            [constants.SP_PKG_PICKUP_RETURN, 'p_scheduling_trace_facet_filter_get'].join('::')
        );
        var filteredOutput = facetFilterProc(
            params.obj.search,
            params.obj.PICKUP_OR_RETURN,
            params.obj.LOCATION_FILTER_ID,
            params.obj.STATUS_LIST,
            params.obj.SCHEDULING_TYPE_LIST,
            params.obj.OPTIMIZATION_SETTING_LIST,
            params.obj.PRE_LOCATION_ID_LIST,
            params.obj.CUR_LOCATION_ID_LIST,
            params.obj.USER_ID_LIST,
            params.obj.RESOURCE_CATEGORY
        );
        var facetFilterResult = facetFilterUtils.generateServiceReturnObj(
            filteredOutput,
            [
				{field: "STATUS", varName: "STATUS_LIST_OUTPUT"},
				{field: "PRE_LOCATION_ID", varName: "PRE_LOCATION_ID_LIST_OUTPUT"},
				{field: "CUR_LOCATION_ID", varName: "CUR_LOCATION_ID_LIST_OUTPUT"},
				{field: "USER_ID", varName: "USER_ID_LIST_OUTPUT"},
				{field: "SCHEDULE_TIME_TYPE", varName: "SCHEDULING_TYPE_LIST_OUTPUT"},
				{field: "OP_SETTING_TYPE", varName: "OPTIMIZATION_SETTING_LIST_OUTPUT"}
            ]
        );
        
        return facetFilterResult;
    } catch (e) {
        logger.error("SCHEDULING_TRACE_FACET_FILTER_GET_FAILED",
            JSON.stringify(params),
            e);
        throw e;
    }
};

schedulingTraceService.setRoutes([
    {
        method: $.net.http.POST,
        scope: 'collection',
        action: 'facetFilter',
    },
]);

schedulingTraceService.setFilters({
    filter: function(params){
        var privilege = [SERVICE_PKG, "ReadSchedulingTrace"].join("::");

        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                "SCHEDULING_TRACE_UNAUTHORIZED",
                privilege
            );
            throw new restLib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["facetFilter"]
});

try {
    schedulingTraceService.handle();
} finally {
    logger.close();
}
