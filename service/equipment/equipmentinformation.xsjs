var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var model = $.import("/sap/tm/trp/service/model/equipment.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var geoCheck = $.import("/sap/tm/trp/service/xslib/geoCheck.xsjslib");
var facetFilterUtils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib').facetFilterUtils;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

var SCHEMA = constants.SCHEMA_NAME;

var equipmentInformationService = new lib.SimpleRest({
    name: "Equipment Information",
    desc: "provide equipment info query by equipment/location",
    model: new model.EquipmentInformation()
});

equipmentInformationService.drillDownDetails = function(params) {
    var getEquipInfo, procName;
    try {
        procName = 'sap.tm.trp.db.equipment::p_equipment_visibility_info_details';
        getEquipInfo = new proc.procedure(SCHEMA, procName);
        var result = getEquipInfo(params.id).OUTPUT;
        return result;
    } catch (e) {
        logger.error("EQUIPMENT_DRILLDOWN_GET_FAILED",
            params.id,
            e);
        throw new lib.InternalError(messages.MSG_ERROR_GET_DETAILED_EQUIPMENT_INFO, e);
    }
};

equipmentInformationService.facetFilter = function(params) {
    try {
        var facetFilterProc = new proc.procedure(
            SCHEMA,
            [constants.SP_PKG_EQUIPMENT, "p_equipment_info_facet_filter" ].join("::")
        );
        var filteredData = facetFilterProc(
            params.obj.search,
            params.obj.RESOURCE_FILTER_ID,
            params.obj.LOCATION_FILTER_ID,
            params.obj.ATTRIBUTE_GROUP_ID,
            params.obj.ATTRIBUTE_NODE_LIST,
            params.obj.LOCATION,
            params.obj.RESOURCE_TYPE,
            params.obj.LEASE_CONTRACT_REFERENCE,
            params.obj.RES_ID,
            params.obj.IN_MOVEMENT_STATUS,
            params.obj.IN_RESOURCE_CATEGORY,
            params.obj.IN_RESOURCE_STATUS,
            params.obj.RESOURCE_STATUS_LIST,
            params.obj.OWNER_LIST,
            params.obj.BLOCK_STATUS_LIST,
            params.obj.FOOD_GRADE_LIST,
            params.obj.RESOURCE_CONDITION_LIST,
            params.obj.MOVEMENT_STATUS_LIST
        );

        var resultData = facetFilterUtils.generateServiceReturnObj(
            filteredData,
            [
                {field: "RESOURCE_STATUS", varName: "RESOURCE_STATUS_OUTPUT"},
                {field: "OWNERSHIP", varName: "OWNERSHIP_OUTPUT"},
                {field: "BLOCK_STATUS", varName: "BLOCKING_STATUS_OUTPUT"},
                {field: "FOOD_GRADE", varName: "FOOD_GRADE_OUTPUT"},
                {field: "RESOURCE_CONDITION", varName: "RESOURCE_CONDITION_OUTPUT"},
                {field: "MOVEMENT_STATUS_CODE", varName: "MOVEMENT_STATUS_OUTPUT"}
            ]
        );
        return resultData;
    } catch(e) {
        logger.error("EQUIPMENT_FACET_FILTER_GET_FAILED",
            JSON.stringify(params),
            e);
        throw new lib.InternalError(messages.MSG_ERROR_EQUIPMENT_FACET_FILTER_GOT, e);
    }
};

equipmentInformationService.changeHistoryFacetFilter = function(params){
    try {
        var facetFilterProc = new proc.procedure(
            SCHEMA,
            [constants.SP_PKG_EQUIPMENT, 'p_ext_tracking_history_facet_filter'].join('::')
        );
        var filteredData = facetFilterProc(
            params.obj.search,
            params.obj.RESOURCE_ID,
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
        logger.error("EQUIPMENT_FACET_FILTER_HISTORY_GET_FAILED",
            JSON.stringify(params),
            e);
        throw new lib.InternalError(messages.MSG_ERROR_EQUIPMENT_FACET_FILTER_HISTORY_GOT, e);
    }
};

equipmentInformationService.setFilters({
    filter: function(params) {
        if (params.obj.LOCATION_FILTER_ID === undefined){
            return true;
        }
        return geoCheck.authorizeReadByLocationFilterIdList([{ID: params.obj.LOCATION_FILTER_ID}]);
    },
    only: ["facetFilter"]
});

equipmentInformationService.setRoutes([{
    method: $.net.http.GET,
    scope: "member",
    action: "drillDownDetails"
}, {
    method: $.net.http.GET,
    scope: "member",
    action: "additionalFields"
}, {
    method: $.net.http.POST,
    scope: "collection",
    action: "facetFilter"
}, {
    method: $.net.http.POST,
    scope: "collection",
    action: "changeHistoryFacetFilter"
}]);

try {
    equipmentInformationService.handle();
} finally {
    logger.close();
}
