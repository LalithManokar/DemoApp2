var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');

function EacConfiguration() {
    // init default value for optional value when creating and update
    this.init = function(obj) {
        // add parameters according to the design
        obj.NAME = obj.NAME || null;
        obj.DESCRIPTION = obj.DESCRIPTION || null;
        // obj.SCHEMA = obj.SCHEMA || null;
        obj.PROCEDURE = obj.PROCEDURE || null;

        obj.LOCATIONS = obj.LOCATIONS || [];
    };
}
EacConfiguration.prototype = {
    validates : [
        // {
        //         field : "NAME",
        //         uniqueness : {
        //             sql : 'SELECT 1 FROM "sap.tm.trp.db.pickupreturn.rulesetgroup::t_ruleset_schedule_group" WHERE LOWER(NAME) = LOWER(?)'
        //         },
        //         message : messages.MSG_NAME_NON_UNIQUE,
        //         args : [ "{NAME}" ],
        //         on : [ "create" ]
        //     },
            {
                field : "NAME",
                format : {
                    expr : /^[A-Z][A-Z0-9_]{4,19}$/
                },
                message : messages.MSG_NAME_INVALID,
                args : [ "{NAME}" ],
                on : [ "create" ]
            },
            {
                field : 'NAME',
                presence : true,
                on : [ 'create'],
                args : [ 'NAME' ],
                message : messages.MSG_NAME_MISSING
            }
    ]
    // afterInitialize : [{
    //         method : function(obj, getParams) {
    //             obj.search = obj.search ? obj.search.toLowerCase() : "";
    //             var filterObj = obj.filters || {};
    //             obj.RULESET_TYPE_LIST = filterObj.RULESET_TYPE ? filterObj.RULESET_TYPE
    //                     .map(transferIdToRow)
    //                     : [];
    //             obj.JOB_PROCESS_ID_LIST = filterObj.JOB_PROCESS_ID ? filterObj.JOB_PROCESS_ID
    //                     .map(transferIdToRow)
    //                     : [];
    //         },
    //         on : [ 'facetFilter' ]
    //     }]
}