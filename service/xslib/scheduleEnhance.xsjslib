var File = $.import("file.xsjslib").File;
var artifacts = $.import("artifacts.xsjslib");
var Procedure = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib').Procedure;

var LOCAL_PACKAGE_ABS = "/system-local/trp/";
var EXT_PACKAGE = "ext";
var EXT_PACKAGE_ABS = LOCAL_PACKAGE_ABS + EXT_PACKAGE;
var EXT_SQLCC = "TRP";

/**
 * convert file path /system-local/trp/ext/v_enhanced_ to system-local.trp.ext::v_freight_order
 */
var convertPathToObjectName = function(path, name) {
    return path.split("/").filter(function(e) { return e.trim().length !== 0; }).join(".") + "::" + name;
};

/**
 * the rule to generate extend view name
 */
var generator = function(tableName) {
    var viewName = ("v_" + tableName + '_rep').toLowerCase();

    return viewName;
};

var createViews = $.import("/sap/tm/trp/db/semantic/schedule/departureRules.xsjslib").generateView;

function createView() {

    /**
     * get the enhanced schedule tables
     */
    this.getTables = function() {
        var getTables = new Procedure("SAP_TM_TRP",
                "sap.tm.trp.db.systemmanagement.customization::p_get_enhanced_schedule_tables");
        var result = getTables();

        return {
        	tables: result.TABLE_NAMES,
        	views: result.VIEW_NAMES
        };
    };
    
    /**
     * create local project for schedules and not transport and not affected by upgrade
     */
    this.createLocalProject = function() {
        var xsapp = new File(".xsapp", LOCAL_PACKAGE_ABS);
        if (!xsapp.existence) {
            try {
                xsapp.create(new artifacts.XSApp(), "data/xsapp");
            } catch (e) {
                // allow failure, since it may already exist .xsapp in upper/nested package
                $.trace.error(e);
            }
        }

        var xssqlcc = new File(EXT_SQLCC + ".xssqlcc", LOCAL_PACKAGE_ABS);
        if (!xssqlcc.existence) {
            xssqlcc.create(new artifacts.XSSQLConnectionConfiguration({description: "TRP Local connection"}), "data/xssqlcc");
        }

        var xsaccess = new File(".xsaccess", LOCAL_PACKAGE_ABS);
        xsaccess.create(new artifacts.XSAccess({
            exposed: true,
            default_connection: convertPathToObjectName(LOCAL_PACKAGE_ABS, EXT_SQLCC)
        }), "data/xsaccess");
    };

    /**
     * create view in local repository
     */
    this.createLocalView = function(viewName,tableName) {
        var view = new File(viewName + ".hdbview", EXT_PACKAGE_ABS);
        
        view.create(new artifacts.HDBView(createViews(viewName, tableName)), "data/hdbview");
        view.grant("SELECT", convertPathToObjectName(LOCAL_PACKAGE_ABS, EXT_SQLCC)); // need to be able to select for OData

        return {
        	view_name: viewName
        };
    };

    this.removeLocalView = function(name) {
        var view = new File(name + ".hdbview", EXT_PACKAGE_ABS);
        view.remove();
    };

    this.enhance = function() {
    	var scheduleTables = this.getTables();
    	var views = [];
    	if (scheduleTables.tables !== undefined && scheduleTables.tables.length > 0){
    		views = scheduleTables.tables.map(function(row) {
        		var name = generator(row.TABLE_NAME_KEY);
        		//this.createLocalView(name, row.TABLE_NAME);        		
        		return this.createLocalView(name, row.TABLE_NAME);
        	}, this);
        }
    	return views;

    };

    /**
     * interface for enhanced schedule tables deletion
     */
    this.revert = function() {

    	var scheduleTables = this.getTables();
    	if (scheduleTables.views !== undefined && scheduleTables.views.length > 0){
        	scheduleTables.views.forEach(function(row) {
        		var name = generator(row.VIEW_NAME_KEY);
        		this.removeLocalView(name);        		
        		
        	}, this);
        }

    };

    // always initiate the local project
    this.createLocalProject();
    
}