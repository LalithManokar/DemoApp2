/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
var CSVParser = $.import('/sap/tm/trp/service/costmodel/csv.xsjslib').CSVParser;
var CSV = $.import('/sap/tm/trp/service/costmodel/csv.xsjslib').CSV;

var RepositoryPath = $.import('sap.hana.testtools.unit.util.internal', 'repositoryPath').RepositoryPath;
var Repository = $.import('sap.hana.testtools.unit.util.internal', 'repository').Repository;

var dataPackage = 'sap.tm.trp.service.tests.costmodel.data';

function readFile(packageName, name) {
    var connection = null;
    try {
        connection = $.db.getConnection($.db.isolation.SERIALIZABLE);
        var repository = new Repository(connection);
        return repository.readFile(RepositoryPath.fromPackageAndFilename(packageName, name));
    } finally {
        if (connection) {
            connection.close();
        }
    }
}

describe('csvParser unit test', function() {
    it('test setSeparator', function() {
        var csvParser = new CSVParser();
        // if separator is ''
        expect(function() {
            csvParser.setSeparator('');
        }).toThrow(new Error('Separator must be a string with at least a lenght of 1'));

        // if separator is equal to lineseparator
        csvParser.setLineSeparator('\r\n');
        expect(function() {
            csvParser.setSeparator('\r\n');
        }).toThrow(new Error('Separator and lineSeparator cannot be identical!'));

        // if separator is the same as the start of lineSeparator
        expect(function() {
            csvParser.setSeparator('\r');
        }).toThrow(new Error('Separator cannot be the same as the start of lineSeparator'));
    });

    it('test setLineSeparator', function() {
        var csvParser = new CSVParser();
        // if lineseparator is not string
        expect(function() {
            csvParser.setLineSeparator(1);
        }).toThrow(new Error('LineSeparator must be a string with at least a lenght of 1'));

        // if lineseparator's length less than 1
        expect(function() {
            csvParser.setLineSeparator('');
        }).toThrow(new Error('LineSeparator must be a string with at least a lenght of 1'));

        // if separator and lineseparator are the same
        expect(function() {
            csvParser.setSeparator('\r\n');
            csvParser.setLineSeparator('\r\n');
        }).toThrow(new Error('Separator and lineSeparator cannot be identical!'));
    });

    it('test guess lineSeparator', function() {
        var csvParser = new CSVParser();
        // if content is undefined
        expect(function() {
            csvParser.guessLineSeparator();
        }).toThrow(new Error('setCSVString() has to be called first'));

        // read csv file
        var csvFile = readFile(dataPackage, 'csvtest.csv');
        expect(csvFile).toBeDefined();
        csvParser.setCSVString(csvFile);
        expect(csvParser.guessLineSeparator()).toBe('\n');
    });

    it('test function parse', function() {
        var csvParser = new CSVParser();
        //if not set content
        expect(function() {
            csvParser.parse();
        }).toThrow(new Error('setCSVString() has to be called first or parse() has to be invoked with a string'));

        // read csv file contains quote
        var csvFile = readFile(dataPackage, 'csvtest.csv');
        expect(csvFile).toBeDefined();
        var result = csvParser.parse(csvFile);
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.header).toBeDefined();
        expect(result.content.length).toBe(2);
        expect(result.content[0][0]).toBe(',COST_PROFILE,EUR,PCS,78,0,RAIL_COST_PROFILE,');
        expect(result.header.length).toBe(1);
        expect(result.header[0]).toBe('AGREEMENT_ID,CONNECTION_TYPE_CODE,CURRENCY_CODE,DEFAULT_UOM_CODE,ID,PRIORITY,PROFILE_ID,PURCHASE_ORG_ID');

        // read csv file which contains no content
        csvFile = readFile(dataPackage, 'emptyFile.csv');
        expect(csvFile).toBeDefined();
        result = csvParser.parse(csvFile);
        expect(result).toBeDefined();
        expect(result.header).toBeDefined();
        expect(result.content).toBeUndefined();
    });
});

describe('CSV unit test', function() {
    it('test addValidationFunctionForColumn', function() {
        var csv = new CSV();

        // column index blow 0
        expect(function() {
            csv.addValidationFunctionForColumn(-1, function() {

            });
        }).toThrow(new Error('Cannot set validation function for column with an index below 0'));

        // add a function for column
        function functionForColumn() {

        }
        csv.addValidationFunctionForColumn(0, functionForColumn);
    });

    it('test setExpectedMinimumEntries', function() {
        var csv = new CSV();
        expect(function() {
            csv.setExpectedMinimumEntries('a');
        }).toThrow(new Error('a is not a valid integer!'));
    });

    xit('test setExpectedColumnCount', function() {
        var csv = new CSV();
        expect(function() {
            csv.setExpectedColumnCount(0);
        }).toThrow(new Error('Cannot set an expected column count below 1'));
    });

    it('test isValid', function() {
        // intialize header
        var header = ['AGREEMENT_ID', 'CONNECTION_TYPE_CODE', 'CURRENCY_CODE', 'DEFAULT_UOM_CODE', 'ID', 'PRIORITY', 'PROFILE_ID',
            'PURCHASE_ORG_ID'];
        // initialize content
        var content = [['', 'COST_PROFILE', 'EUR', 'PCS', '78', '0', 'RAIL_COST_PROFILE', ''], ['', 'COST_PROFILE', 'EUR', 'PCS', '78', '0',
            'RAIL_COST_PROFILE', '']];

        var csv = new CSV(header, content);

        // column count is not consitent with the expected count
        // set expected column count
        csv.setExpectedColumnCount(2);
        var result = csv.isValid(function() {
            return true;
        }, 0, 0);
        expect(result.length).toBe(1);
        expect(result[0]).toEqual({
            'reason': 'Column count varies or does not match the expected count of 2',
            'column': -1,
            'row': -1
        });

        // content entries less than expected minimumEntries
        csv.setExpectedMinimumEntries(3);
        result = csv.isValid(function() {
            return true;
        }, 0, 0);
        expect(result.length).toBe(2);
        expect(result[0]).toEqual({
            'reason': 'Column count varies or does not match the expected count of 2',
            'column': -1,
            'row': -1
        });
        expect(result[1]).toEqual({
            'reason': 'Amount of entries (2) does not meet the required minimum of 3',
            'column': -1,
            'row': -1
        });

        // no error
        csv.setExpectedColumnCount(8);
        csv.setExpectedMinimumEntries(2);
        result = csv.isValid(function() {
            return true;
        }, 0, 0);
        expect(result).toBeTruthy();
    });

    it('test isColumnCountCoherent', function() {
        // intialize header
        var header = ['AGREEMENT_ID', 'CONNECTION_TYPE_CODE', 'CURRENCY_CODE', 'DEFAULT_UOM_CODE', 'ID', 'PRIORITY', 'PROFILE_ID',
            'PURCHASE_ORG_ID'];
        // initialize content
        var content = [['', 'COST_PROFILE', 'EUR', 'PCS', '78', '0', 'RAIL_COST_PROFILE', ''], ['', 'COST_PROFILE', 'EUR', 'PCS', '78', '0',
            'RAIL_COST_PROFILE', '']];

        var csv = new CSV(header, content);
        expect(csv.isColumnCountCoherent()).toBeTruthy();

        header = ['CONNECTION_TYPE_CODE', 'CURRENCY_CODE', 'DEFAULT_UOM_CODE', 'ID', 'PRIORITY', 'PROFILE_ID', 'PURCHASE_ORG_ID'];
        csv.header = header;
        expect(csv.isColumnCountCoherent()).toBeFalsy();
    });

    it('test checkColumnCount', function() {
        // intialize header
        var header = ['AGREEMENT_ID', 'CONNECTION_TYPE_CODE', 'CURRENCY_CODE', 'DEFAULT_UOM_CODE', 'ID', 'PRIORITY', 'PROFILE_ID',
            'PURCHASE_ORG_ID'];
        // initialize content
        var content = [['', 'COST_PROFILE', 'EUR', 'PCS', '78', '0', 'RAIL_COST_PROFILE', ''], ['', 'COST_PROFILE', 'EUR', 'PCS', '78', '0',
            'RAIL_COST_PROFILE', '']];

        var csv = new CSV(header, content);
        expect(csv.checkColumnCount(8)).toBeTruthy();
    });

    it('test addValidationSchema', function() {
        // Schema containing a validation object per column.
        // This contains a REGEX, minLength, and maxLength.
        // There is also regexDesc inserted into error messages
        // a function checing this regex will be added to validationFunctions

        // new a csv
        var csv = new CSV();
        // prepare a Schema
        var schema = [{
            'minLength': 0,
            'maxLength': 10
        }, {
            'minLength': 3,
            'maxLength': 8
        }];

        // should add two function arrays into validateFunctions, and each array should contains two validate functions
        csv.addValidationSchema(schema);
        var validateFunctions = csv.getValidateFunctions();
        expect(validateFunctions.length).toBe(2);
        expect(validateFunctions[0].length).toBe(2);
        expect(validateFunctions[1].length).toBe(2);

        // test added function
        var validateFnForFirstCol = validateFunctions[0][0];
        var row = ['', 'COST_PROFILE', 'EUR', 'PCS', '78', '0', 'RAIL_COST_PROFILE', ''];
        var result = validateFnForFirstCol(0, row, 0);
        expect(result).toBeTruthy();

        var validateFnForSecondCol = validateFunctions[1][1];
        result = validateFnForSecondCol(1, row, 0);
        expect(result).toEqual({
            'valid': false,
            'reason': "Value 'COST_PROFILE' doesn't meet the maximum length constraint (8 characters)"
        });
    });

    it('test getAssociativeObject', function () {
        // initialize header
        var header = ['CONNECTION_TYPE_CODE', 'CURRENCY_CODE', 'DEFAULT_UOM_CODE', 'ID', 'PRIORITY', 'PROFILE_ID',
            'PURCHASE_ORG_ID'];
        // initialize content
        var content = [['', 'COST_PROFILE', 'EUR', 'PCS', '78', '0', 'RAIL_COST_PROFILE', ''], ['', 'COST_PROFILE', 'EUR', 'PCS', '78', '0',
            'RAIL_COST_PROFILE', '']];
        var csv = new CSV(header, content);
        expect(function () {
            csv.getAssociativeObject();
        }).toThrow(new Error('Cannot create associative array out on an invalid CSV file'));

        header = ['AGREEMENT_ID', 'CONNECTION_TYPE_CODE', 'CURRENCY_CODE', 'DEFAULT_UOM_CODE', 'ID', 'PRIORITY', 'PROFILE_ID',
            'PURCHASE_ORG_ID'];
        csv.header = header;
        var result = csv.getAssociativeObject();
        expect(result).toEqual([
            {
                'AGREEMENT_ID': '',
                'CONNECTION_TYPE_CODE': 'COST_PROFILE',
                'CURRENCY_CODE': 'EUR',
                'DEFAULT_UOM_CODE': 'PCS',
                'ID': '78',
                'PRIORITY': '0',
                'PROFILE_ID': 'RAIL_COST_PROFILE',
                'PURCHASE_ORG_ID': ''
            },
            {
                'AGREEMENT_ID': '',
                'CONNECTION_TYPE_CODE': 'COST_PROFILE',
                'CURRENCY_CODE': 'EUR',
                'DEFAULT_UOM_CODE': 'PCS',
                'ID': '78',
                'PRIORITY': '0',
                'PROFILE_ID': 'RAIL_COST_PROFILE',
                'PURCHASE_ORG_ID': ''
            }
        ]);
    });

    it('test createFromArray', function () {
        var csv = new CSV();
        // if data_ar.length<1
        var data_ar = [];
        expect(function () {
            csv.createFromArray(data_ar);
        }).toThrow(new Error('Array does not contain header'));

        data_ar = [
            ['name','age', 'desc']
        ];
        expect(csv.createFromArray(data_ar)).toEqual(new CSV(['name', 'age', 'desc'], []));

        data_ar = [
            ['name','age','desc'],
            ['TEST1', 10, 'test1'],
            ['TEST2', 20, 'test2']
        ];
        expect(csv.createFromArray(data_ar)).toEqual(new CSV(['name', 'age', 'desc'], [['TEST1', 10, 'test1'], ['TEST2', 20, 'test2']]));
    });

    it('test createFromAssociativeObjects', function () {
        // initialzie assoc_ar
        var assoc_ar = [{
            name: 'TEST1',
            age: '10',
            desc: 'test1'
        }, {
            name: 'TEST2',
            age: '20',
            desc: 'test2'
        }];

        // initialze order_ar
        var order_ar = ['name', 'age', 'desc'];
        var csv = new CSV();
        // test create from assoc_ar and order_ar
        var result = csv.createFromAssociativeObjects(assoc_ar, order_ar);
        expect(result).toEqual(new CSV(['name', 'age', 'desc'], [['TEST1', '10', 'test1'], ['TEST2', '20', 'test2']]));
    });

    it('test convert to csv', function () {
        // initialize header
        var header = ['CONNECTION_TYPE_CODE', 'CURRENCY_CODE', 'DEFAULT_UOM_CODE', 'ID', 'PRIORITY', 'PROFILE_ID',
            'PURCHASE_ORG_ID'];
        // initialize content
        var content = [['', 'COST_PROFILE', 'EUR', 'PCS', '78', '0', 'RAIL_COST_PROFILE', ''], ['', 'COST_PROFILE', 'EUR', 'PCS', '78', '0',
            'RAIL_COST_PROFILE', '']];

        var csv = new CSV(header, content);
        var result = csv.toCSV('\n', ',');
        expect(result).toBeDefined();
        expect(result).toEqual('CONNECTION_TYPE_CODE,CURRENCY_CODE,DEFAULT_UOM_CODE,ID,PRIORITY,PROFILE_ID,PURCHASE_ORG_ID\n,COST_PROFILE,EUR,PCS,78,0,RAIL_COST_PROFILE,\n,COST_PROFILE,EUR,PCS,78,0,RAIL_COST_PROFILE,')

        expect(csv.toCSV('\r\n', ';')).toEqual('CONNECTION_TYPE_CODE;CURRENCY_CODE;DEFAULT_UOM_CODE;ID;PRIORITY;PROFILE_ID;PURCHASE_ORG_ID\r\n;COST_PROFILE;EUR;PCS;78;0;RAIL_COST_PROFILE;\r\n;COST_PROFILE;EUR;PCS;78;0;RAIL_COST_PROFILE;')
    });
});
