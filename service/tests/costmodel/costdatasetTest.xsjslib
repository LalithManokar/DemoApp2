/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor;

describe('cost dataset unit test', function () {
  var connection;
  var sqlExecutor;
  var url = '/sap/tm/trp/service/costmodel/costdataset.json/';

  beforeEach(function () {
    connection = $.db.getConnection();
    sqlExecutor = new SqlExecutor(connection);
  });

  afterEach(function () {
    connection.close();
  });

  function createDataset() {
    var requestBodyJSON = {
      NAME: 'TEST_CNY',
      DESC: 'create_cny',
      COST_DATASET_ID: -1,
      COST_TYPE_CODE: 'DISTANCE_BASED_COST',
      RESOURCE_CATEGORY: 'CN',
      CURRENCY_CODE: 'CNY',
      CONNECTION_TYPE_CODE: 'NO_CONNECT',
      DEFAULT_UOM_CODE: 'PCS',
      CONNECTION_ID: 'TRPADM1465896187631',
      CARRIER_ID_LIST: 'ZRAIL01,ZRAIL02',
      TIMEZONE: -480
    };
    var headers = {'content-Type': 'application/json'};
    var requestBody = JSON.stringify(requestBodyJSON);
    var response = jasmine.callHTTPService(url, $.net.http.POST, requestBody, headers);
    var body = JSON.parse(response.body.asString());
    return body.data;
  }

  function deleteDataset(datasetId) {
    jasmine.callHTTPService(url + datasetId, $.net.http.DEL);
  }

  it("should create a new dataset", function () {
    // create a cost dataset
    var requestBodyJSON = {
      NAME: 'TEST_CNY',
      DESC: 'create_cny',
      COST_DATASET_ID: -1,
      COST_TYPE_CODE: 'DISTANCE_BASED_COST',
      RESOURCE_CATEGORY: 'CN',
      CURRENCY_CODE: 'CNY',
      CONNECTION_TYPE_CODE: 'NO_CONNECT',
      DEFAULT_UOM_CODE: 'PCS',
      CONNECTION_ID: 'TRPADM1465896187631',
      CARRIER_ID_LIST: 'ZRAIL01,ZRAIL02',
      TIMEZONE: -480
    };

    var headers = {'content-Type': 'application/json'};
    var requestBody = JSON.stringify(requestBodyJSON);
    var response = jasmine.callHTTPService(url, $.net.http.POST, requestBody, headers);
    expect(response.status).toBe($.net.http.CREATED);
    var body = JSON.parse(response.body.asString());
    expect(body.success).toBeTruthy();
    expect(body.data).toBeDefined();
    var datasetId = body.data;

    // check db
    var sql = 'SELECT * FROM "sap.tm.trp.db.costmodel::t_cost_dataset" WHERE ID = \''+datasetId+'\'' ;
    // check record in distance_base_cost
    var costTable = sqlExecutor.execQuery(sql);
    expect(costTable.getRowCount()).toBe(1);

    // delete the created dataset
    response = jasmine.callHTTPService(url + datasetId, $.net.http.DEL);
    expect(response.status).toBe($.net.http.NO_CONTENT);
  });

  it('should delete a dataset', function () {
    var datasetId = createDataset();
    expect(datasetId).toBeDefined();

    var response = jasmine.callHTTPService(url + datasetId, $.net.http.DEL);
    expect(response.status).toBe($.net.http.NO_CONTENT);
  });

  it('should update a new dataset', function () {
    // create a cost dataset firstly
    var datasetId = createDataset();
    expect(datasetId).toBeDefined();

    var requestBodyJSON = {
      NAME: 'TEST_CNY',
      DESC: 'testedit',
      COST_DATASET_ID: datasetId,
      COST_TYPE_CODE: 'DISTANCE_BASED_COST',
      CURRENCY_CODE: 'CNY',
      CONNECTION_TYPE_CODE: 'CUSTOM',
      DEFAULT_UOM_CODE: 'PCS',
      PURCHASE_ORG_ID: null,
      AGREEMENT_ID: null,
      EXPIRED_DURATION: 2,
      TIMEZONE: -480,
      CARRIER_ID_LIST: 'ICTEST, ZRAIL01,ZRAIL02',
      CONNECTION_ID: 'TRPADM1465969962618',
      RESOURCE_CATEGORY: 'CN'
    };
    var headers = {'content-Type': 'application/json'};

    var requestBody = JSON.stringify(requestBodyJSON);
    var response = jasmine.callHTTPService(url + datasetId, $.net.http.PUT, requestBody, headers);
    expect(response.status).toBe($.net.http.NO_CONTENT);
    // check db
    var sql = 'SELECT * FROM "sap.tm.trp.db.costmodel::t_cost_dataset" WHERE ID = \''+datasetId+'\'' ;
    // check record in distance_base_cost
    var costTable = sqlExecutor.execQuery(sql);
    expect(costTable.getRowCount()).toBe(1);

    var row = costTable.getRow(0);
    expect(row.DESC).toBe('testedit');

    deleteDataset(datasetId);

  });

  // test csv file upload/download etc...
  xit('should upload a csv file', function () {

  });

  xit('should download a csv file', function () {

  });

  xit('should cancel the uploaded file', function () {

  });

  it('should query facet', function () {
      //create two datasets
      var time = (new Date()).getTime();
      var requestBodyJSON =  {
        NAME: 'TEST_'+ time,
        DESC: 'create_cny',
        COST_DATASET_ID: -1,
        COST_TYPE_CODE: 'DISTANCE_BASED_COST',
        RESOURCE_CATEGORY: 'CN',
        CURRENCY_CODE: 'CNY',
        CONNECTION_TYPE_CODE: 'NO_CONNECT',
        DEFAULT_UOM_CODE: 'PCS',
        CONNECTION_ID: 'TRPADM1465896187631',
        CARRIER_ID_LIST: 'ZRAIL01,ZRAIL02',
        TIMEZONE: -480
      };
      var headers = {'content-Type': 'application/json'};
      var reqeustBody = JSON.stringify(requestBodyJSON);
      var response = jasmine.callHTTPService(url, $.net.http.POST, reqeustBody, headers);
      var body = JSON.parse(response.body.asString());
      var datasetId1 = body.data;

      requestBodyJSON.NAME = 'TEST_CNY_2';
      response = jasmine.callHTTPService(url, $.net.http.POST, JSON.stringify(requestBodyJSON), headers);
      var datasetId2 = JSON.parse(response.body.asString()).data;

      requestBodyJSON = {
          'search': '' + time + '',
          'filters': {},
          'RESOURCE_CATEGORY': 'CN'
      }

      response = jasmine.callHTTPService(url + 'queryFacetFilter', $.net.http.POST, JSON.stringify(requestBodyJSON), headers);
      body = JSON.parse(response.body.asString());
      expect(body.success).toBeTruthy();
      expect(body.data).toEqual({
          'COST_TYPE_CODE': [{
              'key': 'DISTANCE_BASED_COST',
              'text': 'Distance-Based Cost'
          }],
          'CURRENCY_CODE': [{
              'key': 'CNY',
              'text': 'CNY'
          }]
      });

      response = jasmine.callHTTPService(url + datasetId1, $.net.http.DEL);
      expect(response.status).toBe($.net.http.NO_CONTENT);
      response = jasmine.callHTTPService(url + datasetId2, $.net.http.DEL);
      expect(response.status).toBe($.net.http.NO_CONTENT);
  });
});
