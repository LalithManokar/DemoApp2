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
var PACKAGE='sap.tm.trp.db.movingstock';

var activeResourceService = new lib.SimpleRest({
    name: "Active Resource",
    desc: "provides moving stock active resource Information",
    model: new model.ActiveResource()
});

activeResourceService.facetFilter = function(params) {

    var filterProc = new proc.procedure(
        SCHEMA, [PACKAGE, 'p_moving_stock_active_resouce_facet_filter_freight_order'].join('::')
    );
    
    var filteredData = filterProc(
            params.obj.search,
            params.obj.LOCATION_FILTER_ID,
            params.obj.EQUIP_FILTER_ID,
            params.obj.START_DATE_TIME,
            params.obj.END_DATE_TIME,
            params.obj.TIME_FILTER_BY,
            params.obj.LOCATION,
            params.obj.EQUIPMENT_TYPE,
            params.obj.TRAIN_ID_LIST_INPUT,
            params.obj.RESPONSIBLE_PERSON_LIST_INPUT,
            params.obj.SCHEDULE_ID_LIST_INPUT,
            params.obj.SOURCE_LOCATION_LIST_INPUT,
            params.obj.LAST_LOCATION_LIST_INPUT,
            params.obj.DESTINATION_LOCATION_LIST_INPUT,
            params.obj.RESOURCE_CATEGORY
        );
    
    var facetFilterResult = facetFilterUtils.generateServiceReturnObj(
            filteredData,
            [
                {field: "VOYAGE", varName: "TRAIN_NO_OUTPUT"},
                {field: "RESPONSIBLE_PERSON", varName: "PERSON_RESPON_OUTPUT"},
                {field: "SCHEDULE_ID", varName: "SCHEDULE_ID_OUTPUT"},
                {field: "SOURCE_LOCATION", varName: "ORIGIN_OUTPUT"},
                {field: "LAST_LOCATION", varName: "LAST_LOCATION_OUTPUT"},
                {field: "DESTINATION_LOCATION", varName: "DESTINATION_OUTPUT"}
            ]
        );

    return facetFilterResult;
};

activeResourceService.setFilters({
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
},
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
});

//get the column's name, then set it as the key of each column object
function transform(input) {
    var output = {};
    for (var k in input) {
        if (Array.isArray(input[k]) && input[k].length > 0) {
            var key = Object.keys(input[k][0])[0];
            output[key] = input[k];
        }
    }
    return output;
}

activeResourceService.getMapData=function(params){
    var procName, mapProc, results, outputResult;
    var min = params.obj.MIN,
        max = params.obj.MAX;
    var xMin = Math.min(min[0], max[0]),
        xMax = Math.max(min[0], max[0]);
    var yMin = Math.min(min[1], max[1]),
        yMax = Math.max(min[1], max[1]);
    var resource_filter_id=params.obj.resource_filter_id,
        location_filter_id=params.obj.location_filter_id,
        start_date_time=params.obj.start_date_time,
        end_date_time=params.obj.end_date_time,
        time_filter_by=params.obj.time_filter_by,
        location=params.obj.location,
        equipment_type=params.obj.equipment_type,
        searchText=params.obj.searchText;
        //hierarchyLevel = params.obj.hierarchyLevel;
    var hierarchyLevel=0;
    var subName = "::sp_moving_stock_active_resource_map_freight_order";

    procName=constants.SP_PKG_MOVINGSTOCK + subName;

    mapProc=new proc.procedure(constants.SCHEMA_NAME, procName);

    results=mapProc(location_filter_id,resource_filter_id,start_date_time,end_date_time,time_filter_by,location,equipment_type,params.obj.resource_category, xMin, xMax, yMin, yMax, hierarchyLevel,searchText);

    outputResult = {
            RESULTS: results.OUT_ACTIVE_RESOURCE_MAP,
            FIELD: results.GIS_TYPE,
            INVALID_LOCATIONS: results.OUT_LOCATIONS_XPOS_YPOS_INVALID
        };
    return outputResult;
}

activeResourceService.setRoutes([
    {
        method: $.net.http.POST,
        scope: 'collection',
        action: 'facetFilter'
    },
    {
        method: $.net.http.GET,
        scope: "collection",
        action: "getMapData",
        response: $.net.http.OK
    },
    {
        method: $.net.http.GET,
        scope: "member",
        action: "getMapData",
        response: $.net.http.OK
    }
]);

try {
    activeResourceService.handle();
} finally {
    logger.close();
}
