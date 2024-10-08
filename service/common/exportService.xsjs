var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var auth = $.import("/sap/tm/trp/service/xslib/geoCheck.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var CSV = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSV)();
var csvParser = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSVParser)();
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var zipper = new ($.import("/sap/tm/trp/service/xslib/zip.xsjslib").Zipper)();
var model = $.import("/sap/tm/trp/service/model/exportModel.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var utils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib");
var ext = $.import("/sap/tm/trp/service/xslib/ext.xsjslib");

var SCHEMA = constants.SCHEMA_NAME;

csvParser.setLineSeparator(csvParser.LINE_SEPARATOR_WINDOWS);
csvParser.setSeparator(",");

var exportService = new lib.SimpleRest({
    name : "Export Service",
    desc : "Service to get data to be exported to csv",
    model : new model.ExportModel()
});

var Metadata = {};
var timeOffset;
Metadata[constants.EXPORT_AREA.EQUI_VISIBILITY] = {
    name : "sap.tm.trp.db.equipment/cv_equipment_visibility_equip_info",
    type : "cv",
    filters : [ {
        name : "RESOURCE_FILTER_ID",
        key : "EQUI_FILTER"
    }, {
        name : "LOCATION_FILTER_ID",
        key : "LOC_FILTER"
    }, {
        name : "ATTRIBUTE_GROUP_ID",
        key : "ATTR_GROUP"
    }, {
        name : "ATTRIBUTE_NODE_LIST",
        key : "ATTR_GROUP_MAPPING"
    }, {
        name : "LOCATION",
        key : "LOCATION"
    }, {
        name : "RESOURCE_TYPE",
        key : "RESOURCE_TYPE"
    }, {
        name : "LEASE_CONTRACT_REFERENCE",
        key : "LEASE_CONTRACT_REFERENCE"
    }, {
        name : "RES_ID",
        key : "RES_ID"
    }, {
        name : "IN_MOVEMENT_STATUS",
        key : "IN_MOVEMENT_STATUS"
    }, {
        name : "IN_RESOURCE_CATEGORY",
        key : "RESOURCE_CATEGORY"
    }, {
        name : "IN_RESOURCE_STATUS",
        key : "RESOURCE_STATUS"
    } ],
    ext: {
        generator: function(resourceCategory) {
            return ext.generator("Resource", resourceCategory);
        },
        params: "RESOURCE_CATEGORY",
        joinCondition: {
            left: "RESOURCE_ID",
            right: "RESOURCE_ID"
        },
        joinType: "LEFT OUTER"
    }
};
Metadata[constants.EXPORT_AREA.STOCK_BY_LOCATION] = {
    name : "sap.tm.trp.db.equipment::p_get_stock_table",
    type : "sp",
    filters : [ {
        name : "ATTRIBUTE_GROUP_ID",
        key : "ATTR_GROUP"
    }, {
        name : "EQUIPMENT_FILTER_ID",
        key : "EQUI_FILTER"
    }, {
        name : "LOCATION_FILTER_ID",
        key : "LOC_FILTER"
    }, {
        name : "RESOURCE_CATEGORY",
        key : "RESOURCE_CATEGORY"
    }, {
        name : "NODE_ID_LIST",
        key : "NODE_ID_LIST"
    }, {
        name : "RESOURCE_TYPE_LIST",
        key : "RESOURCE_TYPE_LIST"
    }, {
        name : "LOCATION_ID_LIST",
        key : "LOCATION_ID_LIST"
    } ],
    output : "OUTPUT_STOCK"
};
Metadata[constants.EXPORT_AREA.STOCK_BY_RESOURCE] = {
    name : "sap.tm.trp.db.equipment::p_get_stock_table_resource_location",
    type : "sp",
    filters : [ {
        name : "ATTRIBUTE_GROUP_ID",
        key : "ATTR_GROUP"
    }, {
        name : "EQUIPMENT_FILTER_ID",
        key : "EQUI_FILTER"
    }, {
        name : "LOCATION_FILTER_ID",
        key : "LOC_FILTER"
    }, {
        name : "RESOURCE_CATEGORY",
        key : "RESOURCE_CATEGORY"
    }, {
        name : "NODE_ID_LIST",
        key : "NODE_ID_LIST"
    }, {
        name : "RESOURCE_TYPE_LIST",
        key : "RESOURCE_TYPE_LIST"
    }, {
        name : "LOCATION_ID_LIST",
        key : "LOCATION_ID_LIST"
    } ],
    output : "OUTPUT_STOCK"
};
Metadata[constants.EXPORT_AREA.TRACKING] = {
    name : "sap.tm.trp.db.eventprocessing/cv_tracking_history",
    type : "cv",
    filters : [ {
        name : "RESOURCE_FILTER_ID",
        key : "EQUI_FILTER"
    }, {
        name : "LOCATION_FILTER_ID",
        key : "LOC_FILTER"
    }, {
        name : "START_TIME",
        key : "START_TIME"
    }, {
        name : "END_TIME",
        key : "END_TIME"
    }, {
        name : "RESOURCE_NAME",
        key : "RESOURCE_NAME"
    } ]
};

exportService.metaData = {};
exportService.psmtValues = [];
exportService.csvContent = [];
exportService.fetchedRecords = 0;

exportService.getMetadata = function(viewDef) {
    var conn, temp,items = {};
    try {
        conn = $.hdb.getConnection();
        var result= conn.executeQuery("select COLUMN_NAME, DATA_TYPE_NAME  from VIEW_COLUMNS where VIEW_NAME= '" + viewDef.name + "'");
        result=result.getIterator()
        while (result.next()) {
            temp=result.value();
            items[temp['COLUMN_NAME']] = temp['DATA_TYPE_NAME'];
        }
        conn.commit();
        //ps.close();
    } catch (e) {
        logger.error("METADATA_GET_FAILED", e);
        throw new lib.InternalError(messages.MSG_EXPORT_ERROR_GETTING_METADATA, e);
    } finally {
        conn.close();
    }
    return items;
};

exportService.setScalar = function(type, position, value, statement) {
    if (value === null || value === undefined) {
        statement.setNull(position);
        return;
    }
    switch (type) {
    case "BIGINT":
        statement.setBigInt(position, value);
        break;
    case "INTEGER":
    case "TINYINT":
    case "SMALLINT":
        statement.setInteger(position, parseInt(value, 10));
        break;
    case "NVARCHAR":
    case "VARCHAR":
    case "CHAR":
        statement.setString(position, String(value));
        break;
    case "TIMESTAMP":
        // auto convert if the value is of string type
        if (typeof value === "string") {
            value = new Date(Date.parse(value));
        }
        // local time need convert to UTC time
        var t = new Date(value.getTime() + value.getTimezoneOffset() * 60
                * 1000);
        statement.setTimestamp(position, t);
        break;
    case "DATE":
        statement.setDate(position, value);
        break;
    case "DECIMAL":
        statement.setDecimal(position, value);
        break;
    default: // fallback
        statement.setString(position, String(value));
        break;
    }
};

exportService.getTotalCount = function(SQL) {
    var query = "SELECT count(1) " + " from (" + SQL + " ) ";
    var count = 0;
    var conn = $.hdb.getConnection();
    try {
        //var ps = conn.prepareStatement(query);
        //var self = this;
        var paramArr = [];
        this.psmtValues.forEach(function(item, index) {
            paramArr.push(item.value);
            //self.setScalar(self.metaData[item.name], index + 1, item.value, ps);
        });

        var result = conn.executeQuery(query);
        result=result.getIterator();
        while (result.next()) {
            var temp=result.value();
            count = parseInt(temp['COUNT(1)'].toString())
        }
        conn.commit();
        //ps.close();
    } catch (e) {
        logger.error("TOTAL_COUNT_GET_FAILED", e);
        throw new lib.InternalError(
                messages.MSG_EXPORT_ERROR_GETTING_TOTAL_COUNT, e);
    } finally {
        conn.close();
    }
    return count;
};

exportService.buildSQL = function(params) {
    var viewDef = Metadata[params.obj.PAGE];
    var self = this;
    self.metaData = this.getMetadata(viewDef);

    var extColumns = params.obj.SELECTED_COLUMNS.filter(function(col) { return col.type === 2; });

    var SQL = "SELECT " + params.obj.SELECTED_COLUMNS.filter(function(col) { return col.type !== 2; }).map(function(key) {
        if (self.metaData[key.key] === undefined || self.metaData[key.key] === null) {
            throw new lib.InternalError(
                    messages.MSG_EXPORT_ERROR_COLUMN_DOES_NOT_EXISITS,
                    key.key);
        }

        return "a." + key.key;
    }).join(", ");

    if (extColumns.length > 0 && viewDef.ext) {
        SQL += "," + extColumns.map(function(col) { return "b." + col.key; }).join(",");
    }

    SQL += " from \"_SYS_BIC\".\"" + viewDef.name + "\" ( " + viewDef.filters.map(
            function(item) {
                return "PLACEHOLDER.\"$$" + item.name + "$$\" => '" + params.obj[item.key] + "'";
            }
        ).join(", ") + " ) AS a ";

    if (extColumns.length > 0 && viewDef.ext) {
        var extended = viewDef.ext.generator(params.obj[viewDef.ext.params]);

        SQL += " " + viewDef.ext.joinType + " JOIN \"" + extended.fullName + "\" AS b ON a." + viewDef.ext.joinCondition.left + " = b." + viewDef.ext.joinCondition.left;
    }

    /* End of filter , now where condition */
    var whereString = "";
    if (params.obj.SEARCH_VALUE !== undefined
            && params.obj.SEARCH_VALUE !== null
            && params.obj.SEARCH_VALUE.length > 0) {
        whereString = this.buildSearchFilterCondition(params);
        if (whereString.length > 0) {
            whereString = " ( " + whereString + " ) ";
        }
    }
    if (params.obj.FACET_FILTER !== undefined
            && params.obj.FACET_FILTER !== null
            && Object.keys(params.obj.FACET_FILTER).length > 0) {
        var facetFilterConditions = this.buildFacetFilterCondition(params);

        if (whereString.length > 0) {
            whereString = (whereString + " AND  " + facetFilterConditions);
        } else {
            whereString = facetFilterConditions;
        }
    }

    if (params.obj.COLUMN_FLITER !== undefined
            && params.obj.COLUMN_FLITER !== null
            && Object.keys(params.obj.COLUMN_FLITER).length > 0) {
        var columnFilterConditions = this.buildColumnFilterCondition(params);

        if (whereString.length > 0) {
            whereString = (whereString + " AND  " + columnFilterConditions);
        } else {
            whereString = columnFilterConditions;
        }

    }
    if (whereString.length > 0) {
        SQL += (" WHERE " + whereString);
    }
    return SQL;
};

exportService.buildSearchFilterCondition = function(params) {
    var searchText = "%" + params.obj.SEARCH_VALUE.toLowerCase() + "%";
    var self = this;
    var whereString = params.obj.SEARCH_FIELDS.map(function(field) {
        if (self.metaData[field] === undefined
                || self.metaData[field] === null) {
            throw new lib.InternalError(
                    messages.MSG_EXPORT_ERROR_COLUMN_DOES_NOT_EXISITS,
                    field);
        }
        self.psmtValues.push({
            "name" : field,
            "value" : searchText
        });
        return " lower(" + field + ") like ?";
    }).join(" OR ");

    if (whereString.length > 0) {
        whereString = " ( " + whereString + " ) ";
    }
    return whereString;
};

exportService.buildFacetFilterCondition = function(params) {
    var self = this;
    var facetFilterConditions = " " +
        Object.keys(params.obj.FACET_FILTER).map(
            function(key) {
                var values = params.obj.FACET_FILTER[key];
                if (self.metaData[key] === undefined
                        || self.metaData[key] === null) {
                    throw new lib.InternalError(
                            messages.MSG_EXPORT_ERROR_COLUMN_DOES_NOT_EXISITS,
                            key);
                }
                var condition = key + " IN ( " + values.map(
                    function(value) {
                        self.psmtValues.push({
                            name : key,
                            value : value
                        });

                        return " ? ";
                    }).join(",") + " ) ";

                return condition;
        }).join(" AND ");

    if (facetFilterConditions.length > 0) {
        facetFilterConditions = " ( " + facetFilterConditions + " ) ";
    }
    return facetFilterConditions;
};

exportService.buildColumnFilterCondition = function(params) {
    var self = this;
    var columnFilterConditions = " " +
        Object.keys(params.obj.COLUMN_FLITER).map(
            function(key) {
                var value = params.obj.COLUMN_FLITER[key];
                var filterValue = "%" + value.filterValue.toLowerCase() + "%";

                if ((value === undefined || value === null)
                        && (self.metaData[key] === undefined || self.metaData[key] === null)) {
                    throw new lib.InternalError(
                            messages.MSG_EXPORT_ERROR_COLUMN_DOES_NOT_EXISITS,
                            key);
                }
                self.psmtValues.push({
                    "name" : key,
                    "value" : filterValue
                });

                var condition = " lower(" + key + ") like ?";

                return condition;
            }).join(" AND");

    if (columnFilterConditions.length > 0) {
        columnFilterConditions = " ( " + columnFilterConditions + " ) ";
    }
    return columnFilterConditions;
};

exportService.getData = function(SQL, params) {
    var conn, result, items = [], row = [];
    params.obj.SELECTED_COLUMNS.map(function(key) {
        return row.push(key.name);
    });
    items.push(row);
    var batchSize = 50000;
    var offset = 0;
    var paginatedSQL = SQL;
    var self = this;

    var recordCount = this.getTotalCount(SQL);
    this.fetchedRecords = 0;

    try {
        conn = $.hdb.getConnection();
        var rowNumber = 0;
        while (true) {
            paginatedSQL = SQL + " LIMIT " + batchSize + " OFFSET " + offset;
            //ps = conn.prepareStatement(paginatedSQL);
            var paramArr = [];
            self.psmtValues.forEach(function(item, index) {
                paramArr.push(item.value);
                //self.setScalar(self.metaData[item.name], index + 1, item.value, ps);
            });
            result = conn.executeQuery(paginatedSQL);
            conn.commit();
            var metadata=result.metadata;
            result=result.getIterator();
            rowNumber = 0;
            while (result.next()) {
                row = [];
                var temp=result.value();
                params.obj.SELECTED_COLUMNS.forEach(function(key, index) {
                    var number = index;
                    var columnType = metadata.columns[number].typeName;
                    var column;
                    if (columnType === "TIMESTAMP") {
                        var date = temp[number];
                        if (date !== null){
                            column = utils.localUITime(date, timeOffset);
                        }else{
                            column = '';
                        }
                    } else {
                        column = temp[metadata.columns[number].name];
                    }
                    row.push(column);
                });

                items.push(row);
                rowNumber++;
            }
            //ps.close();
            this.buildCSV(items);
            this.fetchedRecords += rowNumber;
            items = [];
            offset = this.fetchedRecords;
            if (this.fetchedRecords >= recordCount) {
                break;
            }
        }
        conn.commit();
    } catch (e) {
        logger.error("EXPORT_DATA_GET_FAILED", JSON.stringify(params), e);
        throw new lib.InternalError(messages.MSG_EXPORT_ERROR_FETACH_DATA,
                this.fetchedRecords, e);
    } finally {
        conn.close();
    }
    return items;
};

exportService.getDataForSP = function(params) {
    var conn=$.hdb.getConnection();
    try {
        var viewDef = Metadata[params.obj.PAGE];
        var tableProc = conn.loadProcedure(constants.SCHEMA_NAME, viewDef.name);
        var spParams = viewDef.filters.map(function(filter) {
            return params.obj[filter.key];
        });
        var result = tableProc.apply(null, spParams);
        conn.commit();
        var resultArray = result[viewDef.output];
        var hiddenIndex = [];
        var header = params.obj.SELECTED_COLUMNS.map(
                function(key, index) {
                    var indexId = key.hidden !== undefined ? key.hidden.indexOf(params.obj.RESOURCE_CATEGORY_TYPE) : -1;
                    if ( indexId !== -1 ) {
                        hiddenIndex.push(index);
                    }
                    return key.name;
                }
            ).filter(
                function(val,indexId){
                    return hiddenIndex.indexOf(indexId) === -1;
                }
            );
        
        var dataToCSV = Object.keys(resultArray).map(function(item) {
            return params.obj.SELECTED_COLUMNS.map(function(colDef) {
                return resultArray[item][colDef.key];
            }).filter(function(val, indexId){
                return hiddenIndex.indexOf(indexId) === -1;
            });
        });
        this.buildCSV([ header ].concat(dataToCSV));
        logger.success("EXPORT_DATA_GOT_FOR_SP", JSON.stringify(params));
    } catch (e) {
        logger.error("EXPORT_DATA_GET_FOR_SP_FAILED", JSON.stringify(params), e);
    }
};

exportService.buildCSV = function(data) {
    try {
        var csv = CSV.createFromArray(data).toCSV(csvParser.LINE_SEPARATOR_WINDOWS); // Create CSV file
        this.csvContent.push(csv);

        logger.success("CSV_CREATED");
    } catch (e) {
        logger.error("CSV_CREATE_FAILED", e);

        throw new lib.InternalError(messages.MSG_EXPORT_ERROR_ATTACH_CSV_FILE, e);
    }
};
/**
 * Export cost model as zip file
 */
exportService.export = function(params) {
    timeOffset = params.obj.USER_TIMEZONE_OFFSET;
    var viewDef = Metadata[params.obj.PAGE];
    var zip = "";
    try {
        this.validateExportParams(params);
        switch (viewDef.type) {
        case "cv":
            var SQL = this.buildSQL(params);
            this.getData(SQL, params);
            break;
        case "sp":
            this.getDataForSP(params);
            break;
        default:
            throw new lib.InternalError(messages.MSG_EXPORT_ERROR_UNKNOWN_PAGE);
        }

        // zip = this.createZip();
        $.response.status = $.net.http.OK;
        $.response.contentType = "Text/plain";
        $.response.headers.set("Content-Disposition",
                "attachment; filename = \"export_result" + ".txt\"");
        $.response.setBody(this.csvContent.toString());
        // Prepare filter objects
        var filters = {};
        viewDef.filters.forEach(function(filter) {
            filters[filter.key] = params.obj[filter.key];
        });
        logger.success("DATA_EXPORTED", params.obj.PAGE, this.fetchedRecords,
                JSON.stringify(filters));
    } catch (e) {
        logger.error("DATA_EXPORT_FAILED", params.obj.PAGE,
                this.fetchedRecords, JSON.stringify(params.obj));
        throw e;
    }
};

exportService.createZip = function() {
    try {
        zipper.addFile("data.csv", this.csvContent
                .join(csvParser.LINE_SEPARATOR_WINDOWS));
        var result = zipper.createZip();
        logger.success("ZIP_CREATED");
        return result;
    } catch (e) {
        logger.error("ZIP_CREATE_FAILED", e);
        throw new lib.InternalError(messages.MSG_EXPORT_ERROR_ZIP_CREATION, e);
    }
};
exportService.validateExportParams = function(params) {
    var viewDef = Metadata[params.obj.PAGE];
    if (viewDef === null) {
        throw new lib.ValidationError(messages.MSG_EXPORT_ERROR_UNKNOWN_PAGE,
                params.obj.PAGE);
    }

    viewDef.filters.forEach(function(filter) {
        // Check for null
        var status = (params.obj[filter.key] !== null && params.obj[filter.key] !== undefined);
        if (!status) {
            throw new lib.ValidationError(
                    messages.MSG_EXPORT_ERROR_BLANK_PARAM, filter.key);
        }

        // For LOC_FILTER ID check the auth
        if (status && filter.key === "LOC_FILTER") {
        	// If user does not choose location filter, UI will send -1 as location_filter_id
        	if (params.obj[filter.key] !== -1) {
        		status = auth.authorizeReadByLocationFilterIdList([ {
                    "ID" : params.obj[filter.key]
                } ]);
        	}        
        }

        // For LOCATION_ID_LIST check the auth for each type/id list
        if (status && filter.key === "LOCATION_ID_LIST") {
            var locationIdList = params.obj[filter.key];
            var locationMap = {};
            locationIdList.forEach(function(loc) {
                if (!locationMap[loc.TYPE]) {
                    locationMap[loc.TYPE] = [];
                }
                locationMap[loc.TYPE].push({
                    ID : loc.ID
                });
            });

            Object.keys(locationMap).forEach(
                function(locType) {
                    status = auth.authorizeReadByLocationIdList(
                            locType, locationMap[locType]);
                }
            );
        }

        return status;
    });
};

exportService.unmarshall = function(body) {
    if (body && body.length > 0) {
        try {
            var params = body.split("&");
            var jsonData = "";
            params.some(function(item) {
                var keyVals = item.split("=");
                if (keyVals[0] === "VAL") {
                    jsonData = keyVals[1];
                }
                return keyVals[0] === "VAL";
            });
            body = decodeURIComponent(jsonData.replace(/\+/g, " "));
            this.params.obj = JSON.parse(body);
            this.params.contentType = "application/json";
            logger.success("EXPORT_UNMARSHALLED");
        } catch (e) {
            logger.error("EXPORT_UNMARSHALL_FAILED", e);
            throw new lib.BadRequestError(messages.MSG_EXPORT_ERROR_UNMARSHAL,
                    e);
        }
    }
};

exportService.setFilters({
    filter : function() {
        var priv = "sap.tm.trp.service::ExportToCSV";
        if (!$.session.hasAppPrivilege(priv)) {
            throw new lib.NotAuthorizedError(priv);
        }
        return true;
    },
    only : [ "export" ]
});

exportService.setRoutes([ {
    method : $.net.http.POST,
    scope : "collection",
    action : "export"
} ]);

try {
    exportService.handle();
} finally {
    logger.close();
}
