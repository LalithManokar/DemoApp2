var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");

describe('test moving stock', function() {
	
	
	
	it('test moving stock', function() {
		var procedureName = 'sap.tm.trp.service.tests.rail.movingstock::sp_test_movingstock';
		var result;
		try {
			var target = new proc.procedure("SAP_TM_TRP", procedureName);
			
	        result = target().CNT;
	        
	    } catch (e) {
	        throw new lib.InternalError('fail to run stock calculation model test sp', e);
	    }
	    
	    expect(result).toBe(37);
		
	});
	
	
	
	
});