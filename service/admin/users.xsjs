var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var model = $.import("/sap/tm/trp/service/model/user.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

var entity = new lib.SimpleRest({
    name: "User",
    desc: "User Management",
    model: new model.User()
});

var DEFAULT_TIME_OFFSET = 0;
var DEFAULT_USER_TYPE_ID = 3; // Region Manager

var sync = function() {
    var conn = $.hdb.getConnection();
    conn.setAutoCommit(false);

    var missingUsers = (function(){
        var users;

        return (function(){
            if (!users) {
                var getUsers = conn.loadProcedure("SAP_TM_TRP",
                        "sap.tm.trp.db.systemmanagement.user::p_get_trp_sync_users");
                users = [];
                try {
                    var iter = getUsers().USERS.getIterator();

                    while(iter.next()) {
                        users.push(iter.value());
                    }

                    logger.success("SYNC_USER_CHECK_USERS_SUCCESS",
                        JSON.stringify(users));
                } catch (e) {
                    logger.error("SYNC_USER_CHECK_USERS_FAIL",
                        e);

                    throw e;
                }
            }

            return users;
        }());

    }());

    var createUser = function(user) {
        var create = conn.loadProcedure(
                "SAP_TM_TRP",
                "sap.tm.trp.db.systemmanagement.user::p_create_user_header");

        try {
            create(user.USER_NAME, DEFAULT_USER_TYPE_ID);

            logger.success("SYNC_USER_CREATE_USER_SUCCESS",
                user.USER_NAME,
                DEFAULT_USER_TYPE_ID);
        } catch (e) {
            logger.error("SYNC_USER_CREATE_USER_FAIL",
                user.USER_NAME,
                DEFAULT_USER_TYPE_ID,
                e);

            throw e;
        }
    };

    var setUserTimeOffset = function(user) {
        var setUserOffset = conn.loadProcedure(
                "SAP_TM_TRP", "sap.tm.trp.db.stock::p_set_user_time_offset");

        try {
            setUserOffset(user.USER_NAME, DEFAULT_TIME_OFFSET);

            logger.success("SYNC_USER_SET_USER_TIME_OFFSET_SUCCESS",
                    user.USER_NAME,
                    DEFAULT_TIME_OFFSET);
        } catch (e) {
            logger.error("SYNC_USER_SET_USER_TIME_OFFSET_FAIL",
                    user.USER_NAME,
                    DEFAULT_TIME_OFFSET,
                    e);

            throw e;
        }
    };

    return (function(){
        try {
            missingUsers.forEach(function(user) {
                createUser(user);
                setUserTimeOffset(user);

                logger.success("SYNC_USER_SUCCESS",
                        user.USER_NAME,
                        DEFAULT_USER_TYPE_ID);
            });

            conn.commit();

            return missingUsers;
        } catch (e) {
            logger.error("SYNC_USER_FAIL",
                    JSON.stringify(missingUsers),
                    e);

            conn.rollback();
        }

        conn.close();
    }());

};

entity.sync = function() {
    return sync();
};

entity.update = function(params) {
    var conn = $.db.getConnection();
    conn.setAutoCommit(false);
    var getUsername = new proc.procedure(constants.SCHEMA_NAME, "sap.tm.trp.db.systemmanagement.user::p_get_username_by_user_id", { connection: conn });
    var user = getUsername(params.id);
    var username = user.USER_NAME;
    var userTypeId = user.USER_TYPE_ID;

    if (!username) {
        logger.error(
                "GET_USER_NAME_FAILED",
                logger.Parameter.Integer(0, params.id));
        throw new lib.NotFoundError(messages.MSG_INVALID_ID, params.id);
    }
    try {
        var updateUser = new proc.procedure(constants.SCHEMA_NAME, "sap.tm.trp.db.systemmanagement.user::p_ext_user_update", { connection: conn });

        try {

            updateUser(params.id, username, params.obj.TEMPERATURE_UNIT_CODE, params.obj.WEIGHT_UNIT_CODE, 
            		params.obj.DISTANCE_CODE, params.obj.VOLUME_UNIT_CODE, params.obj.DATE_FORMAT_ID,
            		params.obj.TIME_FORMAT_ID, params.obj.DECIMAL_NOTATION_ID, params.obj.USER_TYPE_ID,params.obj.USER_DATA_FLAG);

            logger.success(
                    "USER_PROFILE_UPDATED",
                    params.id,
                    username,
                    params.obj.TEMPERATURE_UNIT_CODE,
                    params.obj.WEIGHT_UNIT_CODE,
                    params.obj.DISTANCE_CODE,
                    params.obj.VOLUME_UNIT_CODE,
                    params.obj.DATE_FORMAT_ID,
                    params.obj.TIME_FORMAT_ID,
                    params.obj.DECIMAL_NOTATION_ID,
                    params.obj.USER_TYPE_ID,
                    params.obj.USER_DATA_FLAG);

        } catch (e) {
            logger.error("USER_PROFILE_UPDATE_FAILED",
                    params.id,
                    username,
                    params.obj.TEMPERATURE_UNIT_CODE,
                    params.obj.WEIGHT_UNIT_CODE,
                    params.obj.DISTANCE_CODE,
                    params.obj.VOLUME_UNIT_CODE,
                    params.obj.DATE_FORMAT_ID,
                    params.obj.TIME_FORMAT_ID,
                    params.obj.DECIMAL_NOTATION_ID,
                    params.obj.USER_TYPE_ID,
                    params.obj.USER_DATA_FLAG,
                    e);

            throw e;
        }

        var assignRole = new proc.procedure(constants.SCHEMA_NAME,
                "sap.tm.trp.db.systemmanagement.user::p_ext_assign_role",
                { connection: conn });

        try {
            assignRole(params.id, params.obj.USER_TYPE_ID, params.obj.ROLES);

            logger.success("USER_ROLE_ASSIGNED",
                    params.id,
                    username,
                    userTypeId,
                    JSON.stringify(params.obj.ROLES));
        } catch (e) {
            logger.error("USER_ROLE_ASSIGN_FAILED",
                    params.id,
                    username,
                    userTypeId,
                    JSON.stringify(params.obj.ROLES),
                    e);

            throw e;
        }

        var setDefaultLocationFilter = new proc.procedure(constants.SCHEMA_NAME,
                "sap.tm.trp.db.systemmanagement.user::p_update_user_preference",
                { connection: conn });

        try {
            setDefaultLocationFilter(username,
                    [{
                        DATA_ID: "RESOURCE|LAST_USED_LOCATION_FILTER",
                        VALUE: params.obj.DEFAULT_LOCATION_FILTER || null
                    }]);

            logger.success("USER_DEFAULT_LOCATION_FILTER_SET_SUCCEED", params.obj.DEFAULT_LOCATION_FILTER, username);
        } catch (e) {
            logger.error("USER_DEFAULT_LOCATION_FILTER_SET_FAILED", params.obj.DEFAULT_LOCATION_FILTER, username, e);

            throw e;
        }

        conn.commit();
    } catch (e) {
        conn.rollback();

        logger.error(
                "USER_UPDATE_FAILED",
                params.id,
                username,
                params.obj.TEMPERATURE_UNIT_CODE,
                params.obj.WEIGHT_UNIT_CODE,
                params.obj.DISTANCE_CODE,
                params.obj.VOLUME_UNIT_CODE,
                params.obj.DATE_FORMAT_ID,
                params.obj.TIME_FORMAT_ID,
                params.obj.DECIMAL_NOTATION_ID,
                params.obj.USER_TYPE_ID,
                params.obj.USER_DATA_FLAG,
                JSON.stringify(params.obj.ROLES),
                e);

        if (e instanceof lib.WebApplicationError) {
            throw e;
        }

        throw new lib.InternalError(messages.MSG_ERROR_UPDATE_USER_PROFILE, e);
    }  finally {
        if (conn) {
            conn.close();
        }
    }
};

entity.queryFacetFilter = function(params) {
    try {
        var query = new proc.procedure(constants.SCHEMA_NAME, "sap.tm.trp.db.systemmanagement.user::p_get_users_facet_filter");
        var result = query(params.obj.search, params.obj.userIdList);
        return {
            USER_TYPE_ID: result.USER_TYPE_ID_LIST_OUTPUT.map(function(i) { return {key : i.ID, text : i.DESC};})
        };
    } catch (e) {
        logger.error("USERS_FACET_FILTER_GET_FAILED", params.obj, e);
        throw new lib.InternalError(messages.MSG_ERROR_FACET_FILTER_TIME_FILTERS, e);
    }
};

entity.setFilters([{
    filter: function() {
        var privilege = "sap.tm.trp.service::UpdateUserProfile";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                    "USER_PROFILE_UPDATE_NOT_AUTHORIZED",
                    $.session.getUsername(),
                    privilege);
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["update"]
}, {
    filter: function() {
        var privilege = "sap.tm.trp.service::SynchronizeTMUser";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("SYNCHRONIZE_TM_USER_NOT_AUTHORIZED",
                    $.session.getUsername(),
                    privilege);
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["sync"]
}]);

entity.setRoutes([{
    method: $.net.http.POST,
    scope: "collection",
    action: "queryFacetFilter"
}, {
    method: $.net.http.POST,
    scope: "collection",
    action: "sync"
}]);

try {
    entity.handle();
} finally {
    logger.close();
}
