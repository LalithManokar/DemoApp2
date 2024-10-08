var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");

describe('stock calculation model test', function() {
	var dataPackage = "sap.tm.trp.service.tests.costDataset.data";
	
	beforeOnce(function() {});

	beforeEach(function() {});
	
	
	
	it('test container side', function() {
		var procedureName = 'sap.tm.trp.service.tests.rail.calcmodel.stock::sp_test_calc_model_stock';
		var result;
		try {
			var target = new proc.procedure("SAP_TM_TRP", procedureName);
			
	        result = target().OUTPUT;
	        
	    } catch (e) {
	        throw new lib.InternalError('fail to run stock calculation model test sp', e);
	    }
	    
	    expect(result.length).toBe(0);
		
	});
	
	it('test rail side', function() {
		var prepareProc = 'sap.tm.trp.service.tests.rail.calcmodel.stock::sp_test_calc_model_stock_prepare_data';
		try {
			var target = new proc.procedure("SAP_TM_TRP", prepareProc);
			
	        target();
	        
	    } catch (e) {
	        throw new lib.InternalError('fail to prepare rail data', e);
	    }
	    
	    
		var testProc = 'sap.tm.trp.service.tests.rail.calcmodel.stock::sp_test_calc_model_stock_for_carrier';
		var result;
		try {
			var target = new proc.procedure("SAP_TM_TRP", testProc);
			
	        result = target().OUTPUT;
	        
	    } catch (e) {
	        throw new lib.InternalError('fail to run stock calculation model test sp', e);
	    }
	    
	    expect(result.length).toBe(0);
		
	});
	
	
});