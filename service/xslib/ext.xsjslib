var File = $.import("file.xsjslib").File;
var artifacts = $.import("artifacts.xsjslib");
var Procedure = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib').Procedure;
var EXT_PAGE_ID = $.import('/sap/tm/trp/service/xslib/constants.xsjslib').EXT_PAGE_ID;

var LOCAL_PACKAGE_ABS = "/system-local/trp/";
var EXT_PACKAGE = "ext";
var EXT_PACKAGE_ABS = LOCAL_PACKAGE_ABS + EXT_PACKAGE;
var EXT_SQLCC = "TRP";

/**
 * convert file path /system-local/trp/ext/v_freight_order to system-local.trp.ext::v_freight_order
 */
var convertPathToObjectName = function(path, name) {
    return path.split("/").filter(function(e) { return e.trim().length !== 0; }).join(".") + "::" + name;
};

/**
 * the rule to generate extend view name
 */
var generator = function(type, resourceCategory) {
    var extName = type + resourceCategory + "Ext";
    var viewName = ("v_" + type + "_ext_" + resourceCategory).toLowerCase();

    return {
        viewName: viewName,
        association: type + "_" + extName,
        alias: extName,
        type: type,
        fullName: convertPathToObjectName(EXT_PACKAGE_ABS, viewName)
    };
};

/**
 * Extensibility class to handle extended columns for resource/booking view
 *
 * We use OData navigate concept to implement the extended column
 * means if a resource category (CN) assigned extended columns
 * we will firstly generate two HDBViews v_resource_cn and v_booking_cn
 * then expose these two views in the ext.odata file and
 * construct the association with resource master and booking master
 * finally, user could get the extended column by using OData $expand syntax
 */
function Extensibility(resourceCategory) {

    /*
     * Rules define how to extend, incl. which entity/service needs to extend, how it looks like
     * the association and how to generate the extended view
     */
    var Rules = {
        Resource: {
            OData: {
                name: "ResourceMasterTable",
                definition: {
                    object: "sap.tm.trp.db.equipment::cv_equipment_visibility_equip_info",
                    generateKey: "EQUIPMENT_ID",
                    parameters: "entity"
                },
                association: {
                    principal: { keys: ["RESOURCE_ID"], multiplicity: "1", object: "ResourceMasterTable"},
                    dependent: { keys: ["RESOURCE_ID"], multiplicity: "1" }
                }
            },
            generator: $.import("/sap/tm/trp/db/semantic/resource/extensibility.xsjslib").generateExtendView
        },
        Booking: {
            OData: {
                name: "EmptyBookingMasterTable",
                definition: {
                    object: "sap.tm.trp.db.booking::cv_booking",
                    generateKey: "BOOKING_ID",
                    parameters: "entity"
                },
                association: {
                    principal: { keys: ["ITE_KEY"], multiplicity: "1", object: "EmptyBookingMasterTable" },
                    dependent: { keys: ["DB_KEY"], multiplicity: "1" }
                }
            },
            generator: $.import("/sap/tm/trp/db/semantic/order/extensibility.xsjslib").generateExtendView
        }
    };

    /**
     * get the assigned extended column of the given resource category
     */
    this.getExtendedColumns = function() {
        var getExtendedColumns = new Procedure("SAP_TM_TRP",
                "sap.tm.trp.db.systemmanagement.customization::p_ext_resource_category_extended");
        var result = getExtendedColumns(resourceCategory);

        return result.EXTENDED_COLUMNS;
    };

    /**
     * create local project for extensibility and not transport and not affected by upgrade
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
     * create extended view in local repository
     */
    this.createLocalExtendedView = function(columns, type, name) {
        var viewName = name.viewName;
        var viewFullName = convertPathToObjectName(EXT_PACKAGE_ABS, viewName);
        var alias = name.alias;
        var view = new File(viewName + ".hdbview", EXT_PACKAGE_ABS);

        view.create(new artifacts.HDBView(Rules[type].generator(columns)), "data/hdbview");
        view.grant("SELECT", convertPathToObjectName(LOCAL_PACKAGE_ABS, EXT_SQLCC)); // need to be able to select for OData

        return {
            name: viewName,
            fullName: viewFullName,
            alias: alias,
            key: Rules[type].OData.association.dependent.keys,
            association: type + "_" + alias,
            type: type
        };
    };

    this.removeLocalExtendedView = function(name) {
        var view = new File(name.viewName + ".hdbview", EXT_PACKAGE_ABS);
        view.remove();
    };

    /**
     * a nested class for manipulating extend OData service
     */
    var OData = function() {
        this.odata = new File("ext.xsodata", LOCAL_PACKAGE_ABS);
        this.def = new artifacts.XSOData().parse(this.odata.content);

        /**
         * if the master table definition is missing, then initialize it.
         */
        this.init = function() {
            Object.keys(Rules).forEach(function(type) {
                var master = Rules[type].OData.name;
                if (!this.def.objects.hasOwnProperty(master)) {
                    this.def.objects[master] = Rules[type].OData.definition;
                    this.def.objects[master].navigates = {};
                }
            }, this);

            this.def.nullable = true;
        };

        /**
         * add the extend view to OData definition
         */
        this.addExtendedView = function(view) {
            this.def.objects[view.alias] = {
                object: view.fullName,
                key: view.key
            };
        };

        /**
         * remove the extend view from OData definition
         */
        this.removeExtendedView = function(view) {
            delete this.def.objects[view.alias];
        };

        /**
         * add association to combine master service to extend view
         */
        this.addAssociation = function(view) {
            this.def.associations[view.association] = Rules[view.type].OData.association;
            this.def.associations[view.association].dependent.object = view.alias;
        };

        /**
         * remove the association with master service and extend view
         */
        this.removeAssociation= function(view) {
            delete this.def.associations[view.association];
        };

        /**
         * add navigation from master service to extend view
         */
        this.addNavigation = function(view) {
            this.def.objects[Rules[view.type].OData.name].navigates[view.alias] = view.association;
        };

        /**
         * remove the navigation from master service
         */
        this.removeNavigation = function(view) {
            delete this.def.objects[Rules[view.type].OData.name].navigates[view.association];
        };

        /**
         * save the changes of the extend OData service
         */
        this.persist = function() {
            this.odata.setContent(new artifacts.XSOData(this.def), "data/xsodata");
        };

        /**
         * batch add extended views
         */
        this.add = function(views) {
            this.init();

            views.forEach(function(view) {
                this.addExtendedView(view);
                this.addAssociation(view);
                this.addNavigation(view);
            }, this);

            this.persist();
        };

        /**
         * batch remove extended views
         */
        this.remove = function(views) {
            this.init();

            views.forEach(function(view) {
                this.removeNavigation(view);
                this.removeAssociation(view);
                this.removeExtendedView(view);
            }, this);

            this.persist();
        };
    };

    /**
     * interface for extensibility
     */
    this.extend = function() {
        // get the extended column assigned for this resource category
        var extendedColumns = this.getExtendedColumns();

        // initiate the extended OData
        var odata = new OData();
        odata.add(Object.keys(Rules).map(function(type){
            // filter the extended column by the PAGE_ID
            var columns = extendedColumns.filter(function(col) { return col.PAGE_ID === EXT_PAGE_ID[type.toUpperCase()]; });

            var names = generator(type, resourceCategory);

            // create the repository extend view and return its metadata
            return this.createLocalExtendedView(columns, type, names);
        }, this));
    };

    /**
     * interface for undo the extensibility, usually happened when resource category is deleted
     */
    this.revert = function() {
        var odata = new OData();
        var views = Object.keys(Rules).map(function(type) {
            return generator(type, resourceCategory);
        });

        odata.remove(views);

        views.forEach(function(view) {
            this.removeLocalExtendedView(view);
        }, this);
    };

    // always initiate the local project
    this.createLocalProject();
}