var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");

describe('test kpi', function() {
	
	
	
	it('test kpi', function() {
		var procedureName = 'sap.tm.trp.service.tests.rail.kpi::sp_test_kpi';
		var result_idle;
		var result_import;
		var result_export;
		try {
			var target = new proc.procedure("SAP_TM_TRP", procedureName);
			
			result_idle = target().CNT_IDLE;
			result_import = target().CNT_IP;
			result_export = target().CNT_XP;
	        
	    } catch (e) {
	        throw new lib.InternalError('fail to run stock calculation model test sp', e);
	    }
	    
	    expect(result_idle).toBe(586);
	    expect(result_import).toBe(350);
	    expect(result_export).toBe(350);
		
	});
	
	
	
	
});