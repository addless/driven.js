var forEachTest = (function () {
    'use strict';

    // This function synchronous loads JSON at the given URL.
    // Without it, we're unable to incorporate the JSON data into the tests.
    return function forEachTest(url, testFunc) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.onloadend = afterLoad;
        xhr.send();

        function afterLoad() {
            parseTests(0, testFunc, interpolate(xhr.responseText));
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
    function parseTests(keyN, testFunc, tests) {
        var testId = Object.keys(tests)[keyN];

        switch (true) {
        case testId == null:
            return;

        case testId.slice(0, 2) === 'f:':
            fit(testId.slice(2), runTest);
            return parseTests(keyN + 1, testFunc, tests);

        case testId.slice(0, 2) === 'x:':
            xit(testId.slice(2), runTest);
            return parseTests(keyN + 1, testFunc, tests);

        default:
            it(testId, runTest);
            return parseTests(keyN + 1, testFunc, tests);
        }

        // This function is called by Jasmine.  It executes the test function with the appropriate global/local variables.
        // Without it, Jasmine can't invoke the test function. 
        function runTest(jasmineDoneFunc) {
            var stepAsync = [];
            var stepArity = [];
            var stepIds = Object.keys(tests[testId]);
            var stepFuncs = stepIds.map(function () { return null });

            window.endAsyncStep = throwAsyncError;
            window.runAsyncStep = defineStep.bind(null, true);
            window.runStep = defineStep.bind(null, false);
            testFunc();
            runSteps(0, 0);

            // This function inserts a step definition at the appropriate place within the queue.
            // Without it, we're unable to queue step definitions in the appropriate order.
            function defineStep(async, stepId, stepFunc) {
                var n = stepIds.indexOf(stepId);
                stepArity[n] = stepFunc.length;
                stepFuncs[n] = stepFunc;
                stepAsync[n] = async;
            }

            // This function recursively executes all defined steps.
            // Without it we're unable to execute steps in the appropriate order, and with appropriate arguments.
            function runSteps(stepN, startN) {
                var args = tests[testId][stepIds[stepN]];
                var endN = startN + stepArity[stepN];

                window.endAsyncStep = throwAsyncError;

                switch (true) {
                default:
                    return;

                case stepFuncs[stepN] == null:
                    throw Error('Missing step definition: "' + stepIds[stepN] + '"');

                case endN <= args.length:
                    break;

                case stepFuncs[stepN + 1] != null:
                    return runSteps(stepN + 1, 0);

                case stepN + 1 === stepFuncs.length:
                    return jasmineDoneFunc();
                }

                switch (true) {
                case stepAsync[stepN] !== true:
                    stepFuncs[stepN].apply(null, args.slice(startN, endN));
                    return runSteps(stepN, endN || 1);

                case stepAsync[stepN] === true:
                    window.endAsyncStep = runSteps.bind(null, stepN, endN || 1);
                    stepFuncs[stepN].apply(null, args.slice(startN, endN));
                }
            }

            // This indicates that endAsyncStep() was called from outside of an asynchronous step by throwing an error.
            // Without it, we risk having steps silently behave in unexpected ways when endAsyncStep() is called incorrectly.
            function throwAsyncError() {
                throw Error('endAsyncStep() should only be call from within an asynchronous step');
            }
        }
    }
}());