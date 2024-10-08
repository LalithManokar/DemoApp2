var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");

function Tile() {
    this.init = function(obj) {
        obj.itemList = Object.keys(obj.SETTINGS).map(function(item) {
            return {KEY: item, VALUE: JSON.stringify(obj.SETTINGS[item])};
        });
    };

    this.initUpdateSequence = function(obj) {
        obj.sequencedTiles = obj.ITEMS.map(function(item) {
            return {SEQ: item.SEQUENCE, ID: item.ID};
        });
    };
}
Tile.prototype= {
    validates : [
    {
        field: "TYPE",
        presence: true,
        on: ["create", "update"],
        message: messages.MSG_FIELD_MISSING
    },
    {
        field: "SETTINGS",
        presence: true,
        on: ["create", "update"],
        message: messages.MSG_FIELD_MISSING
    },
    /*{
        field: "SETTINGS",
        on: ["create", "update"],
        validateWith: function(obj) {
            try {
                var av = new $.security.AntiVirus();
                Object.keys(obj.SETTINGS).forEach(function(item) {
                    [].concat(obj.SETTINGS[item]).forEach(function(i) {
                        if (typeof i === "string") {
                            av.scan(i);
                        }
                    });
                });
                return true;
            } catch (e) {
                $.trace.warning(e.message);
                return false;
            }

        },
        message: messages.MSG_FIELD_INVALID
    },*/
    {
        field: "ITEMS",
        presence: true,
        on: ["updateSequence"],
        validateWith: function(obj) {
            return Array.isArray(obj.ITEMS)
            && obj.ITEMS.every(function(item) {
                return item.hasOwnProperty("ID") && item.hasOwnProperty("SEQUENCE");
            })
            && obj.ITEMS.map(function(item) {
                return item.SEQUENCE;
            }).sort().filter(function(item, index, array) {
                return item === array[index - 1];
            }).length === 0;
        },
        message: messages.MSG_FIELD_INVALID
    }],
    afterInitialize: [{
        method: "init",
        on: ["create", "update"]
    }, {
        method: "initUpdateSequence",
        on: ["updateSequence"]
    }]
};




function KPI() {
    this.init = function(obj, getParams) {
        obj.planIds = getParams("plan_id").split(',').map(function(i) {
            return {
                ID: i
            };
        });
        obj.geoIds = getParams("geo_id").split(',').map(function(i) {
            return {
                ID: i
            };
        });
        obj.resIds = getParams("resource_id").split(',').map(function(i) {
            return {
                ID: i
            };
        });
    };
}

KPI.prototype = {
    validates: [{
        field: "plan_id",
        presence: true,
        on: ["index"],
        args: ["plan_id"],
        message: messages.MSG_FIELD_MISSING
    }, {
        field: "geo_id",
        presence: true,
        on: ["index"],
        args: ["geo_id"],
        message: messages.MSG_FIELD_MISSING
    }, {
        field: "resource_id",
        presence: true,
        on: ["index"],
        args: ["resource_id"],
        message: messages.MSG_FIELD_MISSING
    }],
    afterInitialize: [{
        method: "init",
        on: ["index"]
    }]
};
