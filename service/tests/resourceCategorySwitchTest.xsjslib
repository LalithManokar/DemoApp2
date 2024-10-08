var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor;

describe("Resource Category Switch Unit Test", function () {
  var sqlExecutor;
  var connection;
  var url = "/sap/tm/trp/service/user/settings.json";

  beforeEach(function(){
    connection = $.db.getConnection();
    sqlExecutor = new SqlExecutor(connection);
    sqlExecutor.execSingle('INSERT INTO \"sap.tm.trp.db.semantic.resource::t_resource_category\" VALUES (\'RCUT\', \'just for backend UT case\', \'RC\') ');

    var sql1 = "INSERT INTO \"sap.tm.trp.db.systemmanagement.customization::t_resource_category_settings\" VALUES (200, \'RCUT\', \'RC\', 12, 10, 1, 1, \'\', 299, \'\', 299, \'\')";
    sqlExecutor.execSingle(sql1);

    var sql2 = "INSERT INTO \"sap.tm.trp.db.systemmanagement.customization::t_resource_category_settings_t\" VALUES (200, \'E\', \'\')";    
    sqlExecutor.execSingle(sql2);

    connection.commit();
    });

  afterEach(function(){
    sqlExecutor.execSingle("DELETE FROM \"sap.tm.trp.db.semantic.resource::t_resource_category\" WHERE CODE = \'RCUT\' ");
    sqlExecutor.execSingle("DELETE FROM \"sap.tm.trp.db.systemmanagement.customization::t_resource_category_settings\" WHERE ID = 200");
    sqlExecutor.execSingle("DELETE FROM \"sap.tm.trp.db.systemmanagement.customization::t_resource_category_settings_t\" WHERE ID = 200");
    
    connection.commit();
    connection.close();
  });

    it("should get user setting", function () {
    var response = jasmine.callHTTPService(url, $.net.http.GET);
    expect(response.status).toBe($.net.http.OK);
    
    var body = JSON.parse(response.body.asString());
    expect(body.success).toBeTruthy();
   
    //Insert new category RCUT should be both in DB table and service response
    var resourceCategories = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.semantic.resource::t_resource_category"');
    var bFound = false;
    for (var i=0; i<resourceCategories.getRowCount(); i++) {
        if (resourceCategories.getRow(i).CODE === 'RCUT')
        {
            bFound = true;
        }
    }
    expect(bFound).toBe(true);

    var resourceCategoryArray = body.data.RESOURCE_CATEGORY;
    var selectedCategory = resourceCategoryArray.find(function(oCategory){
        return oCategory.CODE === 'RCUT';
    });
    expect(selectedCategory.CODE).toBe('RCUT');

    // resource category list length should be the same as row count of t_resource_category
    expect(resourceCategories.getRowCount()).toBe(resourceCategoryArray.length);
  });

});
