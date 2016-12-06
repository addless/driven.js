describe('Driven.js', function () {
    'use strict';

    forEachTest('base/spec/sync.json', function () {
        var object;

        runStep('create an object', function (key, args) {
            object = new (Function.bind.apply(window[key], [null].concat(args)));
        });

        runStep('manipulate the object', function (key, args) {
            object[key].apply(object, args);
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
    });

    forEachTest('base/spec/async.json', function (done) {
        var start = performance.now();
        var id;

        runStep('pass implicitly', function () {
            done();
        });

        runStep('bind callback arguments', function (args) {
            callback = Function.bind.apply(callback, [null].concat(args));
        });

        runStep('execute callback asynchronously', function (key, args) {
            id = window[key].apply(window, [callback].concat(args));
        });

        function callback() {
            var end = performance.now();
            var args = arguments;

            runStep('prevent collateral executions', function (key) {
                window[key].call(window, id);
            });

            runStep('check callback arguments', function (key, val) {
                expect(args[key]).toEqual(val);
            });

            runStep('check elapsed time', function (val) {
                expect(end - start).toBeGreaterThan(val);
            });

            done();
        }
    });
});