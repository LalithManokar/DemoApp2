var reviseArraySD = function(array,switchFlag) {
    var objectArray = {}, period, time, outArray = {}, exec_id, node_id, node_name, node_nav_type, tempArray = [], key;
    for (var i in array) {
          if (switchFlag) {
              key = array[i].RESOURCE_TYPE_CODE + '_%_' + array[i].START_TIME; //mock a hash map
          } else {
              key = array[i].GEO_ID + '_%_' + array[i].START_TIME; //mock a hash map
          }
        if (key in objectArray) {
            switch (array[i].OUTPUT_KEY) {
                case 'SUPPLY':
                    objectArray[key].SUPPLY = objectArray[key].SUPPLY || {};
                    objectArray[key].SUPPLY.VALUE = Number(array[i].OUTPUT_VALUE);
                    objectArray[key].SUPPLY.ALERT = array[i].ALERT_STATUS;
                    objectArray[key].SUPPLY.HAS_DRILLDOWN_FLAG = array[i].HAS_DRILLDOWN_FLAG;
                    break;
                case 'DEMAND':
                    objectArray[key].DEMAND = objectArray[key].DEMAND || {};
                    objectArray[key].DEMAND.VALUE = Number(array[i].OUTPUT_VALUE);
                    objectArray[key].DEMAND.ALERT = array[i].ALERT_STATUS;
                    objectArray[key].DEMAND.HAS_DRILLDOWN_FLAG = array[i].HAS_DRILLDOWN_FLAG;
                    break;
                case 'STOCK':
                    objectArray[key].STOCK = objectArray[key].STOCK || {};
                    objectArray[key].STOCK.VALUE = Number(array[i].OUTPUT_VALUE);
                    objectArray[key].STOCK.ALERT = array[i].ALERT_STATUS;
                    objectArray[key].STOCK.HAS_DRILLDOWN_FLAG = array[i].HAS_DRILLDOWN_FLAG;
                    break;
                case 'SUPPLY_LOWERBOUND':
                    objectArray[key].SUPPLY = objectArray[key].SUPPLY || {};
                    objectArray[key].SUPPLY.SUPPLY_LOWER_BOUND = Number(array[i].OUTPUT_VALUE);
                    break;
                case 'SUPPLY_UPPERBOUND':
                    objectArray[key].SUPPLY = objectArray[key].SUPPLY || {};
                    objectArray[key].SUPPLY.SUPPLY_UPPER_BOUND = Number(array[i].OUTPUT_VALUE);
                    break;
                case 'DEMAND_LOWERBOUND':
                    objectArray[key].DEMAND = objectArray[key].DEMAND || {};
                    objectArray[key].DEMAND.DEMAND_LOWER_BOUND = Number(array[i].OUTPUT_VALUE);
                    break;
                case 'DEMAND_UPPERBOUND':
                    objectArray[key].DEMAND = objectArray[key].DEMAND || {};
                    objectArray[key].DEMAND.DEMAND_UPPER_BOUND = Number(array[i].OUTPUT_VALUE);
                    break;
            }
        } else {
            objectArray[key] = {};
            // objectArray[key].GEO_ID = array[i].GEO_ID;
            // objectArray[key].GEO_NAME = array[i].GEO_NAME;
            if (array[i].GEO_ID) {
                objectArray[key].GEO_ID = array[i].GEO_ID;
                objectArray[key].GEO_NAME = array[i].GEO_NAME;
            }
            if (array[i].RESOURCE_TYPE_CODE) {
                objectArray[key].RESOURCE_TYPE_CODE = array[i].RESOURCE_TYPE_CODE;
                objectArray[key].RESOURCE_TYPE_NAME = array[i].RESOURCE_TYPE_NAME;
            }
            objectArray[key].SEQUENCE = array[i].SEQUENCE;
            objectArray[key].START_TIME = array[i].START_TIME;
            objectArray[key].END_TIME = array[i].END_TIME;
            objectArray[key].TIME_INTERVAL = Number(array[i].TIME_INTERVAL);
            objectArray[key].PLAN_STATUS = array[i].PLAN_STATUS;
            if (array[i].OUT_NODE_ID) {
               node_id = array[i].OUT_NODE_ID;
            }
            if (array[i].OUT_NODE_NAME) {
                node_name = array[i].OUT_NODE_NAME;
            }
            if (array[i].OUT_NODE_NAV_TYPE) {
                node_nav_type = array[i].OUT_NODE_NAV_TYPE;
            }
            if (array[i].hasOwnProperty("OUT_EXECUTION_ID")) {
                exec_id = array[i].OUT_EXECUTION_ID;
            }
            // if (geoFlag) {
            //     objectArray[key].RESOURCE_TYPE_CODE = array[i].RESOURCE_TYPE_CODE;
            //     objectArray[key].RESOURCE_TYPE_NAME = array[i].RESOURCE_TYPE_NAME;
            // }
            switch (array[i].OUTPUT_KEY) {
                case 'SUPPLY':
                    objectArray[key].SUPPLY = {};
                    objectArray[key].SUPPLY.VALUE = Number(array[i].OUTPUT_VALUE);
                    objectArray[key].SUPPLY.ALERT = array[i].ALERT_STATUS;
                    objectArray[key].SUPPLY.HAS_DRILLDOWN_FLAG = array[i].HAS_DRILLDOWN_FLAG;
                    break;
                case 'DEMAND':
                    objectArray[key].DEMAND = {};
                    objectArray[key].DEMAND.VALUE = Number(array[i].OUTPUT_VALUE);
                    objectArray[key].DEMAND.ALERT = array[i].ALERT_STATUS;
                    objectArray[key].DEMAND.HAS_DRILLDOWN_FLAG = array[i].HAS_DRILLDOWN_FLAG;
                    break;
                case 'STOCK':
                    objectArray[key].STOCK = {};
                    objectArray[key].STOCK.VALUE = Number(array[i].OUTPUT_VALUE);
                    objectArray[key].STOCK.ALERT = array[i].ALERT_STATUS;
                    objectArray[key].STOCK.HAS_DRILLDOWN_FLAG = array[i].HAS_DRILLDOWN_FLAG;
                    break;
                case 'SUPPLY_LOWERBOUND':
                    objectArray[key].SUPPLY = {};
                    objectArray[key].SUPPLY.SUPPLY_LOWER_BOUND = Number(array[i].OUTPUT_VALUE);
                    break;
                case 'SUPPLY_UPPERBOUND':
                    objectArray[key].SUPPLY = {};
                    objectArray[key].SUPPLY.SUPPLY_UPPER_BOUND = Number(array[i].OUTPUT_VALUE);
                    break;
                case 'DEMAND_LOWERBOUND':
                    objectArray[key].DEMAND = {};
                    objectArray[key].DEMAND.DEMAND_LOWER_BOUND = Number(array[i].OUTPUT_VALUE);
                    break;
                case 'DEMAND_UPPERBOUND':
                    objectArray[key].DEMAND = {};
                    objectArray[key].DEMAND.DEMAND_UPPER_BOUND = Number(array[i].OUTPUT_VALUE);
                    break;
            }
        }
    }
    for (var idx in objectArray) {
        tempArray.push(objectArray[idx]);
    }



    outArray.EXEC_ID = exec_id;
    outArray.NODE_ID = node_id;
    outArray.NODE_INFO = {};
    outArray.NODE_INFO.ID = node_id;
    outArray.NODE_INFO.NAME = node_name;
    outArray.NODE_INFO.NAV_TYPE = node_nav_type || '';
    outArray.results = tempArray.sort(function(a, b) {
        if (switchFlag) {
            return a.RESOURCE_TYPE_NAME > b.RESOURCE_TYPE_NAME;
        } else {
            return a.GEO_NAME > b.GEO_NAME;

        }
    });
    return outArray;
};

var reviseArraySDForTrackingData = function(array) {
    var objectArray = {}, outArray = [], key;
    for (var i in array) {
        key = array[i].RESOURCE_TYPE_CODE + '_%_' + array[i].GEO_ID + "_%_" + array[i].START_TIME; //mock a hash map

        if (key in objectArray) {
            switch (array[i].OUTPUT_KEY) {
                case 'SUPPLY':
                    objectArray[key].SUPPLY = objectArray[key].SUPPLY || {};
                    objectArray[key].SUPPLY.VALUE = Number(array[i].OUTPUT_VALUE);
                    break;
                case 'DEMAND':
                    objectArray[key].DEMAND = objectArray[key].DEMAND || {};
                    objectArray[key].DEMAND.VALUE = Number(array[i].OUTPUT_VALUE);
                    break;
                case 'STOCK':
                    objectArray[key].STOCK = objectArray[key].STOCK || {};
                    objectArray[key].STOCK.VALUE = Number(array[i].OUTPUT_VALUE);
                    break;
            }
        } else {
            objectArray[key] = {};
            objectArray[key].GEO_ID = array[i].GEO_ID;
            objectArray[key].GEO_NAME = array[i].GEO_NAME;
            objectArray[key].SEQUENCE = array[i].SEQUENCE;
            objectArray[key].START_TIME = array[i].START_TIME;
            objectArray[key].END_TIME = array[i].END_TIME;
            objectArray[key].TIME_INTERVAL = Number(array[i].TIME_INTERVAL);
            objectArray[key].PLAN_STATUS = array[i].PLAN_STATUS;
            objectArray[key].RESOURCE_TYPE_CODE = array[i].RESOURCE_TYPE_CODE;
            objectArray[key].RESOURCE_TYPE_NAME = array[i].RESOURCE_TYPE_NAME;

            switch (array[i].OUTPUT_KEY) {
                case 'SUPPLY':
                    objectArray[key].SUPPLY = {};
                    objectArray[key].SUPPLY.VALUE = Number(array[i].OUTPUT_VALUE);
                    break;
                case 'DEMAND':
                    objectArray[key].DEMAND = {};
                    objectArray[key].DEMAND.VALUE = Number(array[i].OUTPUT_VALUE);
                    break;
                case 'STOCK':
                    objectArray[key].STOCK = {};
                    objectArray[key].STOCK.VALUE = Number(array[i].OUTPUT_VALUE);
                    break;
            }
        }
    }

    for (var idx in objectArray) {
        outArray.push(objectArray[idx]);
    }

    return {
        results: outArray
    };
};

var reviseArrayPieResults = function(array, field) {
    var objectArray = {}, outArray = [];
    for (var i in array) {
        var key = array[i].LOCATION_ID;
        if (!objectArray.hasOwnProperty(key)) {
            objectArray[key] = {};
            objectArray[key].LOCATION_ID = array[i].LOCATION_ID;
            objectArray[key].LOCATION_NAME = array[i].LOCATION_NAME;
            if(field === "POLYGON") {
                objectArray[key].BOUNDARY = array[i].BOUNDARY;
            } else {
                objectArray[key].LATITUDE = array[i].LATITUDE;
                objectArray[key].LONGITUDE = array[i].LONGITUDE;
            }
        }
        switch (array[i].PARENT_OUTPUT_KEY) {
            case 'STOCK':
                objectArray[key].STOCK = objectArray[key].STOCK || {};
                objectArray[key].STOCK[array[i].OUTPUT_KEY] = Number(array[i].OUTPUT_VALUE);
                break;
            case 'SUPPLY':
                objectArray[key].SUPPLY = objectArray[key].SUPPLY || {};
                objectArray[key].SUPPLY[array[i].OUTPUT_KEY] = Number(array[i].OUTPUT_VALUE);
                break;
            case 'DEMAND':
                objectArray[key].DEMAND = objectArray[key].DEMAND || {};
                objectArray[key].DEMAND[array[i].OUTPUT_KEY] = Number(array[i].OUTPUT_VALUE);
                break;
        }
    }
    for (var idx in objectArray) {

         outArray.push(objectArray[idx]);
    }
    return outArray;
};

/*var reviseArrayDetail = function(array, outputKey) {
    var objectArray = {}, outArray = [];
    for (var i in array) {
        var key = array[i].LOCATION_ID;
        if (!objectArray.hasOwnProperty(key)) {
            objectArray[key] = {};
            objectArray[key].GEO_ID = array[i].LOCATION_ID;
        }
        switch (array[i].OUTPUT_KEY) {
            case 'STOCK':
                objectArray[key].STOCK = objectArray[key].STOCK || {};
                objectArray[key].STOCK[array[i].DRILLDOWN_OUTPUT_KEY] = Number(array[i].OUTPUT_VALUE);
                break;
            case 'SUPPLY':
                objectArray[key].SUPPLY = objectArray[key].SUPPLY || {};
                objectArray[key].SUPPLY[array[i].DRILLDOWN_OUTPUT_KEY] = Number(array[i].OUTPUT_VALUE);
                break;
            case 'DEMAND':
                objectArray[key].DEMAND = objectArray[key].DEMAND || {};
                objectArray[key].DEMAND[array[i].DRILLDOWN_OUTPUT_KEY] = Number(array[i].OUTPUT_VALUE);
                break;
        }
    }
    for (var idx in objectArray) {
        var tmpObj = {};
        for (var i in outputKey) {
            switch (outputKey[i].OUTPUT_KEY) {
                case 'SUPPLY':
                    tmpObj.SUPPLY = objectArray[idx].SUPPLY;
                    break;
                case 'DEMAND':
                    tmpObj.DEMAND = objectArray[idx].DEMAND;
                    break;
                case 'STOCK':
                    tmpObj.STOCK = objectArray[idx].STOCK;
                    break;
            }
        }
        tmpObj.GEO_ID = objectArray[idx].GEO_ID;
        outArray.push(tmpObj);
    }
    return outArray;
}*/

//add navigation
var reviseArrayDetail = function(array, outputKey) {
    var objectArray = {}, outArray = [];
    for (var i in array) {
        var key = array[i].LOCATION_ID;
        if (!objectArray.hasOwnProperty(key)) {
            objectArray[key] = {};
            objectArray[key].GEO_ID = array[i].LOCATION_ID;
        }
        switch (array[i].OUTPUT_KEY) {
            case 'STOCK':
                objectArray[key].STOCK = objectArray[key].STOCK || {};
                objectArray[key].STOCK[array[i].DRILLDOWN_OUTPUT_KEY] = objectArray[key].STOCK[array[i].DRILLDOWN_OUTPUT_KEY] || {};
                objectArray[key].STOCK[array[i].DRILLDOWN_OUTPUT_KEY].VALUE = Number(array[i].OUTPUT_VALUE);
                objectArray[key].STOCK[array[i].DRILLDOWN_OUTPUT_KEY].NAV_TYPE = array[i].DRILLDOWN_NODE_NAV_TYPE || '';
                break;
            case 'SUPPLY':
                objectArray[key].SUPPLY = objectArray[key].SUPPLY || {};
                objectArray[key].SUPPLY[array[i].DRILLDOWN_OUTPUT_KEY] = objectArray[key].SUPPLY[array[i].DRILLDOWN_OUTPUT_KEY] || {};
                objectArray[key].SUPPLY[array[i].DRILLDOWN_OUTPUT_KEY].VALUE = Number(array[i].OUTPUT_VALUE);
                objectArray[key].SUPPLY[array[i].DRILLDOWN_OUTPUT_KEY].NAV_TYPE = array[i].DRILLDOWN_NODE_NAV_TYPE || '';
                break;
            case 'DEMAND':
                objectArray[key].DEMAND = objectArray[key].DEMAND || {};
                objectArray[key].DEMAND[array[i].DRILLDOWN_OUTPUT_KEY] = objectArray[key].DEMAND[array[i].DRILLDOWN_OUTPUT_KEY] || {};
                objectArray[key].DEMAND[array[i].DRILLDOWN_OUTPUT_KEY].VALUE = Number(array[i].OUTPUT_VALUE);
                objectArray[key].DEMAND[array[i].DRILLDOWN_OUTPUT_KEY].NAV_TYPE = array[i].DRILLDOWN_NODE_NAV_TYPE || '';
                break;
        }
    }

    for (var idx in objectArray) {
        var tmpObj = {};
        for (var i in outputKey) {
            switch (outputKey[i].OUTPUT_KEY) {
                case 'SUPPLY':
                    tmpObj.SUPPLY = objectArray[idx].SUPPLY;
                    break;
                case 'DEMAND':
                    tmpObj.DEMAND = objectArray[idx].DEMAND;
                    break;
                case 'STOCK':
                    tmpObj.STOCK = objectArray[idx].STOCK;
                    break;
            }
        }
        tmpObj.GEO_ID = objectArray[idx].GEO_ID;
        outArray.push(tmpObj);
    }
    return outArray;
}

var reviseArraySDAllDetails = function(array, switchFlag, nodeId, nodeName) {
    var objectArray = {}, period, time, outArray = {}, tempArray = [], key;
    for (var i in array) {
          if (switchFlag) {
              key = array[i].RESOURCE_TYPE_CODE + '_%_' + array[i].GEO_ID + '_%_' + array[i].START_TIME; //mock a hash map
          } else {
              key = array[i].GEO_ID + '_%_' + array[i].RESOURCE_TYPE_CODE + '_%_' + array[i].START_TIME; //mock a hash map
          }
        if (key in objectArray) {
            switch (array[i].OUTPUT_KEY) {
                case 'SUPPLY':
                    objectArray[key].SUPPLY = objectArray[key].SUPPLY || {};
                    if (Number(array[i].DRILLDOWN_NODE_ID) === nodeId || (nodeName && array[i].DRILLDOWN_OUTPUT_KEY === "SUPPLY")){
                        objectArray[key].SUPPLY['TOTAL'] = objectArray[key].SUPPLY['TOTAL'] || {};
                        objectArray[key].SUPPLY['TOTAL'].VALUE = Number(array[i].OUTPUT_VALUE);
                        objectArray[key].SUPPLY['TOTAL'].ALERT = array[i].ALERT_STATUS;
                    } else{
                        objectArray[key].SUPPLY[array[i].DRILLDOWN_OUTPUT_KEY] = objectArray[key].SUPPLY[array[i].DRILLDOWN_OUTPUT_KEY] || {};
                        objectArray[key].SUPPLY[array[i].DRILLDOWN_OUTPUT_KEY].VALUE = Number(array[i].OUTPUT_VALUE);
                        objectArray[key].SUPPLY[array[i].DRILLDOWN_OUTPUT_KEY].NAV_TYPE = array[i].DRILLDOWN_NODE_NAV_TYPE || '';
                        objectArray[key].SUPPLY[array[i].DRILLDOWN_OUTPUT_KEY].ALERT = array[i].ALERT_STATUS;
                        objectArray[key].SUPPLY[array[i].DRILLDOWN_OUTPUT_KEY].NODE_ID = Number(array[i].DRILLDOWN_NODE_ID) || null;
                        objectArray[key].SUPPLY[array[i].DRILLDOWN_OUTPUT_KEY].METADATA_NODE_ID = array[i].DRILLDOWN_OUTPUT_KEY || '';
                    }
                    break;
                case 'DEMAND':
                    objectArray[key].DEMAND = objectArray[key].DEMAND || {};
                    if (Number(array[i].DRILLDOWN_NODE_ID) === nodeId || (nodeName && array[i].DRILLDOWN_OUTPUT_KEY === "DEMAND")){
                        objectArray[key].DEMAND['TOTAL'] = objectArray[key].DEMAND['TOTAL'] || {};
                        objectArray[key].DEMAND['TOTAL'].VALUE = Number(array[i].OUTPUT_VALUE);
                        objectArray[key].DEMAND['TOTAL'].ALERT = array[i].ALERT_STATUS;
                    }else{
                        objectArray[key].DEMAND[array[i].DRILLDOWN_OUTPUT_KEY] = objectArray[key].DEMAND[array[i].DRILLDOWN_OUTPUT_KEY] || {};
                        objectArray[key].DEMAND[array[i].DRILLDOWN_OUTPUT_KEY].VALUE = Number(array[i].OUTPUT_VALUE);
                        objectArray[key].DEMAND[array[i].DRILLDOWN_OUTPUT_KEY].NAV_TYPE = array[i].DRILLDOWN_NODE_NAV_TYPE || '';
                        objectArray[key].DEMAND[array[i].DRILLDOWN_OUTPUT_KEY].ALERT = array[i].ALERT_STATUS;
                        objectArray[key].DEMAND[array[i].DRILLDOWN_OUTPUT_KEY].NODE_ID = Number(array[i].DRILLDOWN_NODE_ID) || null;
                        objectArray[key].DEMAND[array[i].DRILLDOWN_OUTPUT_KEY].METADATA_NODE_ID = array[i].DRILLDOWN_OUTPUT_KEY || '';
                    }
                    break;
                case 'STOCK':
                    objectArray[key].STOCK = objectArray[key].STOCK || {};
                    if (Number(array[i].DRILLDOWN_NODE_ID) === nodeId || (nodeName && array[i].DRILLDOWN_OUTPUT_KEY === "STOCK")){
                        objectArray[key].STOCK['TOTAL'] = objectArray[key].STOCK['TOTAL'] || {};
                        objectArray[key].STOCK['TOTAL'].VALUE = Number(array[i].OUTPUT_VALUE);
                        objectArray[key].STOCK['TOTAL'].ALERT = array[i].ALERT_STATUS;
                    } else{
                        objectArray[key].STOCK[array[i].DRILLDOWN_OUTPUT_KEY] = objectArray[key].STOCK[array[i].DRILLDOWN_OUTPUT_KEY] || {};
                        objectArray[key].STOCK[array[i].DRILLDOWN_OUTPUT_KEY].VALUE = Number(array[i].OUTPUT_VALUE);
                        objectArray[key].STOCK[array[i].DRILLDOWN_OUTPUT_KEY].NAV_TYPE = array[i].DRILLDOWN_NODE_NAV_TYPE || '';
                        objectArray[key].STOCK[array[i].DRILLDOWN_OUTPUT_KEY].ALERT = array[i].ALERT_STATUS;
                        objectArray[key].STOCK[array[i].DRILLDOWN_OUTPUT_KEY].NODE_ID = Number(array[i].DRILLDOWN_NODE_ID) || null;
                        objectArray[key].STOCK[array[i].DRILLDOWN_OUTPUT_KEY].METADATA_NODE_ID = array[i].DRILLDOWN_OUTPUT_KEY || '';
                    }
                    break;
            }
        } else {
            objectArray[key] = {};

            if (array[i].GEO_ID) {
                objectArray[key].GEO_ID = array[i].GEO_ID;
                objectArray[key].GEO_NAME = array[i].GEO_NAME;
            }
            if (array[i].RESOURCE_TYPE_CODE) {
                objectArray[key].RESOURCE_TYPE_CODE = array[i].RESOURCE_TYPE_CODE;
                objectArray[key].RESOURCE_TYPE_NAME = array[i].RESOURCE_TYPE_NAME;
            }
            objectArray[key].SEQUENCE = array[i].SEQUENCE;
            objectArray[key].START_TIME = array[i].START_TIME;
            objectArray[key].END_TIME = array[i].END_TIME;
            objectArray[key].TIME_INTERVAL = Number(array[i].TIME_INTERVAL);

            switch (array[i].OUTPUT_KEY) {
                case 'SUPPLY':
                    objectArray[key].SUPPLY = {};
                    if (Number(array[i].DRILLDOWN_NODE_ID) === nodeId || (nodeName && array[i].DRILLDOWN_OUTPUT_KEY === "SUPPLY")){
                        objectArray[key].SUPPLY['TOTAL'] = objectArray[key].SUPPLY['TOTAL'] || {};
                        objectArray[key].SUPPLY['TOTAL'].VALUE = Number(array[i].OUTPUT_VALUE);
                        objectArray[key].SUPPLY['TOTAL'].ALERT = array[i].ALERT_STATUS;
                    }else{
                        objectArray[key].SUPPLY[array[i].DRILLDOWN_OUTPUT_KEY] = objectArray[key].SUPPLY[array[i].DRILLDOWN_OUTPUT_KEY] || {};
                        objectArray[key].SUPPLY[array[i].DRILLDOWN_OUTPUT_KEY].VALUE = Number(array[i].OUTPUT_VALUE);
                        objectArray[key].SUPPLY[array[i].DRILLDOWN_OUTPUT_KEY].NAV_TYPE = array[i].DRILLDOWN_NODE_NAV_TYPE || '';
                        objectArray[key].SUPPLY[array[i].DRILLDOWN_OUTPUT_KEY].ALERT = array[i].ALERT_STATUS;
                        objectArray[key].SUPPLY[array[i].DRILLDOWN_OUTPUT_KEY].NODE_ID = Number(array[i].DRILLDOWN_NODE_ID) || null;
                        objectArray[key].SUPPLY[array[i].DRILLDOWN_OUTPUT_KEY].METADATA_NODE_ID = array[i].DRILLDOWN_OUTPUT_KEY || '';
                    }
                    break;
                case 'DEMAND':
                    objectArray[key].DEMAND = {};
                    if (Number(array[i].DRILLDOWN_NODE_ID) === nodeId || (nodeName && array[i].DRILLDOWN_OUTPUT_KEY === "DEMAND")){
                        objectArray[key].DEMAND['TOTAL'] = objectArray[key].DEMAND['TOTAL'] || {};
                        objectArray[key].DEMAND['TOTAL'].VALUE = Number(array[i].OUTPUT_VALUE);
                        objectArray[key].DEMAND['TOTAL'].ALERT = array[i].ALERT_STATUS;
                    }else{
                        objectArray[key].DEMAND[array[i].DRILLDOWN_OUTPUT_KEY] = objectArray[key].DEMAND[array[i].DRILLDOWN_OUTPUT_KEY] || {};
                        objectArray[key].DEMAND[array[i].DRILLDOWN_OUTPUT_KEY].VALUE = Number(array[i].OUTPUT_VALUE);
                        objectArray[key].DEMAND[array[i].DRILLDOWN_OUTPUT_KEY].NAV_TYPE = array[i].DRILLDOWN_NODE_NAV_TYPE || '';
                        objectArray[key].DEMAND[array[i].DRILLDOWN_OUTPUT_KEY].ALERT = array[i].ALERT_STATUS;
                        objectArray[key].DEMAND[array[i].DRILLDOWN_OUTPUT_KEY].NODE_ID = Number(array[i].DRILLDOWN_NODE_ID) || null;
                        objectArray[key].DEMAND[array[i].DRILLDOWN_OUTPUT_KEY].METADATA_NODE_ID = array[i].DRILLDOWN_OUTPUT_KEY || '';
                    }
                    break;
                case 'STOCK':
                    objectArray[key].STOCK = {};
                    if (Number(array[i].DRILLDOWN_NODE_ID) === nodeId || (nodeName && array[i].DRILLDOWN_OUTPUT_KEY === "STOCK")){
                        objectArray[key].STOCK['TOTAL'] = objectArray[key].STOCK['TOTAL'] || {};
                        objectArray[key].STOCK['TOTAL'].VALUE = Number(array[i].OUTPUT_VALUE);
                        objectArray[key].STOCK['TOTAL'].ALERT = array[i].ALERT_STATUS;
                    }else{
                        objectArray[key].STOCK[array[i].DRILLDOWN_OUTPUT_KEY] = objectArray[key].STOCK[array[i].DRILLDOWN_OUTPUT_KEY] || {};
                        objectArray[key].STOCK[array[i].DRILLDOWN_OUTPUT_KEY].VALUE = Number(array[i].OUTPUT_VALUE);
                        objectArray[key].STOCK[array[i].DRILLDOWN_OUTPUT_KEY].NAV_TYPE = array[i].DRILLDOWN_NODE_NAV_TYPE || '';
                        objectArray[key].STOCK[array[i].DRILLDOWN_OUTPUT_KEY].ALERT = array[i].ALERT_STATUS;
                        objectArray[key].STOCK[array[i].DRILLDOWN_OUTPUT_KEY].NODE_ID = Number(array[i].DRILLDOWN_NODE_ID) || null;
                        objectArray[key].STOCK[array[i].DRILLDOWN_OUTPUT_KEY].METADATA_NODE_ID = array[i].DRILLDOWN_OUTPUT_KEY || '';
                    }
                    break;
            }
        }
    }
    for (var idx in objectArray) {
        tempArray.push(objectArray[idx]);
    }

    outArray.results = tempArray.sort(function(a, b) {
        if (switchFlag) {
            return a.RESOURCE_TYPE_NAME > b.RESOURCE_TYPE_NAME;
        } else {
            return a.GEO_NAME > b.GEO_NAME;

        }
    });
    return outArray;
};
