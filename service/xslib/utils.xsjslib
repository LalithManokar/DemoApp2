function isNumeric(obj) {
    return !isNaN(parseFloat(obj)) && isFinite(obj);
}

function uppercase(str) {
    if (str === undefined || str === null) {
        return "";
    } else {
        return String.prototype.toUpperCase.call(str);
    }
}

var nativeTrim = String.prototype.trim;
var nativeTrimRight = String.prototype.trimRight;
var nativeTrimLeft = String.prototype.trimLeft;

var trim = function(str) {
    if (str === null) {
        return '';
    }

    return nativeTrim.call(str);
};

var isEmpty = function(str) {
    return str === undefined || trim(str).length === 0;
};

var checkNull = function(value){
	return value===undefined?null:value;
};

var capitalize = function(str) {
    if (str === null) {
        str = "";
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
};

var titleize = function(str) {
    if (str === null) {
        return "";
    }
    str = String(str).toLowerCase();
    return str.replace(/(?:^|\s|-)\S/g, function(c) {
        return c.toUpperCase();
    });
};

var surround = function(str, wrapper) {
    return [wrapper, str, wrapper].join("");
};

var quote = function(str, quoteChar) {
    return surround(str, quoteChar || '"');
};

var unquote = function(str, quoteChar) {
    if (str === null) {
        return "";
    }
    quoteChar = quoteChar || '"';
    if (str[0] === quoteChar && str[str.length - 1] === quoteChar) {
        return str.slice(1, str.length - 1);
    } else {
        return str;
    }
};

// date.getTimezoneOffset() in minutes
// UTC+08 => -8 * 60 = -480

// write to db: local date object => utc timestamp
function localToUTC(localDate) {
    var timezoneOffset = localDate.getTimezoneOffset() * 60 * 1000;
    var utcDate = new Date(localDate.getTime() + timezoneOffset);
    return utcDate;
}


//TO_TIMESTAMP(?, 'YYYY-MM-DD HH24:MI:SS')
function localToUtcByHana(localTime,timezone) {
    var conn, rs, result, utcTimestamp, sql;

    var dateFormat = function(fmt, date) {
        let ret;
        const opt = {
            "M+": (date.getMonth() + 1).toString(),
            "d+": date.getDate().toString(),
            "H+": date.getHours().toString(),
            "m+": date.getMinutes().toString(),
            "s+": date.getSeconds().toString()
        };

        if (/(y+)/.test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
        }
        for (var k in opt){
            ret = new RegExp("(" + k + ")").exec(fmt);
            if (ret) {
                fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (opt[k]) : (("00" + opt[k]).substr(("" + opt[k]).length)));
            }
        }

        return fmt;
    };

    try {
        conn = $.hdb.getConnection();
        sql= "select LOCALTOUTC(?, ?,'platform') UTC_TIMESTAMP FROM DUMMY";
        rs = conn.executeQuery(sql,localTime,timezone);
        if(rs.length>0){
            utcTimestamp = rs[0].UTC_TIMESTAMP;
            utcTimestamp = new Date(dateFormat('yyyy-MM-ddTHH:mm:ss',utcTimestamp)+'.000Z'); //Make up the 1 hour gap
        }
    } catch (e) {
        throw new Error("Unable to convert time to local by hana", e);
    } finally {
        conn.close();
    }
    return utcTimestamp;
}

// read from db: utc timestamp => local date object
function utcToLocal(utcDate) {
    var timezoneOffset = utcDate.getTimezoneOffset() * 60 * 1000;
    var localDate = new Date(utcDate.getTime() - timezoneOffset);
    return localDate;
}

//TO_TIMESTAMP(?, 'YYYY-MM-DDTHH24:MI:SS')
function utcToLocalByHana(utcTime,timezone) {
    var conn, rs, result, localTimestamp, sql;
    try {
        conn = $.hdb.getConnection();
        sql= "select UTCTOLOCAL(?, ?,'platform') LOCAL_TIMESTAMP FROM DUMMY";
        rs = conn.executeQuery(sql,utcTime,timezone);
        if(rs.length>0){
            localTimestamp = rs[0].LOCAL_TIMESTAMP;
        }
    } catch (e) {
        throw new Error("Unable to convert time to local by hana", e);
    } finally {
        conn.close();
    }
    return localTimestamp;
}

// get the corresponding UI time
function localUITime(date, timeOffset) {
    var mapZero = function(time) {
        var timeInt = parseInt(time, 10);
        if (timeInt < 10) {
            timeInt = '0' + timeInt;
        }
        return timeInt;
    };
    var localFormat = new Date(date.getTime() - timeOffset*60*1000);
    // format like 2016-01-30 23:23:23
    var UITime = localFormat.getFullYear() + '-' + mapZero(localFormat.getMonth() + 1) + '-' + mapZero(localFormat.getDate())
    +' ' + mapZero(localFormat.getHours()) + ':' + mapZero(localFormat.getMinutes()) + ':' + mapZero(localFormat.getSeconds());
    return UITime;
}

function buildErrorResponse(response, defaultMessage) {
    var messages = [];
    if (response.body) {
        var err = JSON.parse(response.body.asString());
        if (err.hasOwnProperty("MESSAGES")) {
            var dict = {};
            err.MESSAGES.forEach(function(item, index, array) {
                if (dict.hasOwnProperty(item.MESSAGE)) {
                    dict[item.MESSAGE].push(item.ARGS);
                } else {
                    dict[item.MESSAGE] = [item.ARGS];
                }
            });

            for (var m in dict) {
                if (dict.hasOwnProperty(m)) {
                    messages.push({
                        message: m,
                        args: dict[m]
                    });
                }
            }
        } else {
            messages.push(defaultMessage);
        }
    } else {
        messages.push(defaultMessage);
    }

    return messages;
}

function parseTime(str) {
    return new Date(Date.parse(str));
}

var facetFilterUtils = {
    createUniqueFilterFunction: function(){
        var foundKeyList = [];
        return function(item){
            if (foundKeyList.indexOf(item.key) === -1){
                foundKeyList.push(item.key);
                return true;
            }
            else {
                return false;
            }
        }
    },
    sortFilterItem_NumericKey: function(a, b){
        //in order to put null value at the end of the list
        var aVal = (a.key === null ? Infinity : a.key);
        var bVal = (b.key === null ? Infinity : b.key);
        return aVal - bVal;
    },
    sortFilterItem_StringKey: function(a, b){
        //in order to put null value at the end of the list
        return (a.key || '~~~').localeCompare(b.key);
    },
    checkFilterObj: function(filterObj, fieldList){
        if (!(filterObj instanceof Object)){
            return false;
        }
        var checkResult = true;
        for (var i in fieldList){
            var fieldName = fieldList[i];
            if (filterObj.hasOwnProperty(fieldName) && !(filterObj[fieldName] instanceof Array)){
                checkResult = false;
                break;
            }
        }
        return checkResult;
    },
    generateServiceReturnObj: function(procReturnObj, outputInfoList){
        var serviceReturnObj = {};
        var obj = {};
        outputInfoList.forEach(function(outputInfo){
        	obj = procReturnObj[outputInfo.varName];
            serviceReturnObj[outputInfo.field] = 
            	//procReturnObj[outputInfo.varName].map(function(row)
            	Object.keys(obj).map(function(row)
            	{
                return {
                    key: obj[row].KEY,
                    text: obj[row].TEXT
                };
            });
        });
        return serviceReturnObj;
    }
};

var checkNonNegativeInteger = function(val) {
    return Number(val) === val && val % 1 === 0 && val >= 0;
};

var checkPositiveInteger = function(val) {
    return Number(val) === val && val % 1 === 0 && val > 0;
};

var tableStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var table = tableStr.split("");

function btoa (bin) {
    for (var i = 0, j = 0, len = bin.length / 3, base64 = []; i < len; ++i) {
      var a = bin.charCodeAt(j++), b = bin.charCodeAt(j++), c = bin.charCodeAt(j++);
      if ((a | b | c) > 255) throw new Error("String contains an invalid character");
      base64[base64.length] = table[a >> 2] + table[((a << 4) & 63) | (b >> 4)] +
                              (isNaN(b) ? "=" : table[((b << 2) & 63) | (c >> 6)]) +
                              (isNaN(b + c) ? "=" : table[c & 63]);
    }
    return base64.join("");
  }

function hexToBase64(str) {
  return btoa(String.fromCharCode.apply(null,
    str.replace(/\r|\n/g, "").replace(/([\da-fA-F]{2}) ?/g, "0x$1 ").replace(/ +$/, "").split(" "))
  );
}

var HUMAN_READABLE_KEY_REGEX = /^[A-Z][A-Z_0-9]{0,19}$/;

function handleConcurrentLockException(e) {
    var handlers = {
        146: new ($.import('/sap/tm/trp/service/xslib/railxs.xsjslib')).InternalError("MSG_ERROR_LOCKED", e)
    };

    return (e.message.startsWith("dberror")) && handlers.hasOwnProperty(e.code) ?
            handlers[e.code] : e;
}

function objectToArray(obj, seperator) {
    seperator = seperator || "|";
    var result = [];

    var nextValue = function(o, stack) {
        Object.keys(o).forEach(function(key) {
            stack.push(key);

            if (Object.prototype.toString.call(o[key]) !== "[object Object]") { // recurrsive terminate
                result.push({key: stack.join(seperator), value: o[key]});
            } else {
                nextValue(o[key], stack);
            }

            stack.pop();

        });
    };

    nextValue(obj, []);
    return result;
}

function arrayToObject(array, seperator) {
    seperator = seperator || "|";
    var obj = {}; // store the JSON Data

    function compose(stack, current, value) {
        var key = stack.shift();
        if (current.hasOwnProperty(key)) {
            compose(stack, current[key], value);
        } else {
            if (stack.length === 0) {
                current[key] = value;
            } else {
                current[key] = {};
                compose(stack, current[key], value);
            }
        }
    }

    array.forEach(function(item) {
        compose(item.key.split(seperator), obj, item.value);
    });

    return obj;
}

function sampleArray(array, offset) {
    if (!offset) {
        return array;
    }

    return array.filter(function(item, index, array) {
        return index % offset === 0 || index === array.length - 1;
    });
}



function checkSimulationPlanLock(planId) {
    var Procedure = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib").Procedure;
    var InternalError =$.import('/sap/tm/trp/service/xslib/railxs.xsjslib').InternalError;
    var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");

    var simulationLockProc = new Procedure(
        "SAP_TM_TRP",
        "sap.tm.trp.db.planningcockpit::p_ext_check_simulation_plan_lock_by_id");
    var simulationLockResult = simulationLockProc(planId);
    //{"MESSAGE":"MSG_SIMULATION_PLAN_LOCK_EXPIRED","USER_ID":"1","__VAR_OUT_1__":[]}
    var resultMessage = simulationLockResult.MESSAGE;

    if (resultMessage !== 'MSG_SIMULATION_PLAN_LOCK_SUCCESS') {
        throw new InternalError(messages[resultMessage], {
            SIMULATION_PLAN_ID: planId,
            USER_ID: simulationLockResult.USER_ID
        });
    }

}

function isContainer(sResoruceCategoryType) {
    var constants = $.import("sap.tm.trp.service.xslib","constants");
    return sResoruceCategoryType === constants.RESOURCE_CATEGORY_TYPE.CONTAINER;
}
