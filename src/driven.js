var forEachTest = (function () {
    'use strict';

    // This function synchronous loads JSON at the given URL.
    // Without it, we're unable to incorporate the JSON data into the tests.
    return function forEachTest(url, testFnc) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.onloadend = afterLoad;
        xhr.send();

        function afterLoad() {
            parseTests(0, testFnc, interpolate(xhr.responseText));
        }
    };

    // This function interpolates patterns within the JSON into Javascript objects.
    // Without it, we're unable to incorporate the certain types (RegExp, Date, etc.) into the tests.
    function interpolate(json) {
        var isISODate = /([^\\])" +(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d+([+-]\d\d:\d\d|Z)) +"/g;
        var isRegExp = /([^\\])" +\/(.+?)\/([gimuy]*) +"/g;

        JSON.parse(json);                                   // ensure JSON is valid
        json = json.replace(isISODate, '$1new Date("$2")'); // inject ISO-8601-formatted dates
        json = json.replace(isRegExp, '$1/$2/$3');          // inject regular expressions
        return Function('return ' + json)();                // convert string to object
    }

    // This function passes each test found within the JSON to jasmine.
    // without it, we're unable to get jasmine to run the tests.
    function parseTests(keyN, testFnc, tests) {
        var testId = Object.keys(tests)[keyN];

        switch (true) {
        case testId == null:
            return;

        case testId.slice(0, 2) === 'f:':
            fit(testId.slice(2), runTest);
            return parseTests(keyN + 1, testFnc, tests);

        case testId.slice(0, 2) === 'x:':
            xit(testId.slice(2), runTest);
            return parseTests(keyN + 1, testFnc, tests);

        default:
            it(testId, runTest);
            return parseTests(keyN + 1, testFnc, tests);
        }

        function runTest(done) {
            window.runStep = runStep;

            if (testFnc.length !== 0) {
                testFnc(done);
            }

            if (testFnc.length === 0) {
                testFnc();
                done();
            }
        }

        function runStep(stepId, stepFnc, prevN) {
            var startN = prevN || 0;
            var args = tests[testId][stepId];
            var endN = startN + stepFnc.length;

            switch (true) {
            case args == null:
                return;

            case endN <= args.length:
                stepFnc.apply(null, args.slice(startN, endN));
                return runStep(stepId, stepFnc, endN);
            }
        }
    }
}());