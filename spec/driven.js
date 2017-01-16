
describe('Driven.js', function () {
    'use strict';

    forEachTest('base/spec/sync.json', function () {
        var object;

        runStep('manipulate the object', function (key, args) {
            object[key].apply(object, args);
        });

        runStep('create an object', function (key, args) {
            object = new (Function.bind.apply(window[key], [null].concat(args)));
        });

        runStep("chain the object's method calls together", function (key, args) {
            object = object[key].apply(object, args);
        });

        runStep("check the object's property values", function (key, val) {
            expect(object[key]).toEqual(val);
        });

        runStep("check the object's method return values", function (key, args, val) {
            expect(object[key].apply(object, args)).toEqual(val);
        });

        runStep("check the specs's full name", function (name) {
            expect(CustomReporter.specName).toEqual(name);
        });
    });

    forEachTest('base/spec/async.json', function () {
        var start = performance.now();
        var end, args, id;

        runAsyncStep('pass implicitly', function () {
            endAsyncStep();
        });

        runAsyncStep('execute callback asynchronously', function (key, args) {
            id = window[key].apply(window, [callback].concat(args));
        });

        runStep('bind callback arguments', function (args) {
            callback = Function.bind.apply(callback, [null].concat(args));
        });

        function callback() {
            end = performance.now();
            args = arguments;
            endAsyncStep();
        }

        runStep('check callback arguments', function (key, val) {
            expect(args[key]).toEqual(val);
        });

        runStep('prevent collateral executions', function (key) {
            window[key].call(window, id);
        });

        runStep('check elapsed time', function (val) {
            expect(end - start).toBeGreaterThan(val);
        });

        runStep("check the specs's full name", function (name) {
            expect(CustomReporter.specName).toEqual(name);
        });
    });
});

(function() {
    'use strict';

    jasmine.getEnv().addReporter(window.CustomReporter = {
        specStarted: onSpecStarted
    });

    // This function records the full name of the current spec.
    // Without it, we're unable to test that driven.js will report the appropriate error message.
    function onSpecStarted(spec) {
        this.specName = spec.fullName;
    }
}());
