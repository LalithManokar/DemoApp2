var lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var model = $.import('/sap/tm/trp/service/model/customization.xsjslib');
var Procedure = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib').Procedure;
var File = ($.import("/sap/tm/trp/service/xslib/file.xsjslib")).File;
var artifacts = $.import("/sap/tm/trp/service/xslib/artifacts.xsjslib");
var Extensibility = $.import("/sap/tm/trp/service/xslib/ext.xsjslib").Extensibility;

var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var logger = new ($.import('/sap/tm/trp/service/xslib/applog.xsjslib')).AppLog();
var PACKAGE = 'sap.tm.trp.db.systemmanagement.customization';
var SCHEMA = constants.SCHEMA_NAME;

var resourceCategory = new lib.SimpleRest({
    name: 'resource category',
    desc: 'resource category service',
    model: new model.resourceCategory()
});

function extendView(categoryName) {
    var ext = new Extensibility(categoryName);
    ext.extend();
}

function removeExtendView(categoryId) {
    var getResourceCategory = new Procedure(SCHEMA, "sap.tm.trp.db.systemmanagement.customization::p_ext_resource_category_get_by_id");
    var categoryName = getResourceCategory(categoryId).CODE;

    var ext = new Extensibility(categoryName);
    ext.revert();
}

// create a resource category
resourceCategory.create = function(params) {
    var procName = 'sap.tm.trp.db.systemmanagement.customization::p_ext_resource_category_create';
    try {
        var createResourceCategory = new Procedure(SCHEMA, procName);
        var result = createResourceCategory(
            params.obj.NAME,
            params.obj.DESC,
            params.obj.RESOURCE_CATEGORY_TYPE,
            params.obj.RESOURCE_GROUP_TYPE,
            params.obj.ENABLE_FLAG,
            params.obj.LEASE_CONTRACT_FLAG,
            params.obj.BASE_RESOURCE_TYPE,
            params.obj.RESOURCE_GROUPS,
            params.obj.REPOSITIONING_PARAMETER,
            params.obj.OBJECT_REGISTRATIONS,
            params.obj.EXTEND_COLUMNS
        );

        if (result.MESSAGE.length > 0){
            logger.error(messages.MSG_BASE_RESOURCE_TYPE_NOT_IN_SELECTED_CATEGORY, result.MESSAGE);
            throw new lib.InternalError(messages.MSG_BASE_RESOURCE_TYPE_NOT_IN_SELECTED_CATEGORY, result.MESSAGE);
        }

        logger.success(
            'RESOURCE_CATEGORY_CREATE_SUCCESS',
            result.RESOURCE_CATEGORY_ID
        );

        extendView(params.obj.NAME);

        return {
            ID: result.RESOURCE_CATEGORY_ID
        };
    } catch (e) {
        logger.error(
            messages.MSG_ERROR_CREATE_RESOURCE_CATEGORY,
            e,
            params.obj.NAME,
            params.obj.DESC,
            params.obj.RESOURCE_CATEGORY_TYPE,
            params.obj.RESOURCE_GROUP_TYPE,
            params.obj.ENABLE_FLAG,
            params.obj.LEASE_CONTRACT_FLAG,
            params.obj.BASE_RESOURCE_TYPE,
            params.obj.RESOURCE_GROUPS,
            params.obj.REPOSITIONING_PARAMETER,
            params.obj.OBJECT_REGISTRATIONS,
            params.obj.EXTEND_COLUMNS
        );
        throw e;
    }
};

resourceCategory.update = function(params) {
    var procName = 'sap.tm.trp.db.systemmanagement.customization::p_ext_resource_category_update';
    try {
        var updateResourceCategory = new Procedure(SCHEMA, procName);
        var result = updateResourceCategory(
            params.obj.ID,
            params.obj.NAME,
            params.obj.DESC,
            params.obj.RESOURCE_CATEGORY_TYPE,
            params.obj.RESOURCE_GROUP_TYPE,
            params.obj.ENABLE_FLAG,
            params.obj.LEASE_CONTRACT_FLAG,
            params.obj.BASE_RESOURCE_TYPE,
            params.obj.RESOURCE_GROUPS,
            params.obj.REPOSITIONING_PARAMETER,
            params.obj.OBJECT_REGISTRATIONS,
            params.obj.EXTEND_COLUMNS
        );

        if (result.MESSAGE.length > 0){
            logger.error(messages.MSG_BASE_RESOURCE_TYPE_NOT_IN_SELECTED_CATEGORY, result.MESSAGE);
            throw new lib.InternalError(messages.MSG_BASE_RESOURCE_TYPE_NOT_IN_SELECTED_CATEGORY, result.MESSAGE);
        }

        logger.success(
            'RESOURCE_CATEGORY_UPDATE_SUCCESS',
            result.ID
        );

        extendView(params.obj.NAME);

    } catch (e) {
        logger.error(
            messages.MSG_ERROR_UPDATE_RESOURCE_CATEGORY,
            params.id,
            e
        );

        throw e;
    }
};

resourceCategory.destroy = function(params) {
    var procName = 'sap.tm.trp.db.systemmanagement.customization::p_ext_resource_category_delete';
    try {
        var destroyResourceCategory = new Procedure(SCHEMA, procName);
        destroyResourceCategory(params.id);

        logger.success(
            'RESOURCE_CATEGORY_DELETE_SUCCESS',
            params.id
        );

        removeExtendView(params.id);

    } catch (e) {
        logger.error(
            "RESOURCE_CATEGORY_DELETE_FAILED",
            params.id,
            e
        );

        throw e;
    }
};

resourceCategory.getGroupTypes = function (params) {
    var procName = 'sap.tm.trp.db.systemmanagement.customization::p_ext_group_type_by_category_type';
    try {
        var getGroupTypes = new Procedure(SCHEMA, procName);
        var result = getGroupTypes(params.obj.resourceCategoryType);

        logger.success(
            'GROUP_TYPES_RETURN',
            params.obj.resourceCategoryType
        );

        return result;
    } catch (e) {
        logger.error(
            'GROUP_TYPES_RETURN_FAILED',
            params.obj.resourceCategoryType,
            e
        );

        throw e;
    }
};

resourceCategory.getResourceTypes = function (params) {
    var procName = PACKAGE + '::p_ext_resource_type_get_by_category';
    try {
        var getResourceTypes = new Procedure(SCHEMA, procName);
        var result = getResourceTypes(params.obj.RESOURCE_GROUPS);

        logger.success(
            'RESOURCE_TYPES_RETURN',
            params.obj.RESOURCE_GROUPS
        );

        return result;
    } catch (e) {
        logger.error(
            'RESOURCE_TYPES_RETURN_FAILED',
            params.obj.RESOUCRE_GROUPS,
            e
        );
        throw new lib.InternalError(messages.MSG_ERROR_GET_RESOURCE_TYPES);
    }
};

resourceCategory.queryFacetFilter = function (params) {
    var procName = PACKAGE + '::p_resource_category_facet_filter';
    try {
        var queryFacetFilter = new Procedure(SCHEMA, procName);
        var result = queryFacetFilter(params.obj.search, params.obj.RESOURCE_CATEGORY_TYPE_LIST, params.obj.ENABLE_FLAG_LIST);
        return {
            RESOURCE_CATEGORY_TYPE: result.RESOURCE_CATEGORY_TYPE_OUTPUT.map(function (i) {
                return {
                    key: i.KEY,
                    text: i.TEXT
                };
            }),
            ENABLE_FLAG: result.ENABLE_FLAG_OUTPUT.map(function (i) {
                return {
                    key: i.KEY,
                    text: i.TEXT
                };
            })
        };
    } catch (e) {
        logger.error(
            "QUERY_RESOURCE_CATEGORY_FACET_FILTER_FAILED",
            e
        );
        throw new lib.InternalError(messages.MSG_ERROR_FACET_FILTER_RESOURCE_CATEGORY, e);
    }
};

resourceCategory.setFilters([{
    filter: function () {
        var privilege = 'sap.tm.trp.service::CreateResourceCategory';
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error('RESOURCE_CATEGORY_CREATE_AUTHORIZE_FAILED', privilege);
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ['create']
}, {
    filter: function () {
        var privilege = 'sap.tm.trp.service::UpdateResourceCategory';
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error('RESOURCE_CATEGORY_UPDATE_AUTHORIZE_FAILED', privilege);
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ['update']
}, {
    filter: function () {
        var privilege = 'sap.tm.trp.service::DeleteResourceCategory';
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error('RESOURCE_CATEGORY_DELETE_AUTHORIZE_FAILED', privilege);
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ['destroy']
}]);


resourceCategory.setRoutes([{
    method: $.net.http.GET,
    scope: 'collection',
    action: 'getGroupTypes'
}, {
    method: $.net.http.POST,
    scope: 'collection',
    action: 'getResourceTypes'
}, {
    method: $.net.http.POST,
    scope: 'collection',
    action: 'queryFacetFilter'
}]);

try {
    resourceCategory.handle();
} finally {
    logger.close();
}
