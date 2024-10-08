/**
 * Define constants used in service here, with types: SERVICE CONTEXT LOGICAL
 * VALUE SETS DEFAULT VALUE
 * Copied from xslib/constants.xsjslib by journey
 * update - SP_PKG_EQUIPMENT
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
var SP_PKG_EQUIPMENT = 'sap.tm.trp.rail.db.equipment';
var SP_PKG_FILTER = 'sap.tm.trp.db.filter';
var SP_PKG_COCKPIT = 'sap.tm.trp.db.planningcockpit';
var SP_PKG_COSTMODEL = 'sap.tm.trp.db.costmodel';
var SP_PKG_LEASECONTRACT = 'sap.tm.trp.db.leasecontract';
var SP_PKG_OBJECT_REGISTRATION = 'sap.tm.trp.db.objectregistration';
var SP_PKG_PICKUP_RETURN = 'sap.tm.trp.db.pickupreturn';
var SP_PKG_STOCK = 'sap.tm.trp.rail.db.stock';
var SP_PKG_EVENT_PROCESSING = 'sap.tm.trp.db.eventprocessing';
var SP_PKG_MOVINGSTOCK='sap.tm.trp.db.movingstock';
var SP_PKG_HRF_RULE_MGMT_RULE_GROUP='sap.tm.trp.db.hrf.ruleManage.ruleGroup';
var SP_PKG_COMMON='sap.tm.trp.db.common';
var SP_PKG_CONSISTENCY_CHECK='sap.tm.trp.db.consistencycheck';

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
    DEPOT_MGR: 1,
   // LOCAL_PLR: 2,
    REGIONAL_PLR: 3
};

var ZONE_TYPE = {
    LOCATION: 1,
    ADMIN_DIVISION: 2,
    POSTAL_CODE: 3
};

var LOCATION_TYPE = {
    LOCATION: 1,
    ZONE: 2,
    REGION: 3
};

var MAP_LEVEL = {
    CITY: 4,
    STATE: 3,
    COUNTRY: 2,
    WORLD: 1,
};

var FIELD = {
    POINT: 'POINT',
    AGGR_POINT: 'AGGR_POINT',
    POLYGON: 'POLYGON'
};

var FLAG = {
    USER: 1,
    ADMIN: 2
};

var PLAN_TYPE = {
    SCHEDULED: 1,
    TEMPLATE: 2,
    VIRTUAL: 3,
    PERSISTED_KPI: 4,
    VIRTUAL_KPI: 5,
    ADHOC: 99
};

var SORT_BY_TYPE = {
	PRIORITY: 1,
	LOCATION: 2,
    TIME: 3,
    OWNER: 4 
};

var ORDER_TYPE = {
	ASC: 1,
    DESC: 2
};

var EXPIRED_STATUS = {
    VALID: '0',
    EXPIRE: '1'
};

var FINALIZED_STATUS = {
    TRUE: '0',
    FALSE: '1'
};

var REGISTRATION_OBJECT_TYPE = {
	"1": "SDPlanAlertRule",
	"2": "KPIPlanAlertRule",
	"3": "CalculationModel",
	"4": "LocationDeterminationRule",
	"5": "ResourceStockAlertRule",
	"6": "SDKPIBubbleRule",
	"7": "AvailableCheckRule",
    "8": "ExclusiveRule",
    "9" : "PickupExtendedFields",
    "10" : "ReturnExtendedFields"
};

var COST_MODEL_CSV_FILES = {
    TRANSPORTATION_COSTS_CSV: {
        FILENAME: "transportation_costs.csv",
        VARNAME: "TRANSPORTATION_COSTS",
        COLUMNS: ["EQUIPMENT_ID", "TRANSPORT_MODE", "FROM_LOCATION_NAME", "TO_LOCATION_NAME", "CARRIER_ID", "COST", "CURRENCY"]
    },
    TIME_BASE_STORAGE_COSTS_CSV: {
        FILENAME: "time_base_storage_costs.csv",
        VARNAME: "TIME_BASE_STORAGE_COSTS",
        COLUMNS: ["EQUIPMENT_ID", "LOCATION_NAME", "THRESHOLD_FROM", "THRESHOLD_TO", "COST", "CURRENCY"]
    },
    QUANTITY_BASE_STORAGE_COSTS_CSV: {
        FILENAME: "quantity_base_storage_costs.csv",
        VARNAME: "QUANTITY_BASE_STORAGE_COSTS",
        COLUMNS: ["EQUIPMENT_ID", "LOCATION_NAME", "FREE_POOL_TYPE", "STARTS_AT", "THRESHOLD_FROM", "THRESHOLD_TO", "COST", "CURRENCY"]
    },
    HANDLING_COSTS_CSV: {
        FILENAME: "handling_costs.csv",
        VARNAME: "HANDLING_COSTS",
        COLUMNS: ["EQUIPMENT_ID", "LOCATION_NAME", "FROM_MODE", "TO_MODE", "COST", "CURRENCY"]
    },
    COMPUTATION_SETTING_CSV: {
        FILENAME: "computation_setting.csv",
        VARNAME: "COMPUTATION_SETTING",
        COLUMNS: ["KEY", "VALUE"]
    }
};

var SCHEDULE={
    TYPE:{
        HOUR:1,
        DAY:2,
        WEEK:3,
        MONTH:4
    },
    WEEKDAY:["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
};


var PAGES = {
    SYSTEM_MANAGEMENT: {
        toString: function() {
            return "SYSTEM_MANAGEMENT";
        },
        KEYS: {
            THEME: "THEME"
        }
    }  
    
};

var EXPORT_AREA= {
		  "EQUI_VISIBILITY": 'EQUI_VISIBILITY',
	      "STOCK": 'STOCK',
	      "TRACKING":'TRACKING'
};


var EXT_PAGE_ID= {
	BOOKING : 1,
	RESOURCE:2
};

var STOCK_RULE_PUBLIC_SYNONYM_NAME = "sap.tm.trp.db.stock::p_get_stock_alert";
