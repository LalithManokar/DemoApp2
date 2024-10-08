var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var model = $.import("/sap/tm/trp/service/model/booking.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var utils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var facetFilterUtils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib').facetFilterUtils;
var geoCheck = $.import("/sap/tm/trp/service/xslib/geoCheck.xsjslib");
var equipmentCheck = $.import("/sap/tm/trp/service/xslib/equipmentCheck.xsjslib");
var logger = new($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE='sap.tm.trp.db.booking';
var bookingInformationService = new lib.SimpleRest({
    name: "Booking Information",
    desc: "provides booking information",
    model: new model.BookingInformation()
});

bookingInformationService.resourceFacetFilter = function(params) {
    var getResourceFacetFilter = new proc.procedure(SCHEMA, "sap.tm.trp.db.booking::p_containers_facet_filter");

    var result = getResourceFacetFilter(
            params.obj.TOR_ID,
            params.obj.search,
            params.obj.RESOURCE_STATUS_LIST,
            params.obj.OWNER_LIST,
            params.obj.FOOD_GRADE_LIST,
            params.obj.RESOURCE_CONDITION_LIST);

    return {
        RESOURCE_STATUS_CODE : result.RESOURCE_STATUS_OUTPUT.map(function(v) {
            return {
                key: v.KEY,
                text: v.TEXT
            };
        }),
        OWNERSHIP_CODE: result.OWNERSHIP_OUTPUT.map(function(v){
            return {
                key: v.KEY,
                text: v.TEXT
            };
        }),
        FOOD_GRADE: result.FOOD_GRADE_OUTPUT.map(function(v) {
            return {
                key: v.KEY,
                text: v.TEXT
            };
        }),
        RESOURCE_CONDITION: result.RESOURCE_CONDITION_OUTPUT.map(function(v) {
            return {
                key: v.KEY,
                text: v.TEXT
            };
        })
    };
};

bookingInformationService.getFacetFilter = function(params) {

    var showFacetFilterProc, result = {};
    var SCHEMA = constants.SCHEMA_NAME;
    var procName = 'sap.tm.trp.db.booking::sp_get_booking_facet_filter';

    try {

        showFacetFilterProc = new proc.procedure(SCHEMA, procName);
        var filteredData = showFacetFilterProc(
            params.obj.EQUIPMENT_FILTER_ID,
            params.obj.LOCATION_FILTER_ID,
            params.obj.FILTER_ON,
            params.obj.FROM_DATE,
            params.obj.TO_DATE,
            params.obj.BOOKING_TYPE,
            params.obj.LOCATION,
            params.obj.EQUIPMENT_TYPE,
            params.obj.DATA_PROVIDER_TYPE,
            params.obj.search,
            params.obj.TU_TYPE_LIST_INPUT,
            params.obj.RESOURCE_TYPE_LIST_INPUT,
            params.obj.PLANNING_RELEVANT_LIST_INPUT,
            params.obj.EXECUTION_STATUS_LIST_INPUT,
            params.obj.LIFECYCLE_STATUS_LIST_INPUT,
            params.obj.LEASE_CONTRACT_LIST_INPUT,
            params.obj.LEASE_CONTRACT_TYPE_LIST_INPUT,
            params.obj.SPECIAL_INSTRUCTION_LIST_INPUT
        );
        var facetFilterResult = facetFilterUtils.generateServiceReturnObj(
                filteredData,
                [
                    {field: "TU_TYPE_CODE", varName: "TU_TYPE_OUTPUT"},
                    {field: "RESOURCE_TYPE", varName: "RESOURCE_TYPE_OUTPUT"},
                    {field: "HAULAGE_TYPE", varName: "PLANNING_RELEVANT_OUTPUT"},
                    {field: "EXECUTION_STATUS_CODE", varName: "EXECUTION_STATUS_OUTPUT"},
                    {field: "LIFECYCLE_STATUS_CODE", varName: "LIFECYCLE_STATUS_OUTPUT"},
                    {field: "LEASE_AGREEMENT", varName: "LEASE_CONTRACT_OUTPUT"},
                    {field: "LEASE_TYPE_CODE", varName: "LEASE_CONTRACT_TYPE_OUTPUT"},
                    {field: "SPECIAL_INSTRUCTION_CODE", varName: "SPECIAL_INSTRUCTION_OUTPUT"}
                ]
            );
        return facetFilterResult;
    } catch (e) {
        logger.error("BOOKING_FACET_FILTER_GET_FAILED", e);
        throw new lib.InternalError(messages.MSG_ERROR_DISPLAY_FILTER, e);
    }
};

bookingInformationService.setFilters({
    filter: function(params) {
        return geoCheck.authorizeReadByLocationFilterIdList([{ID: params.obj.LOCATION_FILTER_ID}]);
    },
    only: ["getFacetFilter"]
},
{
    filter: function(params) {
        return equipmentCheck.authorizeReadByEquipmentFilterIdList([{ID: params.obj.EQUIPMENT_FILTER_ID}]);
    },
    only: ["getFacetFilter"]
});

bookingInformationService.setRoutes([
    {
        method: $.net.http.POST,
        scope: "collection",
        action: "getFacetFilter"
    },
    {
        method: $.net.http.POST,
        scope: "collection",
        action: "resourceFacetFilter"
    },
]);

try {
    bookingInformationService.handle();
} finally {
    logger.close();
}
