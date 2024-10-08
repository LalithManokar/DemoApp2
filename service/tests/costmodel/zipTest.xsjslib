/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
var Zipper = $.import('/sap/tm/trp/service/costmodel/zip.xsjslib').Zipper;

describe('zip unit test', function() {
    it('test function addFile', function() {
        var zipper = new Zipper();

        zipper.addFile('test_file_name', 'this is a test for function addFile');

        expect(zipper.files.length).toBe(1);
        expect(zipper.files[0]).toEqual({
            filename: 'test_file_name',
            content: 'this is a test for function addFile'
        });
    });

    it('test to create a zip', function() {
        // initialize zipper.files
        var zipper = new Zipper();
        zipper.files = [{
            filename: 'test1',
            content: 'this is test 1'
        }, {
            filename: 'test2',
            content: 'this is test 2'
        }, {
            filename: 'test3',
            content: 'this is test 3'
        }];
        var result = zipper.createZip();
        expect(result).toBeDefined();
    });
});