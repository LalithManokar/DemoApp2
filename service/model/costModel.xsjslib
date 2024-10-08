var utils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');

function costDataset() {
    this.downloadInit = function(obj, getParams) {
        obj.type = getParams("TYPE");
        obj.name = getParams("NAME");
    };
    this.saveInit = function(obj) {
        obj.DESC = obj.DESC || null;
        obj.COST_TYPE_CODE = obj.COST_TYPE_CODE || null;
        obj.CONNECTION_TYPE_CODE = obj.CONNECTION_TYPE_CODE || null;
        obj.DEFAULT_UOM_CODE = obj.DEFAULT_UOM_CODE || null;
        obj.PURCHASE_ORG_ID = obj.PURCHASE_ORG_ID || null;
        obj.AGREEMENT_ID = obj.AGREEMENT_ID || null;
        obj.PROFILE_ID = obj.PROFILE_ID || null;
        if(!utils.isNumeric(obj.EXPIRED_DURATION)){
            obj.EXPIRED_DURATION = null;
        }
        obj.CARRIER_ID_LIST = (obj.CARRIER_ID_LIST === "") ? []
                : obj.CARRIER_ID_LIST.split(",").map(function(item) {
                    return {
                        ID : item
                    };
                });
        obj.CONNECTION_ID = obj.CONNECTION_ID || null;
    };

    this.facetInit = function(obj) {
        obj.search = obj.search ? obj.search.toLowerCase() : "";

        obj.cost_type = obj.filters.hasOwnProperty("COST_TYPE_CODE") ? obj.filters.COST_TYPE_CODE
                .map(function(item) {
                    return {
                        CODE : item
                    };
                })
                : [];

        obj.currency_code = obj.filters.hasOwnProperty("CURRENCY_CODE") ? obj.filters.CURRENCY_CODE
                .map(function(item) {
                    return {
                        CODE : item
                    };
                })
                : [];
    };
}

costDataset.prototype = {
    validates : [
            {
                field : 'NAME',
                presence : true,
                on : [ 'create' ],
                args : [ 'NAME' ],
                message : messages.MSG_NAME_MISSING
            },
            {
                field : 'NAME',
                format : {
                    expr : utils.HUMAN_READABLE_KEY_REGEX
                },
                message : messages.MSG_NAME_INVALID,
                args : [ "{NAME}" ],
                on : [ 'create' ]
            },
            {
                field : 'NAME',
                on : [ 'create' ],
                uniqueness : {
                    sql : 'SELECT 1 FROM  "sap.tm.trp.db.costmodel::t_cost_dataset" WHERE lower(NAME) = lower(?)'
                },
                args : [ '{NAME}' ],
                message : messages.MSG_NAME_NON_UNIQUE
            }, {
                field : 'CURRENCY_CODE',
                presence : true,
                on : [ 'update', 'create' ],
                args : [ 'CURRENCY_CODE' ],
                message : messages.MSG_FIELD_MISSING
            } ],
    afterInitialize : [ {
        method : 'facetInit',
        on : [ 'queryFacetFilter' ]
    }, {
        method : 'downloadInit',
        on : [ 'download' ]
    }, {
        method : 'saveInit',
        on : [ 'update', 'create' ]
    } ]
};

// format the cost datasets according to the responding procedure
var formatCostDatasets = function(costDatasets) {
    var rankList = [], carrierIdList = [], transportationList = [];
    costDatasets.forEach(function(item) {
        var rank = {
            ID : item.COST_DATASET_ID,
            PRIORITY : item.RANK
        };
        var transportation = (item.TRANSPORTATION_MODE_CODES === "") ? []
                : item.TRANSPORTATION_MODE_CODES.split(", ").map(
                        function(modeItem) {
                            return {
                                COST_DATASET_ID : item.COST_DATASET_ID,
                                TRANSPORTATION_MODE_CODE : modeItem
                            };
                        });
        var carrier = (item.CARRIER_IDS === "") ? [{
            COST_DATASET_ID : item.COST_DATASET_ID,
            CARRIER_ID : null
        }] : item.CARRIER_IDS.split(
                ", ").map(function(carrierItem) {
            return {
                COST_DATASET_ID : item.COST_DATASET_ID,
                CARRIER_ID : carrierItem
            };
        });
        rankList.push(rank);
        carrier.forEach(function(item) {
            if (item.length !== 0) {
                carrierIdList.push(item);
            }
        });
        transportation.forEach(function(item) {
            if (item.length !== 0) {
                transportationList.push(item);
            }
        });
    });
    return {
        RANK : rankList,
        CARRIER : carrierIdList,
        TRANSPORTATION : transportationList
    };
};

function costModel() {
    this.init = function(obj) {
        obj.TRANSPORTATION_MODE_CODES = formatCostDatasets(obj.CostDatasets).TRANSPORTATION;
        obj.CARRIER_IDS = formatCostDatasets(obj.CostDatasets).CARRIER;
        obj.RANK = formatCostDatasets(obj.CostDatasets).RANK;
    };

    this.facetInit = function(obj) {
        obj.search = obj.search ? obj.search.toLowerCase() : "";

        obj.currency_code = obj.filters.hasOwnProperty("CURRENCY_CODE") ? obj.filters.CURRENCY_CODE
                .map(function(item) {
                    return {
                        CODE : item
                    };
                })
                : [];
    };
}

costModel.prototype = {
    validates : [
            {
                field : 'NAME',
                presence : true,
                on : [ 'create' ],
                args : [ 'NAME' ],
                message : messages.MSG_NAME_MISSING
            },
            {
                field : 'NAME',
                format : {
                    expr : utils.HUMAN_READABLE_KEY_REGEX
                },
                message : messages.MSG_NAME_INVALID,
                args : [ "{NAME}" ],
                on : [ "create" ]
            },
            {
                field : 'NAME',
                on : [ 'create' ],
                uniqueness : {
                    sql : 'SELECT 1 FROM "sap.tm.trp.db.costmodel::t_cost_model_new" WHERE lower(NAME) = lower(?)'
                },
                args : [ '{NAME}' ],
                message : messages.MSG_NAME_NON_UNIQUE
            }, {
                field : 'CURRENCY_CODE',
                presence : true,
                on : [ 'create', 'update' ],
                args : [ 'CURRENCY_CODE' ],
                message : messages.MSG_FIELD_MISSING
            } ],
    afterInitialize : [ {
        method : 'init',
        on : [ 'update', 'create' ]
    }, {
        method : 'facetInit',
        on : [ 'queryFacetFilter' ]
    }, ]
};
