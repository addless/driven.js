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

    // This function passes each test found within the JSON to the test framework.
    // without it, we're unable to register tests with the test framework.
    function parseTests(keyN, testFunc, tests) {
        var testId = Object.keys(tests)[keyN];

        switch (true) {
            case testId == null:
                return;

            default:
                describe(testId, runTest);
                return parseTests(keyN + 1, testFunc, tests);

            case 'f:' === testId.slice(0, 2):
            case 'x:' === testId.slice(0, 2):
                window[testId.slice(0, 1) + 'describe'](testId.slice(2), runTest);
                return parseTests(keyN + 1, testFunc, tests);
        }

        // This function is called by the test framework.  It executes the test function with the appropriate global/local variables.
        // Without it, the test framework can't invoke the test function.
        function runTest() {
            var count = 0;
            var nullN = 0;
            var stepAsync = [];
            var stepArity = [];
            var stepIds = Object.keys(tests[testId]);
            var stepFuncs = stepIds.map(function () { return null });

            window.runAsyncStep = defineStep.bind(null, true);
            window.runStep = defineStep.bind(null, false);
            window.endAsyncStep = throwAsyncError;
            testFunc();

            if ((nullN = stepFuncs.indexOf(null)) !== -1) {
                throw Error('Missing step definition: "' + stepIds[nullN] + '"');
            }

            // This indicates that endAsyncStep() was called from outside of an asynchronous step by throwing an error.
            // Without it, we risk having steps silently behave in unexpected ways when endAsyncStep() is called incorrectly.
            function throwAsyncError() {
                throw Error('endAsyncStep() should only be call from within an asynchronous step');
            }

            // This function inserts a step definition at the appropriate place within the queue.
            // Without it, we're unable to queue step definitions in the appropriate order.
            function defineStep(isAsync, stepId, stepFunc) {
                var stepN = stepIds.indexOf(stepId);
                stepArity[stepN] = stepFunc.length;
                stepFuncs[stepN] = stepFunc;
                stepAsync[stepN] = isAsync;

                switch (true) {
                    case stepN === -1:
                        return;

                    default:
                        return it('[' + stepIds[count] + ']', runStep.bind(null, count++, 0));

                    case stepIds[count].slice(0, 2) === 'f:':
                        return fit('[' + stepIds[count].slice(2) + ']', runStep.bind(null, count++, 0));

                    case stepIds[count].slice(0, 2) === 'x:':
                        return xit('[' + stepIds[count].slice(2) + ']', runStep.bind(null, count++, 0));
                }
            }

            // This function is called by the test framework.  It executes the step with the appropriate global-variables/arguments.
            // Without it, the test framework can't invoke the step.
            function runStep(stepN, startN, the test frameworkDoneFunc) {
                var args = tests[testId][stepIds[stepN]];
                var endN = startN + stepArity[stepN];

                window.endAsyncStep = throwAsyncError;

                switch (true) {
                    case endN > args.length:
                        return the test frameworkDoneFunc();

                    case stepAsync[stepN] !== true:
                        stepFuncs[stepN].apply(null, args.slice(startN, endN));
                        return runStep(stepN, endN || 1, the test frameworkDoneFunc);

                    case stepAsync[stepN] === true:
                        window.endAsyncStep = runStep.bind(null, stepN, endN || 1, the test frameworkDoneFunc);
                        stepFuncs[stepN].apply(null, args.slice(startN, endN));
                }
            }
        }
    }
}());