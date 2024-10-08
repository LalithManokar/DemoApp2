/**
 * Define constants used in service here, with types: SERVICE CONTEXT LOGICAL
 * VALUE SETS DEFAULT VALUE
 */
var SCHEMA_NAME = 'SAP_TM_TRP';
var SP_PKG_NAME = 'sap.tm.trp.db.systemmanagement';
var SP_PKG_SUPPLY = 'sap.tm.trp.db.supply';
var SP_PKG_DEMAND = 'sap.tm.trp.db.demand';
var SP_PKG_SUPPLYDEMAND = 'sap.tm.trp.db.supplydemand';
var SP_PKG_TRANSPORTATION = 'sap.tm.trp.db.transportation';
var SP_PKG_PIPELINE = 'sap.tm.trp.db.pipeline';
var SP_PKG_USER_NEW = 'sap.tm.trp.db.user_new';
var SP_PKG_ALERT = 'sap.tm.trp.db.alert';
var SP_PKG_ALERT_RULE_GROUP = 'sap.tm.trp.db.alert.alert_rule_group';
var SP_PKG_USER = 'sap.tm.trp.db.systemmanagement.user';
var SP_PKG_LOC = 'sap.tm.trp.db.systemmanagement.location';
var SP_PKG_EQUIPMENT = 'sap.tm.trp.db.equipment';
var SP_PKG_FILTER = 'sap.tm.trp.db.filter';
var SP_PKG_COCKPIT = 'sap.tm.trp.db.planningcockpit';
var SP_PKG_COSTMODEL = 'sap.tm.trp.db.costmodel';
var SP_PKG_LEASECONTRACT = 'sap.tm.trp.db.leasecontract';
var SP_PKG_OBJECT_REGISTRATION = 'sap.tm.trp.db.objectregistration';
var SP_PKG_PICKUP_RETURN = 'sap.tm.trp.db.pickupreturn';
var SP_PKG_STOCK = 'sap.tm.trp.db.stock';
var SP_PKG_EVENT_PROCESSING = 'sap.tm.trp.db.eventprocessing';
var SP_PKG_MOVINGSTOCK = 'sap.tm.trp.db.movingstock';
var SP_PKG_HRF_RULE_MGMT_RULE_GROUP = 'sap.tm.trp.db.hrf.ruleManage.ruleGroup';
var SP_PKG_COMMON = 'sap.tm.trp.db.common';
var SP_PKG_CONSISTENCY_CHECK = 'sap.tm.trp.db.consistencycheck';
var SP_PKG_DATA_UPLOAD = 'sap.tm.trp.db.massupload';
var SP_PKG_RULEGROUP_DATA_UPLOAD = 'sap.tm.trp.db.pickupreturn.rulesetgroup.massupload';

var LOCATION_FILTER = 1;
var LOCATION_GROUP_FILTER = 2;
var ZONE_FILTER = 3;
var ZONE_GROUP_FILTER = 4;
var REGION_FILTER = 5;
var REGION_GROUP_FILTER = 6;
var USER_TYPE_ADMIN = 99;
var PERSISTED_PLAN_MODEL_TYPE = 1;
var GLOBAL_VISIBILITY_FLAG = 1;

var ROLE_TYPE = {
    DEPOT_MGR : 1,
    //LOCAL_PLR : 2,
    REGIONAL_PLR : 3,
    RESOURCE : 5
// 4 is administrator

};

var ZONE_TYPE = {
    LOCATION : 1,
    ADMIN_DIVISION : 2,
    POSTAL_CODE : 3
};

var LOCATION_GROUP_TYPE = {
    LOCATION: 1,
    // ZONE:2,
    REGION: 3
};

var LOCATION_TYPE = {
    LOCATION: 1,
    LOCATION_GROUP: 2,
    //ZONE:3,
    //ZONE_GROUP:4,
    REGION: 5,
    REGION_GROUP: 6
};

var MAP_LEVEL = {
    CITY : 4,
    STATE : 3,
    COUNTRY : 2,
    WORLD : 1
};

var FIELD = {
    POINT : 'POINT',
    AGGR_POINT : 'AGGR_POINT',
    POLYGON : 'POLYGON'
};

var FLAG = {
    USER : 1,
    ADMIN : 2
};

var PLAN_TYPE = {
    SCHEDULED : 1,
    TEMPLATE : 2,
    VIRTUAL : 3,
    PERSISTED_KPI : 4,
    VIRTUAL_KPI : 5,
    ADHOC : 99
};

var ACTIVITY_TYPE = {
    REPOSITIONING : 1,
    ONHIRE : 3,
    MR : 5,
    OFFHIRE : 7,
    REPOSITIONING_AVOIDANCE : 9,
    LOAD_DISCHARGE : 11
};

var SORT_BY_TYPE = {
    PRIORITY : 1,
    LOCATION : 2,
    TIME : 3,
    OWNER : 4
};

var ORDER_TYPE = {
    ASC : 1,
    DESC : 2
};

var EXPIRED_STATUS = {
    VALID : '0',
    EXPIRE : '1'
};

var FINALIZED_STATUS = {
    TRUE : '0',
    FALSE : '1'
};

var REGISTRATION_OBJECT_TYPE = {
    "1" : "SDPlanAlertRule",
    "2" : "KPIPlanAlertRule",
    "3" : "CalculationModel",
    "4" : "LocationDeterminationRule",
    "5" : "ResourceStockAlertRule",
    "6" : "SDKPIBubbleRule",
    "7" : "AvailableCheckRule",
    "8" : "ExclusiveRule",
    "9" : "PickupExtendedFields",
    "10" : "ReturnExtendedFields",
    "11" : "PickUpSelectionDateCriteria",
    "12" : "ReturnSelectionDateCriteria",
    "13" : "ExcludeProcessedTUs"
};

var RULE_TYPE = {
    SD_ALERT_RULE : 1,
    KPI_PLAN_ALERT_RULE : 2,
    CALCULATION_MODEL : 3,
    LOCATION_DETERMINATION_RULE : 4,
    RESOURCE_STOCK_ALERT_RULE : 5,
    SD_KPI_BUBBLE_RULE : 6,
    AVAILABLE_CHECK_RULE : 7,
    ExclusiveRule : 8
}

var RULE_CATEGORY_TYPE = {
    RES_STOCK_ALERT : 10,
    RES_STOCK_BUBBLE : 11
}

var COST_DATASET_CSV_FILES = {
    DISTANCE_BASED_COST : {
        FILENAME : "distance_based_costs.csv",
        COLUMNS : [ "TRANSPORTATION_MODE_DESC", "RESOURCE_TYPE", "CARRIER_ID",
                "UOM_DESC", "COST" ]
    },
    HANDLING_COST : {
        FILENAME : "handling_costs.csv",
        COLUMNS : [ "LOCATION_NAME", "HANDLING_TYPE_DESC", "FROM_MOT_DESC",
                "TO_MOT_DESC", "RESOURCE_TYPE", "UOM_DESC", "COST" ]
    },
    LOCATION_BASED_COST : {
        FILENAME : "location_based_costs.csv",
        COLUMNS : [ "FROM_LOCATION_NAME", "TO_LOCATION_NAME",
                "TRANSPORTATION_MODE_DESC", "RESOURCE_TYPE", "CARRIER_ID",
                "UOM_DESC", "COST" ]
    },
    QTY_STORAGE_COST : {
        FILENAME : "quantity_based_costs.csv",
        COLUMNS : [ "RESOURCE_TYPE", "LOCATION_NAME", "FREE_POOL_TYPE_DESC",
                "START_AT", "START_TIME", "THRESHOLD_FROM", "THRESHOLD_TO",
                "PER_DIEM_COST", "UOM_DESC" ]
    },
    TIME_STORAGE_COST : {
        FILENAME : "time_based_storage.csv",
        COLUMNS : [ "RESOURCE_TYPE", "LOCATION_NAME", "THRESHOLD_FROM",
                "THRESHOLD_TO", "PER_DIEM_COST", "UOM_DESC" ]
    }
};

var PLANNED_ACTIVITIES_CSV_FILES = {
	    PLANNED_ACTIVITIES : {
	        FILENAME : "planned_activity_details.csv",
	        COLUMNS : ["ACTIVITY_ID","TYPE","ACTIVITY_STATUS","DESCRIPTION","VOYAGE","VESSEL","QUANTITY","RESOURCE_TYPE","FROM","TO","COST","START_TIME","END_TIME"]
	    }
	};

var DATA_PROTECTION_AND_PRIVACY_CSV_FILES = {
    USER_CONSENT : {
        FILENAME : "user_consent.csv",
        COLUMNS : [ "FIELD", "VALUE"]
    },
    MAIN_DATA : {
        FILENAME : "main_data.csv",
        COLUMNS : [ "FIELD", "VALUE"]
    },
    WHERE_USED: {
        FILENAME: "where_used.csv",
        COLUMNS: [ "USERNAME", "RESOURCE_CATEGORY","WORK_CENTER", "VIEW_NAME", "OBJECT_NAME", "OBJECT_DESCRIPTION", "CREATED_BY", "LAST_CHANGED_BY", "EXECUTED_BY"]
    },
    USER_ROLE: {
        FILENAME: "user_roles.csv",
        COLUMNS: [ "USERNAME", "ROLE_NAME", "ROLE_TYPE", "ROLE_DESCRIPTION"]
    },
    APP_PRIVILEGE:{
        FILENAME: "application_priviledges.csv",
        COLUMNS: [ "USERNAME", "PRIVILEGE_NAME"]
    }
};

var SCHEDULE = {
    TYPE : {
        HOUR : 1,
        DAY : 2,
        WEEK : 3,
        MONTH : 4
    },
    WEEKDAY : [ "sun", "mon", "tue", "wed", "thu", "fri", "sat" ]
};

var PAGES = {
    SYSTEM_MANAGEMENT : {
        toString : function() {
            return "SYSTEM_MANAGEMENT";
        },
        KEYS : {
            THEME : "THEME"
        }
    }

};

var EXPORT_AREA = {
    "EQUI_VISIBILITY" : 'EQUI_VISIBILITY',
    "STOCK_BY_LOCATION" : 'STOCK_BY_LOCATION',
    "STOCK_BY_RESOURCE" : 'STOCK_BY_RESOURCE',
    "TRACKING" : 'TRACKING'
};

var EXT_PAGE_ID = {
    BOOKING : 1,
    RESOURCE : 2
};

var STOCK_RULE_PUBLIC_SYNONYM_NAME = "sap.tm.trp.db.stock::p_get_stock_alert";

var RESOURCE_CATEGORY_TYPE = {
    GENERIC : 'GE',
    RAILCAR : 'RC',
    CONTAINER : 'CN'
}
