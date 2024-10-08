var model = $.import("/sap/tm/trp/service/model/freightbooking.xsjslib");
var lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var reviseSDArraylib = $.import('/sap/tm/trp/service/xslib/reviseSDArray.xsjslib');
var facetFilterUtils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib').facetFilterUtils;

var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE = constants.SP_PKG_MOVINGSTOCK;

var freightBookingInformationService = new lib.SimpleRest({
    name: "Freight Booking Information",
    desc: "provides freight booking information",
    model: new model.FreightBookingInformation()
});

freightBookingInformationService.facetFilter = function(params) {
    var filterProc = new proc.procedure(
        SCHEMA,
        [PACKAGE, 'sp_freight_booking_facet_filter'].join('::')
    );
    var filteredData = filterProc(
        params.obj.search,
        params.obj.VOYAGE_ID,
        params.obj.SCHEDULE_ID,
        params.obj.EQUIP_FILTER_ID,
        params.obj.RESOURCE_TYPE_LIST_INPUT,
        params.obj.SOURCE_LOCATION_LIST_INPUT
    );
//    var scheduleIdList = filteredData.map(function(row){
//        return {
//            key: row.SCHEDULE_ID,
//            text: row.SCHEDULE_ID,
//        }; 
//    }).filter(facetFilterUtils.createUniqueFilterFunction());
//    var voyageIdList = filteredData.map(function(row){
//        return {
//            key: row.VOYAGE_ID,
//            text: row.VOYAGE_ID
//        }
//    }).filter(facetFilterUtils.createUniqueFilterFunction());
    var resourceTypeList = filteredData.RESOURCE_TYPE_OUTPUT.map(function(row){
        return {
            key: row.RESOURCE_TYPE,
            text: row.RESOURCE_TYPE
        };
    }).filter(facetFilterUtils.createUniqueFilterFunction());
    
    var sourceLocationList = filteredData.SOURCE_LOCATION_OUTPUT.map(function(row){
        return {
            key: row.SOURCE_LOCATION,
            text: row.SOURCE_LOCATION
        };
    }).filter(facetFilterUtils.createUniqueFilterFunction());
    
    return {
//    	SCHEDULE_ID: scheduleIdList,
//    	VOYAGE_ID: voyageIdList,
    	RESOURCE_TYPE:resourceTypeList,
    	SOURCE_LOCATION:sourceLocationList
    };
};

freightBookingInformationService.setRoutes([
{
    method: $.net.http.POST,
    scope: 'collection',
    action: 'facetFilter'
}
]);

freightBookingInformationService.handle();