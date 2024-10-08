var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var Procedure =  ($.import("/sap/tm/trp/service/xslib/procedures.xsjslib")).Procedure;
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");

var entity = new lib.SimpleRest({name: "Extensibility", desc: "Extensibility Service"});

entity.setModel(new ($.import('/sap/tm/trp/service/model/customization.xsjslib').ExtendedColumn)());

entity.create = function(params) {
    var create = new Procedure("SAP_TM_TRP", "sap.tm.trp.db.common::p_ext_fields_create");
    
    var length = 0;
    if(params.obj.LENGTH !== '') {
        length = params.obj.LENGTH;
    }
    
    var result = create(
        params.obj.PAGE_ID,
        params.obj.NAME,
        params.obj.DISPLAY_NAME,
        params.obj.DESCRIPTION,
        params.obj.DATA_TYPE,
        length,        
        1, // all extended columns are searchable
        params.obj.FILTERABLE
    );

    return {
        ID: result.EXT_FIELD_ID
    };
};

entity.destroy = function(params) {
    (new Procedure("SAP_TM_TRP", "sap.tm.trp.db.common::p_ext_fields_delete"))(params.id);
};

entity.update = function(params) {
	
	var conn, page_id, rs;
	
	//get page id
	var sqlGet = "SELECT PAGE_ID FROM \"sap.tm.trp.db.common::t_extended_fields\" WHERE ID = ? ";
	try {
        conn = $.hdb.getConnection();
        rs = conn.executeQuery(sqlGet, params.id);
        page_id = rs[0]["PAGE_ID"];
    }catch (e) {
        throw e;
    }
    
    if (page_id == 103 || page_id == 104){
    	var update_pickupreturn_proc = new Procedure ("SAP_TM_TRP", "sap.tm.trp.db.common::p_pickupreturn_ext_field_desc_update");
    	update_pickupreturn_proc(
    			params.id,
    			params.obj.DESCRIPTION
    	);
    }    
    else {   
	    var update= new Procedure("SAP_TM_TRP", "sap.tm.trp.db.common::p_ext_fields_update");
	    
	    var length = 0;
	    if(params.obj.LENGTH !== '') {
	        length = params.obj.LENGTH;
	    }
	    
	    update(
	        params.id,
	        params.obj.DISPLAY_NAME,
	        params.obj.DESCRIPTION,
	        params.obj.DATA_TYPE,
	        length, 
	        1, // all extended columns are searchable
	        params.obj.FILTERABLE
	    );
    }

};

entity.facetFilter = function(params) {
    "@route {method:POST scope:collection response:OK}";

    var filterProc = new Procedure("SAP_TM_TRP", "sap.tm.trp.db.common::sp_extensible_column_facet_filter");
    var result = filterProc(
        params.obj.search,
        params.obj.PAGE_ID_LIST_INPUT
    );

    return {
        PAGE_ID: result.FILTERED_OUTPUT.map(function(i) { return {key : i.ID, text : i.DESC};})
    };
};

entity.setFilters([
     {
         filter: function() {
             var privilege = "sap.tm.trp.service::RegisterExtensionField";
             if (!$.session.hasAppPrivilege(privilege)) {
                 throw new lib.NotAuthorizedError(messages.MSG_ERROR_INSUFFICIENT_PRIVILEGE, privilege);
             }

             return true;
         },
         only: ["create", "update"]
     },
     {
         filter: function() {
             var privilege = "sap.tm.trp.service::UnregisterExtensionField";
             if (!$.session.hasAppPrivilege(privilege)) {
                 throw new lib.NotAuthorizedError(messages.MSG_ERROR_INSUFFICIENT_PRIVILEGE, privilege);
             }

             return true;
         },
         only: ["destroy"]
     },
     {
         filter: function(params) {
             var check = new Procedure("SAP_TM_TRP", "sap.tm.trp.db.common::p_column_extended_delete_check");
             var result = check(params.id);

             if (result.WHEREUSED.length > 0) {
                 throw new lib.InternalError(messages.MSG_EXTEND_COLUMN_IS_USED, result.WHEREUSED);
             }

             return true;
         },
         only: ["destroy"]
     }
]);

entity.handle();