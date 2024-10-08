var model = $.import("/sap/tm/trp/service/model/stock.xsjslib");
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var geoCheck = $.import("/sap/tm/trp/service/xslib/geoCheck.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

var stockService = new lib.SimpleRest({
    name: "plans",
    desc: "create/update/delete/execute/getresult stock services",
    model: new model.Stocks()
});

function json2array(json){
    var result = [];
    var keys = Object.keys(json);
    keys.forEach(function(key){
        result.push(json[key]);
    });
    return result;
}

function reviseGeoTableResult(array) {
    var objectArray = {}, outArray = [];
    for (var i in array) {
        var children = {};
        var key = array[i].RESOURCE_TYPE_CODE + "%" + array[i].RESOURCE_TYPE;
        children.GEO_ID = array[i].GEO_ID;
        children.GEO_NAME = array[i].GEO_NAME;
        children.GEO_DESC = array[i].GEO_DESC;
        children.GEO_TYPE = array[i].GEO_TYPE;
        children.RESOURCE_ID = array[i].RESOURCE_TYPE_CODE;
        children.RESOURCE_NAME = array[i].RESOURCE_TYPE_NAME;
        children.RESOURCE_DESC = array[i].RESOURCE_TYPE_DESC;
        children.RESOURCE_TYPE = array[i].RESOURCE_TYPE;
        children.TOTAL_STOCK_PCS = array[i].TOTAL_STOCK_PCS;
        children.SELECTED_STOCK_PCS = array[i].SELECTED_STOCK_PCS;
        children.TOTAL_STOCK_TEU = array[i].TOTAL_STOCK_TEU;
        children.SELECTED_STOCK_TEU = array[i].SELECTED_STOCK_TEU;
        children.OVERALL_STOCK_TEU = array[i].OVERALL_STOCK_TEU;
        children.OVERALL_STOCK_PCS = array[i].OVERALL_STOCK_PCS;
        children.STORAGE_STATUS_VALUE = array[i].STORAGE_STATUS_VALUE;
        children.OUT_OF_RANGE_QUANTITY = array[i].OUT_OF_RANGE_QUANTITY;
        children.MIN_SAFETY_STOCK = array[i].MIN_SAFETY_STOCK;
        children.MAX_SAFETY_STOCK = array[i].MAX_SAFETY_STOCK;
        children.MAX_PHYSICAL_STOCK = array[i].MAX_PHYSICAL_STOCK;
        if (!objectArray.hasOwnProperty(key)) {
            objectArray[key] = {};
            objectArray[key].RESOURCE_ID = array[i].RESOURCE_TYPE_CODE;
            objectArray[key].RESOURCE_NAME = array[i].RESOURCE_TYPE_NAME;
            objectArray[key].RESOURCE_DESC = array[i].RESOURCE_TYPE_DESC;
            objectArray[key].RESOURCE_TYPE = array[i].RESOURCE_TYPE;
            objectArray[key].TOTAL_STOCK_PCS = array[i].RES_TOTAL_STOCK_PCS;
            objectArray[key].SELECTED_STOCK_PCS = array[i].RES_SELECTED_STOCK_PCS;
            objectArray[key].TOTAL_STOCK_TEU = array[i].RES_TOTAL_STOCK_TEU;
            objectArray[key].SELECTED_STOCK_TEU = array[i].RES_SELECTED_STOCK_TEU;
            objectArray[key].children = [children];
        } else {
            objectArray[key].children.push(children);
        }
    }
    for (var idx in objectArray) {
        outArray.push(objectArray[idx]);
    }
    return outArray;
}


function reviseTableResult(array) {
    var objectArray = {}, outArray = [];
    for (var i in array) {
        var children = {};
        var key = array[i].GEO_ID + "%" + array[i].GEO_TYPE;
        children.GEO_ID = array[i].GEO_ID;
        children.GEO_NAME = array[i].GEO_NAME;
        children.GEO_DESC = array[i].GEO_DESC;
        children.GEO_TYPE = array[i].GEO_TYPE;
        children.RESOURCE_ID = array[i].RESOURCE_TYPE_CODE;
        children.RESOURCE_NAME = array[i].RESOURCE_TYPE_NAME;
        children.RESOURCE_DESC = array[i].RESOURCE_TYPE_DESC;
        children.RESOURCE_TYPE = array[i].RESOURCE_TYPE;
       children.TOTAL_STOCK_PCS = array[i].TOTAL_STOCK_PCS;
        children.SELECTED_STOCK_PCS = array[i].SELECTED_STOCK_PCS;
        children.TOTAL_STOCK_TEU = array[i].TOTAL_STOCK_TEU;
        children.SELECTED_STOCK_TEU = array[i].SELECTED_STOCK_TEU;
        children.STORAGE_STATUS_VALUE = array[i].STORAGE_STATUS_VALUE;
        children.OUT_OF_RANGE_QUANTITY = array[i].OUT_OF_RANGE_QUANTITY;
        children.MIN_SAFETY_STOCK = array[i].MIN_SAFETY_STOCK;
        children.MAX_SAFETY_STOCK = array[i].MAX_SAFETY_STOCK;
        children.MAX_PHYSICAL_STOCK = array[i].MAX_PHYSICAL_STOCK;
        if (!objectArray.hasOwnProperty(key)) {
            objectArray[key] = {};
            objectArray[key].GEO_ID = array[i].GEO_ID;
            objectArray[key].GEO_NAME = array[i].GEO_NAME;
            objectArray[key].GEO_DESC = array[i].GEO_DESC;
            objectArray[key].GEO_TYPE = array[i].GEO_TYPE;
            objectArray[key].TOTAL_STOCK_PCS = array[i].GEO_TOTAL_STOCK_PCS;
            objectArray[key].SELECTED_STOCK_PCS = array[i].GEO_SELECTED_STOCK_PCS;
            objectArray[key].TOTAL_STOCK_TEU = array[i].GEO_TOTAL_STOCK_TEU;
            objectArray[key].SELECTED_STOCK_TEU = array[i].GEO_SELECTED_STOCK_TEU;
            objectArray[key].OVERALL_STOCK_TEU = array[i].GEO_OVERALL_STOCK_TEU;
            objectArray[key].OVERALL_STOCK_PCS = array[i].GEO_OVERALL_STOCK_PCS;
            objectArray[key].STORAGE_STATUS_VALUE = array[i].GEO_STORAGE_STATUS_VALUE;
            objectArray[key].OUT_OF_RANGE_QUANTITY = array[i].GEO_OUT_OF_RANGE_QUANTITY;
            objectArray[key].MIN_SAFETY_STOCK = array[i].GEO_MIN_SAFETY_STOCK;
            objectArray[key].MAX_SAFETY_STOCK = array[i].GEO_MAX_SAFETY_STOCK;
            objectArray[key].MAX_PHYSICAL_STOCK = array[i].GEO_MAX_PHYSICAL_STOCK;
            if (children.RESOURCE_ID) {
                objectArray[key].children = [children];
            }
        } else {
              if (children.RESOURCE_ID) {
                objectArray[key].children.push(children);
            }
        }
    }
    for (var idx in objectArray) {
        outArray.push(objectArray[idx]);
    }
    return outArray;
}

function reviseMapResult(array) {
    var objectArray = {}, outArray = [];
    for (var i in array) {
        var key = array[i].LOCATION_ID;
        if (!objectArray.hasOwnProperty(key)) {
            objectArray[key] = {};
            objectArray[key].LOCATION_ID = array[i].LOCATION_ID;
            objectArray[key].LOCATION_NAME = array[i].LOCATION_NAME;
            objectArray[key].BOUNDARY = array[i].BOUNDARY;
            objectArray[key].LATITUDE = array[i].LATITUDE;
            objectArray[key].LONGITUDE = array[i].LONGITUDE;
            objectArray[key].STOCK = {};
            objectArray[key].STOCK[array[i].EQUIP_STATUS_CATEGORY] = array[i].CURRENT_STOCK;
        } else {
            objectArray[key].STOCK[array[i].EQUIP_STATUS_CATEGORY] = array[i].CURRENT_STOCK;
        }
    }
    for (var idx in objectArray) {
        outArray.push(objectArray[idx]);
    }
    return outArray;
}

function reviseChartResult(array, resource) {
    var objectArray = {}, outArray = [];
    for (var i in array) {
        var details = {};
        if(resource) {
            var key = array[i].GEO_ID + "%" + array[i].RESOURCE_TYPE_CODE + "%" + array[i].GEO_TYPE + "%" + array[i].RESOURCE_TYPE;
        } else {
            var key = array[i].GEO_ID + "%" + array[i].GEO_TYPE;
        }
        details.NAME = array[i].STOCK_DETAIL_CATEGORY;
        details.VALUE_PCS = array[i].OVERALL_STOCK_DETAIL_PCS;
        details.VALUE_TEU = array[i].OVERALL_STOCK_DETAIL_TEU;
        if (!objectArray.hasOwnProperty(key)) {
            objectArray[key] = {};
            objectArray[key].GEO_ID = array[i].GEO_ID;
            objectArray[key].GEO_NAME = array[i].GEO_NAME;
            objectArray[key].GEO_DESC = array[i].GEO_DESC;
            objectArray[key].GEO_TYPE = array[i].GEO_TYPE;
            if(resource) {
                objectArray[key].RESOURCE_ID = array[i].RESOURCE_TYPE_CODE;
                objectArray[key].RESOURCE_NAME = array[i].RESOURCE_TYPE_NAME;
                objectArray[key].RESOURCE_DESC = array[i].RESOURCE_TYPE_DESC;
                objectArray[key].RESOURCE_TYPE = array[i].RESOURCE_TYPE;
                objectArray[key].AVAILABLE_STOCK_PCS = array[i].AVAILABLE_STOCK_PCS;
                objectArray[key].UNAVAILABLE_STOCK_PCS = array[i].UNAVAILABLE_STOCK_PCS;
                objectArray[key].TOTAL_AVAILABLE_STOCK_PCS = array[i].TOTAL_AVAILABLE_STOCK_PCS;
                objectArray[key].TOTAL_UNAVAILABLE_STOCK_PCS = array[i].TOTAL_UNAVAILABLE_STOCK_PCS;
                objectArray[key].AVAILABLE_STOCK_TEU = array[i].AVAILABLE_STOCK_TEU;
                objectArray[key].UNAVAILABLE_STOCK_TEU = array[i].UNAVAILABLE_STOCK_TEU;
                objectArray[key].TOTAL_AVAILABLE_STOCK_TEU = array[i].TOTAL_AVAILABLE_STOCK_TEU;
                objectArray[key].TOTAL_UNAVAILABLE_STOCK_TEU = array[i].TOTAL_UNAVAILABLE_STOCK_TEU;
                objectArray[key].DETAILS = [{NAME:details.NAME, VALUE_PCS:details.VALUE_PCS, VALUE_TEU:details.VALUE_TEU}];
            } else {
                objectArray[key].OVERALL_AVAILABLE_STOCK_TEU = array[i].OVERALL_AVAILABLE_STOCK_TEU;
                objectArray[key].OVERALL_UNAVAILABLE_STOCK_TEU = array[i].OVERALL_UNAVAILABLE_STOCK_TEU;
                objectArray[key].OVERALL_AVAILABLE_STOCK_PCS = array[i].OVERALL_AVAILABLE_STOCK_PCS;
                objectArray[key].OVERALL_UNAVAILABLE_STOCK_PCS = array[i].OVERALL_UNAVAILABLE_STOCK_PCS;
                objectArray[key].DETAILS = [{NAME:details.NAME, VALUE_PCS:details.VALUE_PCS, VALUE_TEU:details.VALUE_TEU}];
            }
            objectArray[key].MIN_SAFETY_STOCK = array[i].MIN_SAFETY_STOCK;
            objectArray[key].MAX_SAFETY_STOCK = array[i].MAX_SAFETY_STOCK;
        } else {
            objectArray[key].DETAILS.push(details);
        }
    }
    for (var idx in objectArray) {
        outArray.push(objectArray[idx]);
    }
    return outArray;
}

stockService.updateSettings = function(params) {
    var updateStockProc, procName, outputResult;
    procName = constants.SP_PKG_STOCK + "::p_location_stock_update";
    updateStockProc = new proc.procedure(constants.SCHEMA_NAME, procName);
    outputResult = updateStockProc(params.obj.locationId,
                params.obj.locationType,
                params.obj.stockSettings,
                params.obj.stockThresholds,
                params.obj.RESOURCE_CATEGORY);
    if (outputResult.MSG !== "") {
        throw new lib.InternalError(outputResult.MSG);
    }
    return outputResult;
};

stockService.alertsOnMap = function(params) {
    var procName, alertsOnMapProc, alertsResults, outputResult;
    var min = params.obj.MIN,
        max = params.obj.MAX;
    var xMin = Math.min(min[0], max[0]),
        xMax = Math.max(min[0], max[0]);
    var yMin = Math.min(min[1], max[1]),
        yMax = Math.max(min[1], max[1]);
    var resourceFilterId = params.obj.resourceFilterId,
        locationFilterId = params.obj.locationFilterId,
        hierarchyLevel = params.obj.hierarchyLevel,
        resourceType = params.obj.resourceType;
    if (resourceType === 'all_types') {
        procName = constants.SP_PKG_STOCK + "::p_stock_alert_map";
        alertsOnMapProc = new proc.procedure(constants.SCHEMA_NAME, procName);
        alertsResults = alertsOnMapProc(resourceFilterId, locationFilterId, xMin, xMax, yMin, yMax, hierarchyLevel);
    } else {
        procName = constants.SP_PKG_STOCK + "::p_stock_alert_map_of_the_resource";
        alertsOnMapProc = new proc.procedure(constants.SCHEMA_NAME, procName);
        alertsResults = alertsOnMapProc(resourceFilterId, locationFilterId, xMin, xMax, yMin, yMax, hierarchyLevel, resourceType);
    }
    if (alertsResults.TOO_MUCH_LOCATION_FLAG === 1) {

        logger.warn("STOCK_TOO_MANY_ALERTS_ON_MAP",
                resourceFilterId,
                locationFilterId,
                attributeGroupId,
                JSON.stringify(nodeIdList),
                xMin,
                xMax,
                yMin,
                yMax,
                hierarchyLevel);

        outputResult = {
            TOO_MUCH_LOCATION_FLAG : 1
        };
    } else {
        outputResult = {
            ALERTS: alertsResults.OUT_STOCK_ALERT_MAP,
            FIELD: alertsResults.GIS_TYPE,
            INVALID_LOCATIONS: alertsResults.OUT_LOCATIONS_XPOS_YPOS_INVALID
        };
    }
    return outputResult;
};

stockService.bubbleOnMap = function(params) {
    var procName, bubbleOnMapProc, bubbleResults, outputResult;
    var min = params.obj.MIN,
        max = params.obj.MAX;
    var xMin = Math.min(min[0], max[0]),
        xMax = Math.max(min[0], max[0]);
    var yMin = Math.min(min[1], max[1]),
        yMax = Math.max(min[1], max[1]);
    var resourceFilterId = params.obj.resourceFilterId,
        locationFilterId = params.obj.locationFilterId,
        hierarchyLevel = params.obj.hierarchyLevel,
        resourceType = params.obj.resourceType;
    if (resourceType === 'all_types'){
        procName = constants.SP_PKG_STOCK + "::p_stock_bubble_map";
        bubbleOnMapProc = new proc.procedure(constants.SCHEMA_NAME, procName);
        bubbleResults = bubbleOnMapProc(resourceFilterId, locationFilterId, xMin, xMax, yMin, yMax, hierarchyLevel);
    } else {
        procName = constants.SP_PKG_STOCK + "::p_stock_bubble_map_of_the_resource";
        bubbleOnMapProc = new proc.procedure(constants.SCHEMA_NAME, procName);
        bubbleResults = bubbleOnMapProc(resourceFilterId, locationFilterId, xMin, xMax, yMin, yMax, hierarchyLevel, resourceType);
    }
     if (bubbleResults.TOO_MUCH_LOCATION_FLAG === 1) {

        logger.warn("STOCK_TOO_MANY_ALERTS_ON_MAP",
                resourceFilterId,
                locationFilterId,
                attributeGroupId,
                JSON.stringify(nodeIdList),
                xMin,
                xMax,
                yMin,
                yMax,
                hierarchyLevel);

        outputResult = {
            TOO_MUCH_LOCATION_FLAG : 1
        };
    } else {
        outputResult = {
            RESULTS: bubbleResults.OUT_STOCK_BUBBLE_MAP,
            FIELD: bubbleResults.GIS_TYPE,
            INVALID_LOCATIONS: bubbleResults.OUT_LOCATIONS_XPOS_YPOS_INVALID
        };
    }
    return outputResult;
};

stockService.pieOnMap = function(params) {
    var procName, pieOnMapProc, pieResults, outputResult;
    var min = params.obj.MIN,
        max = params.obj.MAX;
    var xMin = Math.min(min[0], max[0]),
        xMax = Math.max(min[0], max[0]);
    var yMin = Math.min(min[1], max[1]),
        yMax = Math.max(min[1], max[1]);
    var locationFilterId= params.obj.locationFilterId,
        resourceFilterId = params.obj.resourceFilterId,
        attributeGroupId = params.obj.attributeGroupId,
        nodeIdList = params.obj.nodeIdList,
        hierarchyLevel = params.obj.hierarchyLevel,
        resourceType = params.obj.resourceType;
    if (resourceType === 'all_types'){
        procName = constants.SP_PKG_STOCK + "::p_stock_pie_map";
        pieOnMapProc = new proc.procedure(constants.SCHEMA_NAME, procName);
        pieResults = pieOnMapProc(resourceFilterId, locationFilterId, attributeGroupId, nodeIdList, xMin, xMax, yMin, yMax, hierarchyLevel);
    } else {
        procName = constants.SP_PKG_STOCK + "::p_stock_pie_map_of_the_resource";
        pieOnMapProc = new proc.procedure(constants.SCHEMA_NAME, procName);
        pieResults = pieOnMapProc(resourceFilterId, locationFilterId, attributeGroupId, nodeIdList, xMin, xMax, yMin, yMax, hierarchyLevel, resourceType);
      
    }
    if (pieResults.TOO_MUCH_LOCATION_FLAG === 1) {

        logger.warn("STOCK_TOO_MANY_ALERTS_ON_MAP",
                resourceFilterId,
                locationFilterId,
                attributeGroupId,
                JSON.stringify(nodeIdList),
                xMin,
                xMax,
                yMin,
                yMax,
                hierarchyLevel);

        outputResult = {
            TOO_MUCH_LOCATION_FLAG : 1
        };
    } else {
        outputResult = {
            RESULTS: reviseMapResult(pieResults.OUT_STOCK_PIE_MAP),
            FIELD: pieResults.GIS_TYPE,
            INVALID_LOCATIONS: pieResults.OUT_LOCATIONS_XPOS_YPOS_INVALID
        };
    }
    return outputResult;
};

stockService.stockChart = function(params) {
    var procName, chartProc, locationResults, resourceResults;
    var locationFilterId = params.obj.locationFilterId,
    resourceFilterId = params.obj.resourceFilterId,
    attributeGroupId = params.obj.attributeGroupId,
    nodeIdList = params.obj.nodeIdList,
    locationIdList = params.obj.locationIdList;
    
    //Generate nodeId Clob
    var lvNodeId = "";
    for (var i = 0; i < params.obj.nodeIdList.length; i++) {
        if (i !== params.obj.nodeIdList.length - 1) {
        	lvNodeId = lvNodeId + params.obj.nodeIdList[i].NODE_ID + ",";
        } else {
        	lvNodeId = lvNodeId + params.obj.nodeIdList[i].NODE_ID;
        }
    }
    //Generate LOCID Clob
    
    var lvLocId = "";
    for ( i = 0; i < locationIdList.length; i++) {
        if (locationIdList[i].ID === "")   { locationIdList[i].ID = ' '; }
        if (locationIdList[i].NAME === "")     { locationIdList[i].NAME = ' '; }
        if (locationIdList[i].TYPE === "")        { locationIdList[i].TYPE = 0; }
        if (i !== locationIdList.length - 1) {
            lvLocId = lvLocId + locationIdList[i].ID + "," + 
                                                  locationIdList[i].NAME + "," + 
                                                  locationIdList[i].TYPE + "~";
        } else {
            //last line - no tilt concat required
            lvLocId = lvLocId + locationIdList[i].ID + "," + 
                                                locationIdList[i].NAME + "," + 
                                                locationIdList[i].TYPE; 
        }
    }

    
    procName = constants.SP_PKG_EQUIPMENT + "::p_get_stock_chart_clob";
    
    var connection = $.hdb.getConnection();
    chartProc = connection.loadProcedure(constants.SCHEMA_NAME,procName);
    var result = chartProc(attributeGroupId, resourceFilterId, locationFilterId, lvNodeId, lvLocId);
    connection.close();
    
    var res1 = json2array(result.OUTPUT_STOCK_LOCATION);
    var res2 = json2array(result.OUTPUT_STOCK_LOCATION_EQUIP);

    locationResults = reviseChartResult(res1, false);
    resourceResults = reviseChartResult(res2, true);

    return {
        resultsByLocation:locationResults, resultsByResource:resourceResults
    };
};

stockService.stockTable = function(params) {
    var attributeGroupId = params.obj.attributeGroupId,
    resourceFilterId = params.obj.resourceFilterId,
    locationFilterId = params.obj.locationFilterId,
    resourceCategory = params.obj.resourceCategory,
    nodeIdList = params.obj.nodeIdList,
    resourceTypeList = params.obj.resourceTypeList,
    locationIdList = params.obj.locationIdList;
   
    //Generate nodeId Clob
    var lvNodeId = "";
    for (var i = 0; i < params.obj.nodeIdList.length; i++) {
        if (i !== params.obj.nodeIdList.length - 1) {
        	lvNodeId = lvNodeId + params.obj.nodeIdList[i].NODE_ID + ",";
        } else {
        	lvNodeId = lvNodeId + params.obj.nodeIdList[i].NODE_ID;
        }
    }
    //Generate LOCID Clob
    
    var lvLocId = "";
    for ( i = 0; i < locationIdList.length; i++) {
        if (locationIdList[i].ID === "")   { locationIdList[i].ID = ' '; }
        if (locationIdList[i].NAME === "")     { locationIdList[i].NAME = ' '; }
        if (locationIdList[i].TYPE === "")        { locationIdList[i].TYPE = 0; }
        if (i !== locationIdList.length - 1) {
            lvLocId = lvLocId + locationIdList[i].ID + "," + 
                                                  locationIdList[i].NAME + "," + 
                                                  locationIdList[i].TYPE + "~";
        } else {
            //last line - no tilt concat required
            lvLocId = lvLocId + locationIdList[i].ID + "," + 
                                                locationIdList[i].NAME + "," + 
                                                locationIdList[i].TYPE; 
        }
    }
         
	//Generate resource Clob
    
    var lvResId = "";
    for ( i = 0; i < resourceTypeList.length; i++) {
        if (resourceTypeList[i].RESOURCE_TYPE_CODE === "")   { resourceTypeList[i].RESOURCE_TYPE_CODE = ' '; }
        if (resourceTypeList[i].RESOURCE_TYPE_NAME === "")     { resourceTypeList[i].RESOURCE_TYPE_NAME = ' '; }
        if (resourceTypeList[i].RESOURCE_TYPE)        { resourceTypeList[i].RESOURCE_TYPE = 0; }
        if (i !== resourceTypeList.length - 1) {
            lvResId = lvResId + resourceTypeList[i].RESOURCE_TYPE_CODE + "," + 
                                                  resourceTypeList[i].RESOURCE_TYPE_NAME + "," + 
                                                  resourceTypeList[i].RESOURCE_TYPE + "~";
        } else {
            //last line - no tilt concat required
            lvResId = lvResId + resourceTypeList[i].RESOURCE_TYPE_CODE + "," + 
                                                resourceTypeList[i].RESOURCE_TYPE_NAME + "," + 
                                                resourceTypeList[i].RESOURCE_TYPE; 
        }
    }
    
var procName = constants.SP_PKG_EQUIPMENT + "::p_get_stock_table_clob";
var connection = $.hdb.getConnection();
var stock = connection.loadProcedure(constants.SCHEMA_NAME,procName);
var  result1 = stock(attributeGroupId, resourceFilterId, locationFilterId, resourceCategory, lvNodeId, lvResId, lvLocId);
connection.close();    

var res1 = json2array(result1.OUTPUT_STOCK);
var res2 = json2array(result1.OUTPUT_RESOURCE_TYPE_LIST);

return {
    results: reviseTableResult(res1),
    facetFilterItems:{RESOURCE:res2.map(function(item) {
        return {
            ID: item.RESOURCE_TYPE_CODE,
            NAME: item.RESOURCE_TYPE_NAME,
            TYPE: parseInt(item.RESOURCE_TYPE, 10)
        };
    }
    )}
};
};


stockService.geoTable = function(params) {
    var attributeGroupId = params.obj.attributeGroupId,
    resourceFilterId = params.obj.resourceFilterId,
    locationFilterId = params.obj.locationFilterId,
    resourceCategory = params.obj.resourceCategory,
    nodeIdList = params.obj.nodeIdList,
    resourceTypeList = params.obj.resourceTypeList,
    locationIdList = params.obj.locationIdList;
    
    //Generate nodeId Clob
    var lvNodeId = "";
    for (var i = 0; i < params.obj.nodeIdList.length; i++) {
        if (i !== params.obj.nodeIdList.length - 1) {
        	lvNodeId = lvNodeId + params.obj.nodeIdList[i].NODE_ID + ",";
        } else {
        	lvNodeId = lvNodeId + params.obj.nodeIdList[i].NODE_ID;
        }
    }
    //Generate LOCID Clob
    
    var lvLocId = "";
    for ( i = 0; i < locationIdList.length; i++) {
        if (locationIdList[i].ID === "")   { locationIdList[i].ID = ' '; }
        if (locationIdList[i].NAME === "")     { locationIdList[i].NAME = ' '; }
        if (locationIdList[i].TYPE === "")        { locationIdList[i].TYPE = 0; }
        if (i !== locationIdList.length - 1) {
            lvLocId = lvLocId + locationIdList[i].ID + "," + 
                                                  locationIdList[i].NAME + "," + 
                                                  locationIdList[i].TYPE + "~";
        } else {
            //last line - no tilt concat required
            lvLocId = lvLocId + locationIdList[i].ID + "," + 
                                                locationIdList[i].NAME + "," + 
                                                locationIdList[i].TYPE; 
        }
    }
         
	//Generate resource Clob
    
    var lvResId = "";
    for ( i = 0; i < resourceTypeList.length; i++) {
        if (resourceTypeList[i].RESOURCE_TYPE_CODE === "")   { resourceTypeList[i].RESOURCE_TYPE_CODE = ' '; }
        if (resourceTypeList[i].RESOURCE_TYPE_NAME === "")     { resourceTypeList[i].RESOURCE_TYPE_NAME = ' '; }
        if (resourceTypeList[i].RESOURCE_TYPE)        { resourceTypeList[i].RESOURCE_TYPE = 0; }
        if (i !== resourceTypeList.length - 1) {
            lvResId = lvResId + resourceTypeList[i].RESOURCE_TYPE_CODE + "," + 
                                                  resourceTypeList[i].RESOURCE_TYPE_NAME + "," + 
                                                  resourceTypeList[i].RESOURCE_TYPE + "~";
        } else {
            //last line - no tilt concat required
            lvResId = lvResId + resourceTypeList[i].RESOURCE_TYPE_CODE + "," + 
                                                resourceTypeList[i].RESOURCE_TYPE_NAME + "," + 
                                                resourceTypeList[i].RESOURCE_TYPE; 
        }
    }
       
var procName = constants.SP_PKG_EQUIPMENT + "::p_get_stock_table_resource_location_clob";

var connection = $.hdb.getConnection();
var tableProc = connection.loadProcedure(constants.SCHEMA_NAME,procName);
var  result =  tableProc(attributeGroupId, resourceFilterId, locationFilterId, resourceCategory, lvNodeId, lvResId, lvLocId);
connection.close(); 

var res1 = json2array(result.OUTPUT_STOCK);
var res2 = json2array(result.OUTPUT_RESOURCE_TYPE_LIST);


return {
    results: reviseGeoTableResult(res1),
    facetFilterItems:{RESOURCE:res2.map(function(item) {
        return {
            ID: item.RESOURCE_TYPE_CODE,
            NAME: item.RESOURCE_TYPE_NAME,
            TYPE: parseInt(item.RESOURCE_TYPE, 10)
        };
    })}
};
};

stockService.locationHierarchyForMap = function(params) {
    var locationFilterId = params.obj.locationFilterId;
    var procName = constants.SP_PKG_STOCK + "::p_location_filter_stock_hierarchy";
    var hierarchyProc = new proc.procedure(constants.SCHEMA_NAME, procName);
    var result = hierarchyProc(locationFilterId).RESULT_OUTPUT.map(function(
            item) {
        return {
            LEVEL: item.LEVEL,
            NAME: "LEVEL_" + item.LEVEL / 100
        };
    });
    return result;
};

stockService.locationHierarchy = function(params) {
    var locationFilterId = params.obj.locationFilterId;
    var locations;
    var locationRelationships = [];
    var procName = constants.SP_PKG_STOCK + "::p_location_filter_stock_hierarchy_detail";
    var hierarchyProc = new proc.procedure(constants.SCHEMA_NAME, procName);
    var result = hierarchyProc(locationFilterId);
    locations = result.RESULT_OUTPUT.map(function(item) {
        return {
            ID: item.LOCATION_ID,
            NAME: item.NAME,
            DESC: item.DESC,
            TYPE: item.LOCATION_TYPE,
            LEVEL: item.LEVEL,
            XPOS: item.XPOS,
            YPOS: item.YPOS,
            HAS_OUTPUT_DATASET_FLAG: item.HAS_OUTPUT_FLAG

        };
    });
    if (result.RESULT_RELATION_OUTPUT.length > 0) {
        if (!Object
            .keys(result.RESULT_RELATION_OUTPUT[0])
            .every(
                function(i) {
                    return result.RESULT_RELATION_OUTPUT[0][i] === null;
                })) {
            locationRelationships = result.RESULT_RELATION_OUTPUT
                .map(function(item) {
                    return {
                        PARENT_ID: item.PARENT_ID,
                        PARENT_TYPE: item.PARENT_TYPE,
                        CHILD_ID: item.CHILD_ID,
                        CHILD_TYPE: item.CHILD_TYPE
                    };
                });
        }
    }
    return {locations:locations, locationRelationships: locationRelationships};
};

stockService.setFilters([{
    filter: function() {
        var privilege = "sap.tm.trp.service::UpdateStock";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("STOCK_UPDATE_AUTHORIZE_FAILED",
                    privilege);
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["updateSettings"]
    }, {
    filter: function(params) {
         try{
             var locationType = params.obj.locationType;
             var locationId = params.obj.locationId;
             return geoCheck.authorizeWriteByLocationIdList(locationType, [{ID: locationId}]);
         } catch(e){
             logger.error("LOCATION_FILTER_AUTHORIZE_FAILED",
                     params.route.action,
                     params.obj.locationId);
             throw e;
         }
    },
    only: ["updateSettings"]
    }, {
    filter: function(params) {
        try{
            var filterId = params.obj.locationFilterId;
            if (filterId === -1){
                var location = params.obj.locationIdList[0];
                return geoCheck.authorizeReadByLocationIdList(location.TYPE, [{ID: location.ID}]);
            }
            return geoCheck.authorizeReadByLocationFilterIdList([{ID: filterId}]);
        } catch(e){
            logger.error("LOCATION_FILTER_AUTHORIZE_FAILED",
                    params.route.action,
                    params.obj.locationFilterId);
            throw e;
        }
    },
    only: ["alertsOnMap", "bubbleOnMap", "pieOnMap", "stockTable", "locationHierarchy", "locationHierarchyForMap"]
}]);

stockService.setRoutes([{
    method: $.net.http.GET,
    scope: "collection",
    action: "alertsOnMap",
    response: $.net.http.OK
}, {
    method: $.net.http.GET,
    scope: "member",
    action: "alertsOnMap",
    response: $.net.http.OK
}, {
    method: $.net.http.GET,
    scope: "collection",
    action: "bubbleOnMap",
    response: $.net.http.OK
}, {
    method: $.net.http.GET,
    scope: "member",
    action: "bubbleOnMap",
    response: $.net.http.OK
}, {
    method: $.net.http.GET,
    scope: "collection",
    action: "pieOnMap",
    response: $.net.http.OK
}, {
    method: $.net.http.GET,
    scope: "member",
    action: "pieOnMap",
    response: $.net.http.OK
}, {
    method: $.net.http.POST,
    scope: "collection",
    action: "stockChart",
    response: $.net.http.OK
}, {
    method: $.net.http.POST,
    scope: "collection",
    action: "geoTable",
    response: $.net.http.OK
},{
    method: $.net.http.POST,
    scope: "collection",
    action: "stockTable",
    response: $.net.http.OK
}, {
    method: $.net.http.GET,
    scope: "member",
    action: "locationHierarchyForMap",
    response: $.net.http.OK
}, {
    method: $.net.http.GET,
    scope: "collection",
    action: "locationHierarchyForMap",
    response: $.net.http.OK
}, {
    method: $.net.http.GET,
    scope: "collection",
    action: "locationHierarchy",
    response: $.net.http.OK
},{
    method: $.net.http.PUT,
    scope: "collection",
    action: "updateSettings",
    response: $.net.http.NO_CONTENT
}]);

try{
    stockService.handle();
} finally {
    logger.close();
}
