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
    // Without it, we're unable to register tests with Jasmine.
    function parseTests(keyN, testRunnerFunc, tests) {
        var testDesc = Object.keys(tests)[keyN];

        switch (true) {
        case testDesc == null:
            return;

        default:
            window.describe(testDesc, runTest);
            return parseTests(keyN + 1, testRunnerFunc, tests);

        case 'f:' === testDesc.slice(0, 2):
        case 'x:' === testDesc.slice(0, 2):
            window[testDesc[0] + 'describe'](testDesc.slice(2), runTest);
            return parseTests(keyN + 1, testRunnerFunc, tests);
        }

        // This function is called by Jasmine.  It executes the test function with the appropriate global/local variables.
        // Without it, Jasmine can't invoke the test function. 
        function runTest() {
            var stepParam = [];
            var stepAsync = [];
            var stepArity = [];
            var stepFlags = [];
            var stepFuncs = [];
            var stepDescs = Object.keys(tests[testDesc]);

            window.runAsyncStep = defineStep.bind(null, true);
            window.runStep = defineStep.bind(null, false);
            window.endAsyncStep = throwAsyncError;
            stepDescs.forEach(populateTables);
            testRunnerFunc();
            queueSteps(0);

            // This function indicates that endAsyncStep() was called from outside of an asynchronous step by throwing an error.
            // Without it, we risk having steps silently behave in unexpected ways when endAsyncStep() is called incorrectly.
            function throwAsyncError() {
                throw Error('endAsyncStep() should only be called from within an asynchronous step');
            }

            function populateTables(stepId, stepN) {
                var match = /^(f|x|):?(.+)$/.exec(stepId);
                stepParam[stepN] = tests[testDesc][stepId];
                stepFlags[stepN] = match[1];
                stepDescs[stepN] = match[2];
                stepFuncs[stepN] = null;
            }

            // This function inserts a step definition at the appropriate place within the queue.
            // Without it, we're unable to queue step definitions in the appropriate order.
            function defineStep(isAsync, stepId, testFunc) {
                var stepN = stepDescs.indexOf(stepId);
                stepArity[stepN] = testFunc.length;
                stepFuncs[stepN] = testFunc;
                stepAsync[stepN] = isAsync;
            }

            // This function passes each test step found within the JSON to Jasmine.
            // Without it, we're unable to register test steps with Jasmine.
            function queueSteps(stepN) {
                var func = runStep.bind(null, stepN, 0);

                switch (true) {
                case stepN === stepDescs.length:
                    return;

                case stepFuncs[stepN] == null:
                    throw Error('Missing step definition: "' + stepDescs[stepN] + '"');

                default:
                    window[stepFlags[stepN] + 'describe']('[Step: ' + stepDescs[stepN], func);
                    return queueSteps(stepN + 1);
                }
            }

            // This function is called by Jasmine.  It executes the step with the appropriate global-variables/arguments.
            // Without it, Jasmine can't invoke the step.
            function runStep(stepN, startN) {
                var args = stepParam[stepN];
                var endN = startN + stepArity[stepN];
                var nthN = Math.floor(startN / stepArity[stepN] + 1) || 1;
                var func = runStepCycle.bind(null, stepN, args.slice(startN, endN));

                switch (true) {
                case endN > args.length:
                    return;

                default:
                    window.it('(' + nthN + 'th run)]', func);
                    return runStep(stepN, endN || 1);

                case nthN !== 11 && nthN % 10 === 1:
                    window.it('(' + nthN + 'st run)]', func);
                    return runStep(stepN, endN || 1);

                case nthN !== 12 && nthN % 10 === 2:
                    window.it('(' + nthN + 'nd run)]', func);
                    return runStep(stepN, endN || 1);

                case nthN !== 13 && nthN % 10 === 3:
                    window.it('(' + nthN + 'rd run)]', func);
                    return runStep(stepN, endN || 1);
                }
            }

            // This function is called by Jasmine.  It executes the tests step cycle with the appropriate global-variables/arguments.
            // Without it, Jasmine can't invoke the test step cycle.
            function runStepCycle(stepN, args, jasmineDoneFunc) {
                switch (true) {
                case stepAsync[stepN] !== true:
                    window.endAsyncStep = throwAsyncError;
                    stepFuncs[stepN].apply(null, args);
                    return jasmineDoneFunc();

                case stepAsync[stepN] === true:
                    window.endAsyncStep = jasmineDoneFunc;
                    stepFuncs[stepN].apply(null, args);
                }
            }
        }
    }
}());