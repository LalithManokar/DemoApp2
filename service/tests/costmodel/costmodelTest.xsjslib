/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor;
describe('costmodel unit test', function () {
  var connection;
  var sqlExecutor;
  var url = '/sap/tm/trp/service/costmodel/costmodel.json/';
  var datasetUrl = '/sap/tm/trp/service/costmodel/costdataset.json/';

  // create a dataset before each in case that there is no dataset
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
    var response = jasmine.callHTTPService(datasetUrl, $.net.http.POST, requestBody, headers);
    var body = JSON.parse(response.body.asString());
    return body.data;
  }

  // delete the created dataset after each
  function deleteDataset(id) {
    jasmine.callHTTPService(datasetUrl + id, $.net.http.DEL);
  }

  beforeEach(function () {
    connection = $.db.getConnection();
    sqlExecutor = new SqlExecutor(connection);
  });

  afterEach(function () {
      connection.close();
  });

  it('should create a new costmodel', function() {
      var datasetId = createDataset();
      var requestBodyJSON = {
        CURRENCY_CODE: 'CNY',
        CostDatasets: [{
            COST_DATASET_ID: datasetId,
            RANK: 1,
            TRANSPORTATION_MODE_CODES: '',
            CARRIER_IDS: ''
        }],
        DESC: 'test create cost model',
        ID: -1,
        NAME: 'TEST_CREATE',
        RESOURCE_CATEGORY: 'CN'
    };

    var headers = {'content-Type': 'application/json'};
    var requestBody = JSON.stringify(requestBodyJSON);
    var response = jasmine.callHTTPService(url, $.net.http.POST, requestBody, headers);
    expect(response.status).toBe($.net.http.CREATED);
    var modelId = JSON.parse(response.body.asString()).data;

    // test db
    var costmodeltb = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.costmodel::t_cost_model_new" WHERE NAME = \'TEST_CREATE\'');
    expect(costmodeltb.getRowCount()).toBe(1);

    // delete the created cost model
    response = jasmine.callHTTPService(url + modelId, $.net.http.DEL);
    expect(response.status).toBe($.net.http.NO_CONTENT);

    // delete the created cost set
    deleteDataset(datasetId);
  });

  // create a costmodel
  function createModel() {
      var datasetId = createDataset();
      var requestBodyJSON = {
        CURRENCY_CODE: 'CNY',
        CostDatasets: [{
            COST_DATASET_ID: datasetId,
            RANK: 1,
            TRANSPORTATION_MODE_CODES: '',
            CARRIER_IDS: ''
        }],
        DESC: 'test create cost model',
        ID: -1,
        NAME: 'MODEL_TEST',
        RESOURCE_CATEGORY: 'CN'
      };
      var headers = {'content-Type': 'application/json'};
      var requestBody = JSON.stringify(requestBodyJSON);
      var response = jasmine.callHTTPService(url, $.net.http.POST, requestBody, headers);
      return {
          datasetId: datasetId,
          modelId: JSON.parse(response.body.asString()).data
      };
  }

  // delete the costmodel
  function deleteModel(modelId, datasetId) {
      jasmine.callHTTPService(url + modelId, $.net.http.DEL);
      deleteDataset(datasetId);
  }


  it('should update the costmodel', function () {
      // create a costmodel
      var createResult = createModel();
      var datasetId = createResult.datasetId;
      var modelId = createResult.modelId;

      // updata the created model
      var requestBodyJSON = {
          CURRENCY_CODE: 'CNY',
          CostDatasets: [{
              COST_DATASET_ID: datasetId,
              RANK: 1,
              TRANSPORTATION_MODE_CODES: '',
              CARRIER_IDS: ''
          }],
          DESC: 'test edit a model',
          ID: modelId,
          NAME: 'MODEL_TEST',
          RESOURCE_CATEGORY: 'CN'
      };

      var headers = {'content-Type': 'application/json'};
      var requestBody = JSON.stringify(requestBodyJSON);
      jasmine.callHTTPService(url, $.net.http.PUT, requestBody, headers);

      // check update result
      var costmodeltb = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.costmodel::t_cost_model_new" WHERE NAME = \'MODEL_TEST\'');
      expect(costmodeltb.getRowCount()).toBe(1);

      // delete the costmodel and dataset
      deleteModel(modelId, datasetId);
  });

  it('should delete the costmodel', function () {
      // create  a costmodel
      var createResult = createModel();
      var datasetId = createResult.datasetId;
      var modelId = createResult.modelId;

      // delete the created model
      var response = jasmine.callHTTPService(url + modelId, $.net.http.DEL);
      expect(response.status).toBe($.net.http.NO_CONTENT);

      // delete the created dataset
      jasmine.callHTTPService(datasetUrl + datasetId, $.net.http.DEL);
  });


  it('should filter query', function () {
      // create a dataset
      var datasetId = createDataset();
      // createa a costmodel
      var time = (new Date()).getTime();
      var requestBodyJSON = {
          CURRENCY_CODE: 'CNY',
          CostDatasets: [{
              COST_DATASET_ID: datasetId,
              RANK: 1,
              TRANSPORTATION_MODE_CODES: '',
              CARRIER_IDS: ''
          }],
          DESC: 'create a model',
          ID: -1,
          NAME: 'TEST_' + time,
          RESOURCE_CATEGORY: 'CN'
      };
      var headers = {'content-Type': 'application/json'};
      var response = jasmine.callHTTPService(url, $.net.http.POST, JSON.stringify(requestBodyJSON), headers);
      expect(response.status).toBe($.net.http.CREATED);
      var modelId1 = JSON.parse(response.body.asString()).data;
      // create another model
      time = (new Date()).getTime();
      requestBodyJSON.NAME = 'TEST_' + time;
      response = jasmine.callHTTPService(url, $.net.http.POST, JSON.stringify(requestBodyJSON), headers);
      var modleId2 = JSON.parse(response.body.asString()).data;

      requestBodyJSON = {
          search: '' + time + '',
          filters: {}
      };

      response = jasmine.callHTTPService(url + 'queryFacetFilter', $.net.http.POST, JSON.stringify(requestBodyJSON), headers);
      var body = JSON.parse(response.body.asString());
      expect(body.success).toBeTruthy();
      expect(body.data).toEqual({
          CURRENCY_CODE: [{
              key: 'CNY',
              text: 'CNY'
          }]
      });
      // delete the created model and dataset
      jasmine.callHTTPService(url + modelId1, $.net.http.DEL);
      deleteModel(modleId2, datasetId);
  });
});
