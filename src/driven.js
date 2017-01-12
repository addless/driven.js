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

    // This function passes each test found within the JSON to Jasmine.
    // without it, we're unable to register tests with Jasmine.
    function parseTests(keyN, testFnc, tests) {
        var testId = Object.keys(tests)[keyN];
        var stepIds = Object.keys(tests[testId] || {});
        var stepFns = stepIds.map(function () { return null });

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

        // This function is called by Jasmine.  It executes the test function with the appropriate global/local variables.
        // Without it, Jasmine can't invoke the test function. 
        function runTest(jasmineDoneFnc) {
            window.runStep = defineStep;
            testFnc(endTest.bind(null, jasmineDoneFnc));
            if (!testFnc.length) endTest(jasmineDoneFnc);
        }

        // This function inserts a step definition at the appropriate place within the queue.
        // Without it, we're unable to queue step definitions in the appropriate order.
        function defineStep(stepId, stepFnc) {
            var fncN = stepIds.indexOf(stepId);
            var gapN = stepFns.indexOf(null);

            stepFns[fncN] = stepFnc;
            if (fncN === -1) return;
            if (fncN >= gapN) runSteps(fncN, 0);
        }

        // This function executes all defined steps.
        // Without it we're unable to execute steps in the appropriate order, and with appropriate arguments.
        function runSteps(fncN, argN) {
            var fnc = stepFns[fncN];
            var stepId = stepIds[fncN];
            var args = tests[testId][stepId];

            switch (true) {
            case fnc == null:
            case args == null:
                return;

            case fnc.length === 0:
                return fnc();

            case argN + fnc.length <= args.length:
                fnc.apply(null, args.slice(argN, argN + fnc.length));
                return runSteps(fncN, argN + fnc.length);

            case stepIds[fncN + 1] != null:
                return runSteps(fncN + 1, 0);
            }
        }

        // This function verifies that all steps have been defined before calling Jasmine's "done" callback.
        // Without it, we risk tests "passing" without every step being run.
        function endTest(jasmineDoneFnc) {
            var gapN = stepFns.indexOf(null);
            if (gapN === -1) return jasmineDoneFnc();
            throw Error('Undefined step: "' + stepIds[gapN] + '"');
        }
    }
}());