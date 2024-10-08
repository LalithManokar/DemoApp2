var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var Procedure = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib").procedure;
var utils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib");

var preference = new lib.SimpleRest({
    name: "preference",
    desc: "User Preference"
});

preference.update = function(params) {
    var updatePreference = new Procedure(
            "SAP_TM_TRP",
            "sap.tm.trp.db.systemmanagement.user::p_update_user_preference");

    updatePreference($.session.getUsername(), params.obj.PREFERENCE_ITEMS);
};

preference.show = function(params) {
    var getPreference = new Procedure(
            "SAP_TM_TRP",
            "sap.tm.trp.db.systemmanagement.user::p_get_user_preference");

    var filters = {
        DATA_ID: params.id + "%"
    };

    filters = Object.keys(filters).map(function(item) {
        return [item, "'" + filters[item] + "'"].join(" LIKE ");
    }).join(" AND ");

    var result = getPreference($.session.getUsername(), filters);

    return utils.arrayToObject(result.PREFERENCE_ITEMS.map(function(item) {
        return { key: item.DATA_ID, value: item.VALUE };
    }))[params.id];
};

preference.destroy = function(params) {
    if (params.obj.PREFERENCE_ITEMS.length === 0) {
        var getPreference = new Procedure(
                "SAP_TM_TRP",
                "sap.tm.trp.db.systemmanagement.user::p_get_user_preference");

        var filters = {
            DATA_ID: params.id + "%"
        };

        filters = Object.keys(filters).map(function(item) {
            return [item, "'" + filters[item] + "'"].join(" LIKE ");
        }).join(" AND ");

        params.obj = getPreference($.session.getUsername(), filters);
    }

    var removePreference = new Procedure("SAP_TM_TRP", "sap.tm.trp.db.systemmanagement.user::p_delete_user_preference");

    removePreference($.session.getUsername(), params.obj.PREFERENCE_ITEMS);
};

preference.delete = function(params) {
    if (params.obj.PREFERENCE_ITEMS.length === 0) {
        var getPreference = new Procedure(
                "SAP_TM_TRP",
                "sap.tm.trp.db.systemmanagement.user::p_get_user_preference");

        var filters = {
            USERNAME: $.session.getUsername()
        };

        filters = Object.keys(filters).map(function(item) {
            return [item, "'" + filters[item] + "'"].join(" = ");
        }).join(" AND ");

        params.obj = getPreference($.session.getUsername(), filters);
    }

    var removePreference = new Procedure("SAP_TM_TRP", "sap.tm.trp.db.systemmanagement.user::p_delete_user_preference");

    removePreference($.session.getUsername(), params.obj.PREFERENCE_ITEMS);
};

preference.index = function() {
    var getPreference = new Procedure("SAP_TM_TRP", "sap.tm.trp.db.systemmanagement.user::p_get_user_preference");
    var result = getPreference($.session.getUsername());

    return utils.arrayToObject(result.PREFERENCE_ITEMS.map(function(item) {
        return { key: item.DATA_ID, value: item.VALUE };
    }));
};

preference.setFilters([{
    filter: function(params){ // transform the object to an array
        var preferences = {};

        if (params.id) {
            preferences[params.id] = params.obj;
        } else {
            preferences = params.obj;
        }

        params.obj.PREFERENCE_ITEMS = utils.objectToArray(preferences).map(function(item) {
            return {
                DATA_ID: item.key,
                VALUE: Array.isArray(item) ? JSON.stringify(item.value) : item.value
            };
        });

        return true;
    },
    only: ["destroy", "update", "delete"]
}, {
    filter: function(params){
        if (!$.session.hasAppPrivilege("sap.tm.trp.service::ChangeLocationFilter")) {
            params.obj.PREFERENCE_ITEMS = params.obj.PREFERENCE_ITEMS.filter(function(item) {
                return item.DATA_ID !== "RESOURCE|LAST_USED_LOCATION_FILTER";
            });
        }

        return true;
    },
    only: ["update"]
}]);

try {
    preference.handle();
} catch (e) {
    // silent process the exception
    $.trace.error(e.message);
}