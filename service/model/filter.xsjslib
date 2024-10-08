var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");

function equipmentFilter() {}

equipmentFilter.prototype.validates = [{
    field: "VISIBILITY",
    presence: true,
    on: ["create", "update"],
    args: ["VISIBILITY"],
    message: messages.MSG_FIELD_MISSING
},{
    field: "VISIBILITY",
    inclusion: {
        scope: ['P', 'G']
    },
    on: ["create", "update"],
    args: ["VISIBILITY",['P', 'G'].join(',')],
    message: messages.MSG_KEY_NOT_IN_ENUM
}, {
    field: "ITEMS",
     length: {
        minimum: 1
    },
    args: ["ITEMS", '[1,*]'],
    message: messages.MSG_KEY_LENGTH_INVALID,
    on: ["create", "update"]
}, {
    field: "ITEMS",
    presence: true,
    on: ["create", "update"],
    args: ["ITEMS"],
     message: messages.MSG_FIELD_MISSING
}, {
    field: "TYPE",
    presence: true,
    on: ["create", "update"],
    args: ["TYPE"],
    message: messages.MSG_FIELD_MISSING
},{
    field: "TYPE",
    inclusion: {
        scope: [1, 2]
    },
    on: ["create", "update"],
    args: ["TYPE",[1,2].join(',')],
    message: messages.MSG_KEY_NOT_IN_ENUM
}, {
    field: "NAME",
    presence: true,
    on: ["update", "create"],
    message: messages.MSG_NAME_MISSING
}, {
    field: "NAME",
    length: {
        within: [1, 50]
    },
    message: messages.MSG_KEY_LENGTH_INVALID,
    args: ["NAME",'[1,50]'],
    on: ["create"]
}, {
    field: "NAME",
    uniqueness: {
        sql: 'SELECT 1 FROM "sap.tm.trp.db.filter::t_equipment_filter" WHERE LOWER(DESC) = LOWER(?)'
    },
    message: messages.MSG_NAME_NON_UNIQUE,
    args: ["{NAME}"],
    on: ["create"]
}];
