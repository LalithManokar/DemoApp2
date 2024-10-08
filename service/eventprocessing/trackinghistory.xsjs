var model = $.import('/sap/tm/trp/service/model/trackinghistory.xsjslib');
var restLib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var procLib = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var utils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib');
var facetFilterUtils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib').facetFilterUtils;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE = constants.SP_PKG_PICKUP_RETURN;
var SERVICE_PKG = "sap.tm.trp.service";

var trackingHistoryService = new restLib.SimpleRest({
    name: 'trackingHistory',
    desc: 'tracking history service',
    model: new model.TrackingHistory()
});

trackingHistoryService.facetFilter = function(params) {
    try {
        var facetFilterProc = new procLib.procedure(
            constants.SCHEMA_NAME,
            [constants.SP_PKG_EVENT_PROCESSING, 'p_ext_tracking_history_facet_filter'].join('::')
        );
        var filteredData = facetFilterProc(
            params.obj.search,
            params.obj.RESOURCE_FILTER_ID,
            params.obj.LOCATION_FILTER_ID,
            utils.parseTime(params.obj.START_TIME),
            utils.parseTime(params.obj.END_TIME),
            params.obj.RESOURCE_NAME,
            params.obj.LOCATION_LIST_INPUT,
            params.obj.CHANGED_FIELD_LIST_INPUT,
            params.obj.BEFORE_VALUE_LIST_INPUT,
            params.obj.NEW_VALUE_LIST_INPUT
        );
        var resultData = facetFilterUtils.generateServiceReturnObj(
            filteredData,
            [
                {field: "LOCATION", varName: "LOCATION_LIST_OUTPUT"},
                {field: "CHANGED_FIELD", varName: "CHANGED_FIELD_LIST_OUTPUT"},
                {field: "BEFORE_VALUE", varName: "BEFORE_VALUE_LIST_OUTPUT"},
                {field: "NEW_VALUE", varName: "NEW_VALUE_LIST_OUTPUT"}
            ]
        );
        return resultData;
    } catch (e) {
        logger.error("TRACKING_HISTORY_FACET_FILTER_GET_FAILED",
            JSON.stringify(params),
            e);
        throw e;
    }
};

trackingHistoryService.setRoutes([
    {
        method: $.net.http.POST,
        scope: 'collection',
        action: 'facetFilter',
    },
]);

var filterObjectList = [
    {service: ["facetFilter"], privilege: "ReadTrackingHistory"},
].map(function(checkPrivInfo){
    return {
        filter: function(params) {
            var privilege = [SERVICE_PKG, checkPrivInfo.privilege].join("::");

            if (!$.session.hasAppPrivilege(privilege)) {
                logger.error(
                    "TRACKING_HISTORY_UNAUTHORIZED",
                    privilege
                );
                throw new restLib.NotAuthorizedError(privilege);
            }
            return true;
        },
        only: checkPrivInfo.service
    };
});

trackingHistoryService.setFilters.apply(
    trackingHistoryService,
    filterObjectList
);


try {
    trackingHistoryService.handle();
} finally{
    logger.close();
}
