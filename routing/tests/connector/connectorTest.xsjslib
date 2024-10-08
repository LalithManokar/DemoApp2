var csvParser = $.import("sap.hana.testtools.unit.util.internal", "csvParser");
var tableDataSet = $.import('sap.hana.testtools.unit.util', 'tableDataSet');
var TableUtils = $.import('sap.hana.testtools.unit.util', 'tableUtils').TableUtils;
var mockstarEnvironment = $.import('sap.hana.testtools.mockstar', 'mockstarEnvironment');
var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor;
var i18nLib = $.import('sap.hana.xs.i18n', 'text');
var TMCXSProc = $.import("sap.hana.xs.libs.dbutils", "procedures");
var testUtilLib = $.import("sap.tm.trp.routing.tests.util", "testUtil");
var RepositoryPath = $.import("sap.hana.testtools.unit.util.internal", "repositoryPath").RepositoryPath;
var Repository = $.import("sap.hana.testtools.unit.util.internal", "repository").Repository;

var SCHEMA = 'SAP_TM_ROUTING';
var TRP_SCHEMA = 'SAP_TM_TRP';
var TEST_SCHEMA = 'SAP_TM_ROUTING_TEST';
var TEST_DATA_PACKAGE = 'sap.tm.trp.routing.tests.data.connector';

// This is just to test the procedure copied from sap.tm.trp.routing.db.connecotr::p_map_mtr
// There is some problem met with view substitution.
// Without schema prefix, it is not able to substitute view anymore
// Hope this can be resolved sometime later
describe('test basic connection function', function() {

	var conn;
	var bundle;
	var csvProperties;
	var sqlExecutor;
	var tableUtils;
	var theTestTale;
	
	var testEnvironmentMapMTRDataset;
	
	var mapMTRProc;
	
	beforeOnce(function() {
		conn = $.db.getConnection();
		tableUtils = new TableUtils(conn);
		
		bundle = i18nLib.loadBundle('sap.tm.trp.routing.db.common', 'message', $.request.language);
		csvProperties = {
			separator: ',',
			headers: true
		};
		
		sqlExecutor = new SqlExecutor(conn);

		TMCXSProc.setTempSchema(mockstarEnvironment.userSchema);
		
		mapMTRProc = TMCXSProc.procedure(
			TEST_SCHEMA,
			'sap.tm.trp.routing.tests.db',
			'p_map_mtr', {
				connection: conn
			}
		);
	});

	beforeEach(function() {
		sqlExecutor.execSingle('delete from "SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_mtr_map"');
	});

	/**
	 * 
	 */
	it("mtr mapping should return result as expected", function(){
	    
	    tableUtils.fillFromCsvFile(
			'"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_mtr_map"',
			TEST_DATA_PACKAGE,
			'mtr_map_1.csv',
			csvProperties
		);
        conn.commit();
		
		var mtrs = [
		    {
    			ID:  '1',
    			MOT: '01',
    			MTR: '0001'
		    },{
    			ID:  '2',
    			MOT: '02',
    			MTR: '0002'
		    },{
    			ID:  '3',
    			MOT: '02',
    			MTR: ''
		    },{
    			ID:  '4',
    			MOT: '03',
    			MTR: ''
		    },{
    			ID:  '5',
    			MOT: '11',
    			MTR: '0001'
		    }
		];
		
		var result = mapMTRProc(mtrs);
		
		expect(result.RETURN_CODE).toBe(0);
		expect(result.MAPPED_ID_MTR.length).toBe(5);
		conn.commit();
		
		expect(result.MAPPED_ID_MTR.find(function(m){
		    return m.ID === '1';
		}).MTR).toBe('T0001');
		
		expect(result.MAPPED_ID_MTR.find(function(m){
		    return m.ID === '2';
		}).MTR).toBe('T0002');
		
		expect(result.MAPPED_ID_MTR.find(function(m){
		    return m.ID === '3';
		}).MTR).toBe('T0002');
		
		expect(result.MAPPED_ID_MTR.find(function(m){
		    return m.ID === '4';
		}).MTR).toBe('T0001');
		
		expect(result.MAPPED_ID_MTR.find(function(m){
		    return m.ID === '5';
		}).MTR).toBe('T0001');
	});
	
	/**
	 * 
	 */
	it("mtr mapping raise exception", function(){

		tableUtils.fillFromCsvFile(
			'"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_mtr_map"',
			TEST_DATA_PACKAGE,
			'mtr_map_2.csv',
			csvProperties
		);
        conn.commit();
		var mtrs = [
		    {
    			ID:  '1',
    			MOT: '03',
    			MTR: '0033'
		    },{
    			ID:  '2',
    			MOT: '11',
    			MTR: '0001'
		    }
		];
		
		var result = mapMTRProc(mtrs);
		
		expect(result.RETURN_CODE).toBe(1);
		
		expect(result.MESSAGE.length).toBe(2);
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_MTR_MAP_NOT_FOUND', ['03', '0033'])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_MTR_MAP_NOT_FOUND', ['11', '0001'])
		});
	});

});