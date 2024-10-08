var model = $.import("/sap/tm/trp/service/model/movingstock.xsjslib");
var lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var geoCheck = $.import("/sap/tm/trp/service/xslib/geoCheck.xsjslib");
var equipmentCheck = $.import("/sap/tm/trp/service/xslib/equipmentCheck.xsjslib");
var facetFilterUtils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib').facetFilterUtils;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var isContainer = $.import('/sap/tm/trp/service/xslib/utils.xsjslib').isContainer;

var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE=constants.SP_PKG_MOVINGSTOCK;

var loadDischargeService = new lib.SimpleRest({
    name: "Load Discharge ",
    desc: "provides Load & Discharge Information",
    model: new model.LoadDischarge()
});

loadDischargeService.facetFilter = function(params) {

    var filterProc = new proc.procedure(
        SCHEMA, [PACKAGE, 'sp_load_discharge_facet_filter_freight_order'].join('::')
    );
    
    var filteredData = filterProc(
        params.obj.search,
        params.obj.LOCATION_FILTER_ID,
        params.obj.EQUIP_FILTER_ID,
        params.obj.TIME_FILTER_BY,
        params.obj.START_DATE_TIME,
        params.obj.END_DATE_TIME,
        params.obj.LOCATION_LIST_INPUT,
        params.obj.RESOURCE_TYPE_LIST_INPUT,
        params.obj.SCHEDULE_ID_LIST_INPUT,
        params.obj.ACTIVE_RESOURCE_ID_LIST_INPUT,
        params.obj.ACTIVE_RESOURCE_TYPE_LIST_INPUT,
        params.obj.FREIGHT_BOOKING_ID_LIST_INPUT,
        params.obj.RESOURCE_CATEGORY
    );

    var facetFilterResult = facetFilterUtils.generateServiceReturnObj(
        	filteredData,
        	[
        	 	{field: "LOCATION", varName: "LOCATION_OUTPUT"},
        	 	{field: "RESOURCE_TYPE", varName: "RESOURCE_TYPE_OUTPUT"},
        	 	{field: "SCHEDULE_ID", varName: "SCHEDULE_ID_OUTPUT"},
        	 	{field: "ACTIVE_RESOURCE_ID", varName: "ACTIVE_RESOURCE_ID_OUTPUT"},
        	 	{field: "ACTIVE_RESOURCE_TYPE", varName: "ACTIVE_RESOURCE_TYPE_OUTPUT"},
        	 	{field: "FREIGHT_BOOKING_ID", varName: "FREIGHT_BOOKING_ID_OUTPUT"},
        	]
        );

        return facetFilterResult;
};

loadDischargeService.setFilters(
    {
        filter: function(params) {
            try {
                return equipmentCheck.authorizeReadByEquipmentFilterIdList([{ID: params.obj.EQUIP_FILTER_ID}]);
            } catch (e) {
                logger.error("ACCESS_UNAUTHORIZED_RESOURCE_FILTER",
                        params.obj.EQUIP_FILTER_ID,
                        logger.Paramter.Exception(1, e));

                throw e;
            }
        },
        only: ["facetFilter"]
    },
    {
        filter: function(params) {
            try {
                return geoCheck.authorizeReadByLocationFilterIdList([{ID: params.obj.LOCATION_FILTER_ID}]);
            } catch (e) {
                logger.error("ACCESS_UNAUTHORIZED_LOCATION_FILTER",
                        params.obj.LOCATION_FILTER_ID,
                        logger.Paramter.Exception(1, e));

                throw e;
            }
        },
        only: ["facetFilter"]
    }
);


loadDischargeService.setRoutes([
    {
        method: $.net.http.POST,
        scope: 'collection',
        action: 'facetFilter'
    }
]);

try {
    loadDischargeService.handle();
} finally {
    logger.close();
}
