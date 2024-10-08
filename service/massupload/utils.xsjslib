// check some column in the csv whether it is a number
var NotNumberCheck = function(int) {
    var re = /^\d+$/;
    return !re.test(int);
};

var NotValidNameCheck = function(value) {
	value = value.trim();
	// characters
	var re = /^[A-Z][A-Z0-9_]{0,19}$/;
	return !re.test(value);
};

// Get the number of days in any particular month
var daysInMonth = function (m, y) {
    switch (m) {
        case 1 :
            return (y % 4 == 0 && y % 100) || y % 400 == 0 ? 29 : 28;
        case 8 : case 3 : case 5 : case 10 :
            return 30;
        default :
            return 31
    }
};

// Check if a date is valid
var isValidDate = function (d, m, y) {
    m = parseInt(m, 10) - 1;
    d = parseInt(d, 10);
    y = parseInt(y, 10);
    return m >= 0 && m < 12 && d > 0 && d <= daysInMonth(m, y);
};

var NotDatetimeCheck = function(content) {
	var re = /^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(.[0-9]+)?(Z)?$/;
	if(!re.test(content)) {
		return true;
	} else {
		var y,m,d;
		y = content.substring(0,4);
		m = content.substring(5,7);
		d = content.substring(8,10);
		return !isValidDate(d, m, y);
	}
};

var CompareDatetime = function(dtStr1, dtStr2) {
	var dt1 = new Date(dtStr1);
	var dt2 = new Date(dtStr2);
	// Difference between d2 and d1 in milliseconds
	var msDiff = dt1 - dt2;
	
	if(msDiff > 0) {
		return 1;
	} else if(msDiff == 0) {
		return 0;
	} else {
		return 2;
	}
};

var NotValidTimeCheck = function(content) {
	var re = /^(2[0-3]|[01][0-9]|[0-9]):([0-5][0-9]):([0-5][0-9])?$/;
	return !re.test(content);
};

var NotValidHourMinCheck = function(content) {
	var re = /^(2[0-3]|[01][0-9]|[0-9]):([0-5][0-9])?$/;
	return !re.test(content);
};

// check some column in the csv whether it is Decimal(13,3)
var NotDecimalCheck = function(int) {
    var re = /^\d{1,9}\.?\d{0,3}$/;
    return !re.test(int);
};

//check if the given recurrence value is valid
var NotValidRecurrenceCheck = function(recurrence) {
    var upperCased = recurrence.toUpperCase();
	return !(upperCased === 'MINUTE' || upperCased === 'HOUR' || upperCased === 'DAY' || upperCased === 'WEEK' || upperCased === 'MONTH');
};

var NotValidKeepExecRunsCheck = function(keepExecRuns){
	
	if (keepExecRuns !=='' && keepExecRuns !== null){
	  return NotNumberCheck(keepExecRuns) || (keepExecRuns < 1 || keepExecRuns > 99999999);
	}
};

//check if the given visibility value is valid
var NotValidVisibilityCheck = function(visibility) {
    var upperCased = visibility.toUpperCase();
	return !(upperCased === 'GLOBAL' || upperCased === 'PERSONAL');
};

// check time to be HH:MM:SS OR HH:MM:SS AM/PM/am/pm
var formatTimeCheck = function(str) {
    var re = /^(?:[01]\d|2[0-3])(?::[0-5]\d){2}(\s|\S)*(AM|PM|am|pm)?$/;
    var result = re.test(str);
    return !result;
};

//Number Check for safety stocks
var isNumber = function(value){
    var result = false;
    
    if (value > 0) 
    {
    // must be integer
      if (value % 1 === 0) 
      {
        result = true;
      }
    }
return result;
};
