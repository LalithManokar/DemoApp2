var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');

function locationGroup() {
    // init default value for optional value when creating and update
    this.init = function(obj) {
        // add parameters according to the design
        obj.ACTIVATION_STATUS = obj.ACTIVATION_STATUS || null;
        obj.GROUP_FIELD_NAME_ONE = obj.GROUP_FIELD_NAME_ONE || null;
        obj.GROUP_FIELD_NAME_TWO = obj.GROUP_FIELD_NAME_TWO || null;

    };
}
locationGroup.prototype = {
    validates : [

            {
                field : "GROUP_FIELD_NAME_ONE",
                format : {
                    expr : /^[A-Z][A-Z0-9_]{4,19}$/
                },
                message : messages.MSG_NAME_INVALID,
                args : [ "{GROUP_FIELD_NAME_ONE}" ],
                on : [ "create" ]
            },
            {
                field : 'GROUP_FIELD_NAME_TWO',
                presence : true,
                on : [ 'create'],
                args : [ 'GROUP_FIELD_NAME_TWO' ],
                message : messages.MSG_NAME_MISSING
            }
    ]

}