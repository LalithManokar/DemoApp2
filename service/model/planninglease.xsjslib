var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");

function PlanningLeaseInformation() {
    this.init = function(obj) {
        obj.search = obj.search ? obj.search.toLowerCase() : "";
        var filterObj = obj.filters || {};
        obj.LEASE_CONTRACT_TYPE_LIST_INPUT = filterObj
                .hasOwnProperty('LEASE_CONTRACT_TYPE') ? filterObj.LEASE_CONTRACT_TYPE
                .map(function(str) {
                    return {
                        STR : str
                    };
                })
                : [];

    };

    this.leaseFacetFilterInit = function(obj) {
        var filterObj = obj.filters || {};
        obj.LESSOR_LIST_INPUT = filterObj.hasOwnProperty('LESSOR') ? filterObj.LESSOR
                .map(function(str) {
                    return {
                        STR : str
                    };
                })
                : [];
    };
}

PlanningLeaseInformation.prototype = {
    validates : [
            {
                field : "LOCATION",
                presence : true,
                on : [ "facetFilter" ],
                args : [ "LOCATION" ],
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : "LOCATION",
                length : {
                    within : [ 1, 22 ]
                },
                args : [ "LOCATION" ],
                message : messages.MSG_KEY_LENGTH_INVALID
            },
            {
                field : "DATE",
                presence : true,
                on : [ "facetFilter" ],
                args : [ "DATE" ],
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : 'DATE',
                on : [ 'facetFilter' ],
                validateWith : function(obj) {
                    return obj.DATE ? Date.parse(obj.DATE) : true;
                },
                message : messages.MSG_FIELD_INVALID,
                args : [ '{DATE}' ]
            },
            {
                field : "RESOURCE_TYPE",
                presence : true,
                on : [ "facetFilter" ],
                args : [ "RESOURCE_TYPE" ],
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : "RESOURCE_TYPE",
                length : {
                    within : [ 1, 22 ]
                },
                args : [ "RESOURCE_TYPE" ],
                message : messages.MSG_KEY_LENGTH_INVALID
            },
            {
                field : "DEMAND_QUANTITY",
                presence : true,
                on : [ "facetFilter" ],
                args : [ "DEMAND_QUANTITY" ],
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : "DEMAND_QUANTITY",
                on : "facetFilter",
                numericality : true,
                args : [ "DEMAND_QUANTITY" ],
                message : messages.MSG_KEY_NOT_A_NUMBER
            },
            {
                field : "SCENARIO_ID",
                presence : true,
                on : [ "facetFilter" ],
                args : [ "SCENARIO_ID" ],
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : "SCENARIO_ID",
                on : "facetFilter",
                numericality : true,
                args : [ "SCENARIO_ID" ],
                message : messages.MSG_KEY_NOT_A_NUMBER
            },
            {
                field : 'filters',
                on : [ 'facetFilter' ],
                validateWith : function(obj) {
                    var filterObj = obj.filters;
                    if (!filterObj) {
                        return true;
                    } else {
                        if (!(filterObj instanceof Object)) {
                            return false;
                        }
                        if (filterObj.hasOwnProperty('LESSOR')
                                && !(filterObj.LESSOR instanceof Array)) {
                            return false;
                        }
                        if (filterObj.hasOwnProperty('LEASE_CONTRACT_TYPE')
                                && !(filterObj.LEASE_CONTRACT_TYPE instanceof Array)) {
                            return false;
                        }

                        return true;
                    }
                },
                message : messages.MSG_FIELD_INVALID,
                args : [ '{filters}' ],
            } ],
    afterInitialize : [ {
        method : 'init',
        on : [ 'facetFilter', 'queryFacetFilter' ]
    }, {
        method : 'leaseFacetFilterInit',
        on : [ 'facetFilter' ]
    } ]
};
