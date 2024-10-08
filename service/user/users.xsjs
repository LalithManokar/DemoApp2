var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var model = $.import("/sap/tm/trp/service/model/user.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var utils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib");

var entity = new lib.SimpleRest({
    name: "profile",
    desc: "update profile information",
    model: new model.User()
});

// get user settings and privileges
entity.settings = function() {
    var conet;
    try {
        conet = $.db.getConnection();
        var getUserSettings = new proc.procedure(
                constants.SCHEMA_NAME,
                "sap.tm.trp.db.systemmanagement.user::p_get_user_settings",
                { connection: conet });

        var userSettings = getUserSettings().USER_SETTINGS;

        var getUserPrivileges = new proc.procedure(
                '_SYS_BIC',
                'sap.tm.trp.db.systemmanagement.user/cv_effective_application_privileges/proc',
                { connection: conet });

        var userPrivileges = getUserPrivileges().VAR_OUT;

        var getPreference = new proc.procedure("SAP_TM_TRP", "sap.tm.trp.db.systemmanagement.user::p_get_user_preference",{
            connection: conet
        });

        var userPreferences = utils.arrayToObject(getPreference($.session.getUsername()).PREFERENCE_ITEMS.map(function(item) {
            return { key: item.DATA_ID, value: item.VALUE };
        }));

        if (userSettings.length > 0) {
            userSettings = userSettings[0];
        }

        //'resource category' for this user
        var getUsersResourceCategory = new proc.procedure(constants.SCHEMA_NAME, "sap.tm.trp.db.systemmanagement.user::p_get_users_resource_category",
        {connection: conet});
        var usersResourceCategories = getUsersResourceCategory().USERS_RESOURCE_CATEGORY;

        return {
            USER_SETTINGS: userSettings,
            USER_PRIVILEGES: userPrivileges,
            USER_PREFERENCES: userPreferences,
            RESOURCE_CATEGORY: usersResourceCategories
        };
    } catch (e) {
        logger.error("GET_USER_SETTINGS_PRIVILEGES_FAILED", e);
        throw new lib.InternalError(messages.MSG_ERROR_GET_USER_SETTINGS_PRIVILEGES, e);
    }finally {
        if (conet) {
            conet.close();
        }
    }
};

entity.updateMyProfile = function(params) {
    var conn, userId, username;
    try {
        conn = $.db.getConnection();
        conn.setAutoCommit(false);

        var getUserId = new proc.procedure(constants.SCHEMA_NAME, "sap.tm.trp.db.systemmanagement.user::p_get_user_id_by_username", { connection: conn });
        username = $.session.getUsername();

        userId = getUserId(username).USER_ID;

        var updateUser = new proc.procedure(constants.SCHEMA_NAME, "sap.tm.trp.db.systemmanagement.user::p_ext_user_profile_update", { connection: conn });
        updateUser(userId, username,params.obj.TEMPERATURE_UNIT_CODE, params.obj.WEIGHT_UNIT_CODE, params.obj.DISTANCE_CODE, 
        		   params.obj.VOLUME_UNIT_CODE,params.obj.DATE_FORMAT_ID,params.obj.TIME_FORMAT_ID,params.obj.DECIMAL_NOTATION_ID,params.obj.USER_DATA_FLAG);
        logger.success(
                "MY_PROFILE_UPDATED",
                userId,
                username,
                params.obj.TEMPERATURE_UNIT_CODE,
                params.obj.WEIGHT_UNIT_CODE,
                params.obj.DISTANCE_CODE,
                params.obj.VOLUME_UNIT_CODE,
                params.obj.DATE_FORMAT_ID,
                params.obj.TIME_FORMAT_ID,
                params.obj.DECIMAL_NOTATION_ID,
                params.obj.USER_DATA_FLAG);


        conn.commit();
    } catch (e) {
        conn.rollback();

        logger.error(
                "MY_PROFILE_UPDATED_FAILED",
                userId,
                username,
                params.obj.TEMPERATURE_UNIT_CODE,
                params.obj.WEIGHT_UNIT_CODE,
                params.obj.DISTANCE_CODE,
                params.obj.VOLUME_UNIT_CODE,
                params.obj.DATE_FORMAT_ID,
                params.obj.TIME_FORMAT_ID,
                params.obj.DECIMAL_NOTATION_ID,
                params.obj.USER_DATA_FLAG,
                e);

        throw new lib.InternalError(messages.MSG_ERROR_UPDATE_USER_PROFILE, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

entity.setFilters([{
    filter: function() {
        var privilege = "sap.tm.trp.service::UpdateUserProfile";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                    "USER_PROFILE_UPDATE_AUTHORIZE_FAILED",
                    privilege);

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["update"]
}]);

entity.setRoutes([{
    method: $.net.http.PUT,
    scope: "collection",
    action: "updateMyProfile",
    response: $.net.http.NO_CONTENT
}, {
    method: $.net.http.GET,
    scope: "collection",
    action: "settings",
    response: $.net.http.OK
}]);

try {
    entity.handle();
} finally {
    logger.close();
}
