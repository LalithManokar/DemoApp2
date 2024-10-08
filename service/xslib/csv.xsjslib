//Florian Loch, D059349, florian.loch@sap.com
var utils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib");

//This CSV parser is compliant to RFC4180 (http://tools.ietf.org/html/rfc4180)
//It also can handle field that are partly escaped (also with multiple separately escaped parts)
//Escaping is be done using doublequotes
function CSVParser (separator, lineSeparator) {
    if (!separator) {
    	separator = ";";
    }
    if (!lineSeparator) {
    	lineSeparator = this.LINE_SEPARATOR_UNIX;
    }
    var content;
    var quoteChar = "\"";

    this.setCSVString = function (csvString_s) {
        content = csvString_s;
    };
    
    this.setSeparator = function (separator_s) {
        if (typeof separator_s !== "string" || separator_s.length < 1) {
        	throw new Error("Separator must be a string with at least a lenght of 1");
        }
        if (separator_s === lineSeparator) {
        	throw new Error("Separator and lineSeparator cannot be identical!");
        }
        if (lineSeparator.indexOf(separator_s) === 0) {
        	throw new Error("Separator cannot be the same as the start of lineSeparator");
        }
        separator = separator_s;
    };
    
    this.setLineSeparator = function (lineSeparator_s) {
        if (typeof lineSeparator_s !== "string" || lineSeparator_s.length < 1) {
        	throw new Error("LineSeparator must be a string with at least a lenght of 1");
        }
        if (separator === lineSeparator_s) {
        	throw new Error("Separator and lineSeparator cannot be identical!");
        }
        
        lineSeparator = lineSeparator_s;
                
        this.setSeparator(separator); //This is done to have the check for same start
    };
    
    this.guessLineSeparator = function () {
        if (content === undefined) {
        	throw new Error("setCSVString() has to be called first");
        }
        
        //Check which line separator occurs most often
        var occurences = [{
            ls: "\n",
            occurence: countOccurence(content, "\n") - countOccurence(content, "\r\n")
        }, {
            ls: "\r\n",
            occurence: countOccurence(content, "\r\n")
        }, {
            ls: "\r",
            occurence: countOccurence(content, "\r") - countOccurence(content, "\r\n")
        }];
        
        var indxMax = 0;
        occurences.forEach(function (item, indx) {
            if (item.occurence > occurences[indxMax].occurence) {
            	indxMax = indx;
            }
        });
        
        this.setLineSeparator(occurences[indxMax].ls);
        return occurences[indxMax].ls;
    };
    
    this.parse = function (csvString_s) {
        function _parse(string, fieldSeparator, lineSeparator) {
            function match (haystack, needle, offset) {
                for (var j = 0; j <= haystack.length - offset - 1 && j < needle.length; j++) {
                    if (haystack.charAt(offset + j) === needle.charAt(j)) {
                        continue;
                    }
                    return false;
                } 
                return true;
            }
    
            var lines = [];
            var line = [];
            var block = "";
            
            var quoted = false;
            var lastCharWasQuote = false;
            
            for (var i = 0; i < string.length; i++) {
                //Quoted mode - characters have no special meaning (except the quote-char)
                if (string.charAt(i) === quoteChar) {
                    //If the next (actually the current) char is also a quote char then we do not enter quoted-mode
                    if (lastCharWasQuote) {
                        quoted = !quoted; //Flip back because last quote char was just for escaping this quote char
                        lastCharWasQuote = false;
                        block = block + quoteChar;
                        continue;
                    }
                    
                    quoted = !quoted;
                    lastCharWasQuote = true;
                    continue;
                }
                
                lastCharWasQuote = false;
    
                if (quoted) {
                    block = block + string.charAt(i);
                    continue;
                }
    
                //This part is only reached when we are not in quoted mode
                if (match(string, fieldSeparator, i)) {
                    line.push(block);
                    block = "";
                    i = i + fieldSeparator.length - 1;
                    continue;
                }
                
                if (match(string, lineSeparator, i)) {
                    //Ignore empty rows
                    if (block === "" && line.length === 0) {
                        i = i + lineSeparator.length - 1;
                        continue;
                    }
                    
                    line.push(block);
                    block = "";
                    lines.push(line);
                    line = [];
                    i = i + lineSeparator.length - 1;
                    continue;
                }
    
                block = block + string.charAt(i);
            }       
            //Ignore empty rows
            if (block !== "" || line.length !== 0) {
                line.push(block);
                lines.push(line);
            }            
            
            return lines;
        }        
        
        if (csvString_s) {
        	content = csvString_s;
        }
        if (content === undefined) {
        	throw new Error("setCSVString() has to be called first or parse() has to be invoked with a string");
        }
        
        var res = {};
        res.header = [];
        res.content = [];
        
        lineSeparator = this.guessLineSeparator();
        var parsed = _parse(content, separator, lineSeparator);
        
        res.header = parsed[0];
        res.content = (parsed.length > 1) ? parsed.slice(1) : undefined;
        
        return new CSV(res.header, res.content);
    };
    
    function countOccurence(haystack_s, needle_s) {
        return haystack_s.split(needle_s).length - 1;
    }
}

CSVParser.prototype.LINE_SEPARATOR_UNIX = "\n";
CSVParser.prototype.LINE_SEPARATOR_WINDOWS = "\r\n";
CSVParser.prototype.LINE_SEPARATOR_MAC_OLD = "\r";

function CSV (header_ar, content_ar) {
    this.header = header_ar;
    this.content = content_ar;
    var validateFunctions = [];
    var expectedColumnCount;
    var iteratorIndex = -1;
    var minimumEntries = 0;
    
    //A validate function is expected to return an object containing the keys "valid(boolean)", "reason(string)" (Column and row get automatically added by framework)
    //In case of successfull validation only the first one need to be returned (it is also possible to return just the plain "true")
    //When called it is given the "column index", the "row of the csv" as string and the "row index". "This" is set to the CSV object
    this.addValidationFunctionForColumn = function (columnIndex_i, validateFunction_fn) {
        if (columnIndex_i < 0) {
        	throw new Error("Cannot set validation function for column with an index below 0");
        }
        
        if (validateFunctions[columnIndex_i] === undefined) {
        	validateFunctions[columnIndex_i] = [];
        }
        validateFunctions[columnIndex_i].push(validateFunction_fn);
    };
    
    this.setExpectedMinimumEntries = function (count_i) {
        if (isNaN(parseInt(count_i, 10))) throw new Error(count_i + " is not a valid integer!");
        
        minimumEntries = count_i;  
    };
    
    this.setExpectedColumnCount = function (count_i) {
        if (count_i < 1) throw new Error("Cannot set an expected column count below 1");
        
        expectedColumnCount = count_i;
    };
    
    this.isValid = function (validateFunction, columnOffset, rowOffset) {
        columnOffset = columnOffset || 1; //Not everybody counts like programmers do
        rowOffset = rowOffset || 2; //Same as above +1 for the header
        
        var errors = [];
        
        if (expectedColumnCount !== undefined && !this.checkColumnCount(expectedColumnCount)) errors.push({
            "reason": "Column count varies or does not match the expected count of " + expectedColumnCount,
            "column": -1,
            "row": -1
        });
    
        if (this.content.length < minimumEntries) errors.push({
            "reason": "Amount of entries (" + this.content.length + ") does not meet the required minimum of "+ minimumEntries,
            "column": -1,
            "row": -1
        });    
        
        var fieldCount = this.content[0].length;
        var content = this.content;
        var res = validateFunction.call(this, i, content);
        if (!(res === true || res.valid === true)) {
			var valid_items = res.VALID_ITEMS;
			var item_length = valid_items.length;
			for(var k = 0; k < item_length; k++) {
				var obj = {};
				//obj.reason = res.reason;
				obj.reason = valid_items[k].REASON;
				obj.column = valid_items[k].COL_INDEX + columnOffset;
				obj.row = valid_items[k].ROW_INDEX + rowOffset;
                errors.push(obj);
			}
        }
        
        return (errors.length > 0) ? errors : true;
    };
    
    this.getNextRow = function () {
        if (iteratorIndex + 1 < this.content.length) {
            iteratorIndex++;
            return this.content[iteratorIndex];
        }
        return null;
    };
}

CSV.prototype.forEachRow = function (handler_fn) {
    this.content.forEach(handler_fn);  
};

CSV.prototype.mapRows = function (handler_fn) {
    return this.content.map(handler_fn);  
};

CSV.prototype.checkColumnCount = function (expectedColumnCount_i) {
    return (this.header.length == expectedColumnCount_i && this.isColumnCountCoherent());  
};

//Schema containing a validation object per column. This contains a REGEX, minLength and maxLength. Via regexDesc a description of the regex can be given so this will be inserted into the error message instead of the plain regex
//A function checking this regex will be generated and added to validationFunctions
CSV.prototype.addValidationSchema = function (schema_ar) {
    schema_ar.forEach(function (item, i) {
        if (item.hasOwnProperty("minLength")) {
            this.addValidationFunctionForColumn(i, function (colIndx, row, rowIndx) {
                if (row[colIndx].length >= item.minLength) {
                    return true;
                }
                return {
                    "valid": false,
                    "reason": "Value '" + row[colIndx] + "' doesn't meet the minimum length (" + item.minLength + " characters)"
                };
            });
        }
        
        if (item.hasOwnProperty("maxLength")) {
            this.addValidationFunctionForColumn(i, function (colIndx, row, rowIndx) {
                if (row[colIndx].length <= item.maxLength) {
                    return true;
                }
                return {
                    "valid": false,
                    "reason": "Value '" + row[colIndx] + "' doesn't meet the maximum length constraint (" + item.maxLength + " characters)"
                };
            });
        }        
        
        if (item.hasOwnProperty("regex")) {
            this.addValidationFunctionForColumn(i, function (colIndx, row, rowIndx) {
                if (row[colIndx].search(item.regex) !== -1) {
                    return true;
                }
                return {
                    "valid": false,
                    "reason": "Value '" + row[colIndx] + "' doesn't match the pattern " + (item.regexDesc || item.regex)
                };
            });
        }
    }, this);
};

CSV.prototype.isColumnCountCoherent = function () {
    //Check if all rows have the same amount of columns
    var length = this.header.length;
    
    for (var i = 0; i < this.content.length; i++) {
        if (this.content[i].length != length) return false;
    }
    
    return true;
};

CSV.prototype.getAssociativeObject = function () {
    if (!this.isColumnCountCoherent()) throw new Error("Cannot create associative array out on an invalid CSV file");
    
    var assoc = [];
    
    this.content.forEach(function (line) {
        var assocLine = {};
        
        line.forEach(function (item, indx) {
            assocLine[this.header[indx]] = item;
        }, this);
        
        assoc.push(assocLine);
    }, this);
    
    return assoc;
};

//[headerArray,entryAsArray,entry2AsArray]
CSV.prototype.createFromArray = function (data_ar) {
    if (data_ar.length < 1) {
        throw new Error("Array does not contain header");
        return undefined;
    }
    if (data_ar.length === 1) return new CSV(data_ar[0], []);
    
    return new CSV(data_ar[0], data_ar.slice(1));
};

//assoc_ar: [{name: "Flo", age: 21}, {name: "Jan", age: 20}]
//order_ar: ["name", "age"]
//delete_header_flag : true or false or no input
CSV.prototype.createFromAssociativeObjects = function (assoc_ar, order_ar, delete_header_flag) {
    var t = [];
    if (arguments.length === 2 || (arguments.length === 3 && delete_header_flag === false)){
        t.push(order_ar);
    }
    
    for (var i = 0; i < assoc_ar.length; i++) {
        var line = [];
        for (var j = 0; j < order_ar.length; j++) {
            line.push(assoc_ar[i][order_ar[j]]);
        }
        t.push(line);
    }
    
    return this.createFromArray(t);
};

CSV.prototype.toCSV = function (lineSeparator_s, separator_c) {
    return [this.header].concat(this.content).map(function (row) {
        return row.map(function(val){
            return val !== null ? val : "NULL";
        }).join(separator_c);
    }).join(lineSeparator_s);
};

//Predefined types for matchers
CSV.prototype.TYPES = {
    INT: /^(0|([1-9]\d*))$/,
    DECIMAL : /^(([0-9]{0,10}\.[0-9]{1,3})|([0-9]{1,10}\.[0-9]{0,3})|(0|([1-9]\d{0,9})))$/,
    FLOAT: /^(([0-9]+\.[0-9]*)|([0-9]*\.[0-9]+)|(0|([1-9]\d*)))$/, //Matches float AND int
    STRING: /^(\s|\S)*$/ //Also matches linebreaks, I admit a string regex doesn't make much sense neither
};
