(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global){
/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
(function () {

    var async = {};
    function noop() {}
    function identity(v) {
        return v;
    }
    function toBool(v) {
        return !!v;
    }
    function notId(v) {
        return !v;
    }

    // global on the server, window in the browser
    var previous_async;

    // Establish the root object, `window` (`self`) in the browser, `global`
    // on the server, or `this` in some virtual machines. We use `self`
    // instead of `window` for `WebWorker` support.
    var root = typeof self === 'object' && self.self === self && self ||
            typeof global === 'object' && global.global === global && global ||
            this;

    if (root != null) {
        previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        return function() {
            if (fn === null) throw new Error("Callback was already called.");
            fn.apply(this, arguments);
            fn = null;
        };
    }

    function _once(fn) {
        return function() {
            if (fn === null) return;
            fn.apply(this, arguments);
            fn = null;
        };
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    // Ported from underscore.js isObject
    var _isObject = function(obj) {
        var type = typeof obj;
        return type === 'function' || type === 'object' && !!obj;
    };

    function _isArrayLike(arr) {
        return _isArray(arr) || (
            // has a positive integer length property
            typeof arr.length === "number" &&
            arr.length >= 0 &&
            arr.length % 1 === 0
        );
    }

    function _arrayEach(arr, iterator) {
        var index = -1,
            length = arr.length;

        while (++index < length) {
            iterator(arr[index], index, arr);
        }
    }

    function _map(arr, iterator) {
        var index = -1,
            length = arr.length,
            result = Array(length);

        while (++index < length) {
            result[index] = iterator(arr[index], index, arr);
        }
        return result;
    }

    function _range(count) {
        return _map(Array(count), function (v, i) { return i; });
    }

    function _reduce(arr, iterator, memo) {
        _arrayEach(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    }

    function _forEachOf(object, iterator) {
        _arrayEach(_keys(object), function (key) {
            iterator(object[key], key);
        });
    }

    function _indexOf(arr, item) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === item) return i;
        }
        return -1;
    }

    var _keys = Object.keys || function (obj) {
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    function _keyIterator(coll) {
        var i = -1;
        var len;
        var keys;
        if (_isArrayLike(coll)) {
            len = coll.length;
            return function next() {
                i++;
                return i < len ? i : null;
            };
        } else {
            keys = _keys(coll);
            len = keys.length;
            return function next() {
                i++;
                return i < len ? keys[i] : null;
            };
        }
    }

    // Similar to ES6's rest param (http://ariya.ofilabs.com/2013/03/es6-and-rest-parameter.html)
    // This accumulates the arguments passed into an array, after a given index.
    // From underscore.js (https://github.com/jashkenas/underscore/pull/2140).
    function _restParam(func, startIndex) {
        startIndex = startIndex == null ? func.length - 1 : +startIndex;
        return function() {
            var length = Math.max(arguments.length - startIndex, 0);
            var rest = Array(length);
            for (var index = 0; index < length; index++) {
                rest[index] = arguments[index + startIndex];
            }
            switch (startIndex) {
                case 0: return func.call(this, rest);
                case 1: return func.call(this, arguments[0], rest);
            }
            // Currently unused but handle cases outside of the switch statement:
            // var args = Array(startIndex + 1);
            // for (index = 0; index < startIndex; index++) {
            //     args[index] = arguments[index];
            // }
            // args[startIndex] = rest;
            // return func.apply(this, args);
        };
    }

    function _withoutIndex(iterator) {
        return function (value, index, callback) {
            return iterator(value, callback);
        };
    }

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////

    // capture the global reference to guard against fakeTimer mocks
    var _setImmediate = typeof setImmediate === 'function' && setImmediate;

    var _delay = _setImmediate ? function(fn) {
        // not a direct alias for IE10 compatibility
        _setImmediate(fn);
    } : function(fn) {
        setTimeout(fn, 0);
    };

    if (typeof process === 'object' && typeof process.nextTick === 'function') {
        async.nextTick = process.nextTick;
    } else {
        async.nextTick = _delay;
    }
    async.setImmediate = _setImmediate ? _delay : async.nextTick;


    async.forEach =
    async.each = function (arr, iterator, callback) {
        return async.eachOf(arr, _withoutIndex(iterator), callback);
    };

    async.forEachSeries =
    async.eachSeries = function (arr, iterator, callback) {
        return async.eachOfSeries(arr, _withoutIndex(iterator), callback);
    };


    async.forEachLimit =
    async.eachLimit = function (arr, limit, iterator, callback) {
        return _eachOfLimit(limit)(arr, _withoutIndex(iterator), callback);
    };

    async.forEachOf =
    async.eachOf = function (object, iterator, callback) {
        callback = _once(callback || noop);
        object = object || [];

        var iter = _keyIterator(object);
        var key, completed = 0;

        while ((key = iter()) != null) {
            completed += 1;
            iterator(object[key], key, only_once(done));
        }

        if (completed === 0) callback(null);

        function done(err) {
            completed--;
            if (err) {
                callback(err);
            }
            // Check key is null in case iterator isn't exhausted
            // and done resolved synchronously.
            else if (key === null && completed <= 0) {
                callback(null);
            }
        }
    };

    async.forEachOfSeries =
    async.eachOfSeries = function (obj, iterator, callback) {
        callback = _once(callback || noop);
        obj = obj || [];
        var nextKey = _keyIterator(obj);
        var key = nextKey();
        function iterate() {
            var sync = true;
            if (key === null) {
                return callback(null);
            }
            iterator(obj[key], key, only_once(function (err) {
                if (err) {
                    callback(err);
                }
                else {
                    key = nextKey();
                    if (key === null) {
                        return callback(null);
                    } else {
                        if (sync) {
                            async.setImmediate(iterate);
                        } else {
                            iterate();
                        }
                    }
                }
            }));
            sync = false;
        }
        iterate();
    };



    async.forEachOfLimit =
    async.eachOfLimit = function (obj, limit, iterator, callback) {
        _eachOfLimit(limit)(obj, iterator, callback);
    };

    function _eachOfLimit(limit) {

        return function (obj, iterator, callback) {
            callback = _once(callback || noop);
            obj = obj || [];
            var nextKey = _keyIterator(obj);
            if (limit <= 0) {
                return callback(null);
            }
            var done = false;
            var running = 0;
            var errored = false;

            (function replenish () {
                if (done && running <= 0) {
                    return callback(null);
                }

                while (running < limit && !errored) {
                    var key = nextKey();
                    if (key === null) {
                        done = true;
                        if (running <= 0) {
                            callback(null);
                        }
                        return;
                    }
                    running += 1;
                    iterator(obj[key], key, only_once(function (err) {
                        running -= 1;
                        if (err) {
                            callback(err);
                            errored = true;
                        }
                        else {
                            replenish();
                        }
                    }));
                }
            })();
        };
    }


    function doParallel(fn) {
        return function (obj, iterator, callback) {
            return fn(async.eachOf, obj, iterator, callback);
        };
    }
    function doParallelLimit(fn) {
        return function (obj, limit, iterator, callback) {
            return fn(_eachOfLimit(limit), obj, iterator, callback);
        };
    }
    function doSeries(fn) {
        return function (obj, iterator, callback) {
            return fn(async.eachOfSeries, obj, iterator, callback);
        };
    }

    function _asyncMap(eachfn, arr, iterator, callback) {
        callback = _once(callback || noop);
        arr = arr || [];
        var results = _isArrayLike(arr) ? [] : {};
        eachfn(arr, function (value, index, callback) {
            iterator(value, function (err, v) {
                results[index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    }

    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = doParallelLimit(_asyncMap);

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.inject =
    async.foldl =
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachOfSeries(arr, function (x, i, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };

    async.foldr =
    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, identity).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };

    async.transform = function (arr, memo, iterator, callback) {
        if (arguments.length === 3) {
            callback = iterator;
            iterator = memo;
            memo = _isArray(arr) ? [] : {};
        }

        async.eachOf(arr, function(v, k, cb) {
            iterator(memo, v, k, cb);
        }, function(err) {
            callback(err, memo);
        });
    };

    function _filter(eachfn, arr, iterator, callback) {
        var results = [];
        eachfn(arr, function (x, index, callback) {
            iterator(x, function (v) {
                if (v) {
                    results.push({index: index, value: x});
                }
                callback();
            });
        }, function () {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    }

    async.select =
    async.filter = doParallel(_filter);

    async.selectLimit =
    async.filterLimit = doParallelLimit(_filter);

    async.selectSeries =
    async.filterSeries = doSeries(_filter);

    function _reject(eachfn, arr, iterator, callback) {
        _filter(eachfn, arr, function(value, cb) {
            iterator(value, function(v) {
                cb(!v);
            });
        }, callback);
    }
    async.reject = doParallel(_reject);
    async.rejectLimit = doParallelLimit(_reject);
    async.rejectSeries = doSeries(_reject);

    function _createTester(eachfn, check, getResult) {
        return function(arr, limit, iterator, cb) {
            function done() {
                if (cb) cb(getResult(false, void 0));
            }
            function iteratee(x, _, callback) {
                if (!cb) return callback();
                iterator(x, function (v) {
                    if (cb && check(v)) {
                        cb(getResult(true, x));
                        cb = iterator = false;
                    }
                    callback();
                });
            }
            if (arguments.length > 3) {
                eachfn(arr, limit, iteratee, done);
            } else {
                cb = iterator;
                iterator = limit;
                eachfn(arr, iteratee, done);
            }
        };
    }

    async.any =
    async.some = _createTester(async.eachOf, toBool, identity);

    async.someLimit = _createTester(async.eachOfLimit, toBool, identity);

    async.all =
    async.every = _createTester(async.eachOf, notId, notId);

    async.everyLimit = _createTester(async.eachOfLimit, notId, notId);

    function _findGetResult(v, x) {
        return x;
    }
    async.detect = _createTester(async.eachOf, identity, _findGetResult);
    async.detectSeries = _createTester(async.eachOfSeries, identity, _findGetResult);
    async.detectLimit = _createTester(async.eachOfLimit, identity, _findGetResult);

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                callback(null, _map(results.sort(comparator), function (x) {
                    return x.value;
                }));
            }

        });

        function comparator(left, right) {
            var a = left.criteria, b = right.criteria;
            return a < b ? -1 : a > b ? 1 : 0;
        }
    };

    async.auto = function (tasks, concurrency, callback) {
        if (typeof arguments[1] === 'function') {
            // concurrency is optional, shift the args.
            callback = concurrency;
            concurrency = null;
        }
        callback = _once(callback || noop);
        var keys = _keys(tasks);
        var remainingTasks = keys.length;
        if (!remainingTasks) {
            return callback(null);
        }
        if (!concurrency) {
            concurrency = remainingTasks;
        }

        var results = {};
        var runningTasks = 0;

        var hasError = false;

        var listeners = [];
        function addListener(fn) {
            listeners.unshift(fn);
        }
        function removeListener(fn) {
            var idx = _indexOf(listeners, fn);
            if (idx >= 0) listeners.splice(idx, 1);
        }
        function taskComplete() {
            remainingTasks--;
            _arrayEach(listeners.slice(0), function (fn) {
                fn();
            });
        }

        addListener(function () {
            if (!remainingTasks) {
                callback(null, results);
            }
        });

        _arrayEach(keys, function (k) {
            if (hasError) return;
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = _restParam(function(err, args) {
                runningTasks--;
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _forEachOf(results, function(val, rkey) {
                        safeResults[rkey] = val;
                    });
                    safeResults[k] = args;
                    hasError = true;

                    callback(err, safeResults);
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            });
            var requires = task.slice(0, task.length - 1);
            // prevent dead-locks
            var len = requires.length;
            var dep;
            while (len--) {
                if (!(dep = tasks[requires[len]])) {
                    throw new Error('Has nonexistent dependency in ' + requires.join(', '));
                }
                if (_isArray(dep) && _indexOf(dep, k) >= 0) {
                    throw new Error('Has cyclic dependencies');
                }
            }
            function ready() {
                return runningTasks < concurrency && _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            }
            if (ready()) {
                runningTasks++;
                task[task.length - 1](taskCallback, results);
            }
            else {
                addListener(listener);
            }
            function listener() {
                if (ready()) {
                    runningTasks++;
                    removeListener(listener);
                    task[task.length - 1](taskCallback, results);
                }
            }
        });
    };



    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var DEFAULT_INTERVAL = 0;

        var attempts = [];

        var opts = {
            times: DEFAULT_TIMES,
            interval: DEFAULT_INTERVAL
        };

        function parseTimes(acc, t){
            if(typeof t === 'number'){
                acc.times = parseInt(t, 10) || DEFAULT_TIMES;
            } else if(typeof t === 'object'){
                acc.times = parseInt(t.times, 10) || DEFAULT_TIMES;
                acc.interval = parseInt(t.interval, 10) || DEFAULT_INTERVAL;
            } else {
                throw new Error('Unsupported argument type for \'times\': ' + typeof t);
            }
        }

        var length = arguments.length;
        if (length < 1 || length > 3) {
            throw new Error('Invalid arguments - must be either (task), (task, callback), (times, task) or (times, task, callback)');
        } else if (length <= 2 && typeof times === 'function') {
            callback = task;
            task = times;
        }
        if (typeof times !== 'function') {
            parseTimes(opts, times);
        }
        opts.callback = callback;
        opts.task = task;

        function wrappedTask(wrappedCallback, wrappedResults) {
            function retryAttempt(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            }

            function retryInterval(interval){
                return function(seriesCallback){
                    setTimeout(function(){
                        seriesCallback(null);
                    }, interval);
                };
            }

            while (opts.times) {

                var finalAttempt = !(opts.times-=1);
                attempts.push(retryAttempt(opts.task, finalAttempt));
                if(!finalAttempt && opts.interval > 0){
                    attempts.push(retryInterval(opts.interval));
                }
            }

            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || opts.callback)(data.err, data.result);
            });
        }

        // If a callback is passed, run this as a controll flow
        return opts.callback ? wrappedTask() : wrappedTask;
    };

    async.waterfall = function (tasks, callback) {
        callback = _once(callback || noop);
        if (!_isArray(tasks)) {
            var err = new Error('First argument to waterfall must be an array of functions');
            return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        function wrapIterator(iterator) {
            return _restParam(function (err, args) {
                if (err) {
                    callback.apply(null, [err].concat(args));
                }
                else {
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    ensureAsync(iterator).apply(null, args);
                }
            });
        }
        wrapIterator(async.iterator(tasks))();
    };

    function _parallel(eachfn, tasks, callback) {
        callback = callback || noop;
        var results = _isArrayLike(tasks) ? [] : {};

        eachfn(tasks, function (task, key, callback) {
            task(_restParam(function (err, args) {
                if (args.length <= 1) {
                    args = args[0];
                }
                results[key] = args;
                callback(err);
            }));
        }, function (err) {
            callback(err, results);
        });
    }

    async.parallel = function (tasks, callback) {
        _parallel(async.eachOf, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel(_eachOfLimit(limit), tasks, callback);
    };

    async.series = function(tasks, callback) {
        _parallel(async.eachOfSeries, tasks, callback);
    };

    async.iterator = function (tasks) {
        function makeCallback(index) {
            function fn() {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            }
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        }
        return makeCallback(0);
    };

    async.apply = _restParam(function (fn, args) {
        return _restParam(function (callArgs) {
            return fn.apply(
                null, args.concat(callArgs)
            );
        });
    });

    function _concat(eachfn, arr, fn, callback) {
        var result = [];
        eachfn(arr, function (x, index, cb) {
            fn(x, function (err, y) {
                result = result.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, result);
        });
    }
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        callback = callback || noop;
        if (test()) {
            var next = _restParam(function(err, args) {
                if (err) {
                    callback(err);
                } else if (test.apply(this, args)) {
                    iterator(next);
                } else {
                    callback.apply(null, [null].concat(args));
                }
            });
            iterator(next);
        } else {
            callback(null);
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        var calls = 0;
        return async.whilst(function() {
            return ++calls <= 1 || test.apply(this, arguments);
        }, iterator, callback);
    };

    async.until = function (test, iterator, callback) {
        return async.whilst(function() {
            return !test.apply(this, arguments);
        }, iterator, callback);
    };

    async.doUntil = function (iterator, test, callback) {
        return async.doWhilst(iterator, function() {
            return !test.apply(this, arguments);
        }, callback);
    };

    async.during = function (test, iterator, callback) {
        callback = callback || noop;

        var next = _restParam(function(err, args) {
            if (err) {
                callback(err);
            } else {
                args.push(check);
                test.apply(this, args);
            }
        });

        var check = function(err, truth) {
            if (err) {
                callback(err);
            } else if (truth) {
                iterator(next);
            } else {
                callback(null);
            }
        };

        test(check);
    };

    async.doDuring = function (iterator, test, callback) {
        var calls = 0;
        async.during(function(next) {
            if (calls++ < 1) {
                next(null, true);
            } else {
                test.apply(this, arguments);
            }
        }, iterator, callback);
    };

    function _queue(worker, concurrency, payload) {
        if (concurrency == null) {
            concurrency = 1;
        }
        else if(concurrency === 0) {
            throw new Error('Concurrency must not be zero');
        }
        function _insert(q, data, pos, callback) {
            if (callback != null && typeof callback !== "function") {
                throw new Error("task callback must be a function");
            }
            q.started = true;
            if (!_isArray(data)) {
                data = [data];
            }
            if(data.length === 0 && q.idle()) {
                // call drain immediately if there are no tasks
                return async.setImmediate(function() {
                    q.drain();
                });
            }
            _arrayEach(data, function(task) {
                var item = {
                    data: task,
                    callback: callback || noop
                };

                if (pos) {
                    q.tasks.unshift(item);
                } else {
                    q.tasks.push(item);
                }

                if (q.tasks.length === q.concurrency) {
                    q.saturated();
                }
            });
            async.setImmediate(q.process);
        }
        function _next(q, tasks) {
            return function(){
                workers -= 1;

                var removed = false;
                var args = arguments;
                _arrayEach(tasks, function (task) {
                    _arrayEach(workersList, function (worker, index) {
                        if (worker === task && !removed) {
                            workersList.splice(index, 1);
                            removed = true;
                        }
                    });

                    task.callback.apply(task, args);
                });
                if (q.tasks.length + workers === 0) {
                    q.drain();
                }
                q.process();
            };
        }

        var workers = 0;
        var workersList = [];
        var q = {
            tasks: [],
            concurrency: concurrency,
            payload: payload,
            saturated: noop,
            empty: noop,
            drain: noop,
            started: false,
            paused: false,
            push: function (data, callback) {
                _insert(q, data, false, callback);
            },
            kill: function () {
                q.drain = noop;
                q.tasks = [];
            },
            unshift: function (data, callback) {
                _insert(q, data, true, callback);
            },
            process: function () {
                while(!q.paused && workers < q.concurrency && q.tasks.length){

                    var tasks = q.payload ?
                        q.tasks.splice(0, q.payload) :
                        q.tasks.splice(0, q.tasks.length);

                    var data = _map(tasks, function (task) {
                        return task.data;
                    });

                    if (q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    workersList.push(tasks[0]);
                    var cb = only_once(_next(q, tasks));
                    worker(data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            workersList: function () {
                return workersList;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                q.paused = true;
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                var resumeCount = Math.min(q.concurrency, q.tasks.length);
                // Need to call q.process once per concurrent
                // worker to preserve full concurrency after pause
                for (var w = 1; w <= resumeCount; w++) {
                    async.setImmediate(q.process);
                }
            }
        };
        return q;
    }

    async.queue = function (worker, concurrency) {
        var q = _queue(function (items, cb) {
            worker(items[0], cb);
        }, concurrency, 1);

        return q;
    };

    async.priorityQueue = function (worker, concurrency) {

        function _compareTasks(a, b){
            return a.priority - b.priority;
        }

        function _binarySearch(sequence, item, compare) {
            var beg = -1,
                end = sequence.length - 1;
            while (beg < end) {
                var mid = beg + ((end - beg + 1) >>> 1);
                if (compare(item, sequence[mid]) >= 0) {
                    beg = mid;
                } else {
                    end = mid - 1;
                }
            }
            return beg;
        }

        function _insert(q, data, priority, callback) {
            if (callback != null && typeof callback !== "function") {
                throw new Error("task callback must be a function");
            }
            q.started = true;
            if (!_isArray(data)) {
                data = [data];
            }
            if(data.length === 0) {
                // call drain immediately if there are no tasks
                return async.setImmediate(function() {
                    q.drain();
                });
            }
            _arrayEach(data, function(task) {
                var item = {
                    data: task,
                    priority: priority,
                    callback: typeof callback === 'function' ? callback : noop
                };

                q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

                if (q.tasks.length === q.concurrency) {
                    q.saturated();
                }
                async.setImmediate(q.process);
            });
        }

        // Start with a normal queue
        var q = async.queue(worker, concurrency);

        // Override push to accept second parameter representing priority
        q.push = function (data, priority, callback) {
            _insert(q, data, priority, callback);
        };

        // Remove unshift function
        delete q.unshift;

        return q;
    };

    async.cargo = function (worker, payload) {
        return _queue(worker, 1, payload);
    };

    function _console_fn(name) {
        return _restParam(function (fn, args) {
            fn.apply(null, args.concat([_restParam(function (err, args) {
                if (typeof console === 'object') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _arrayEach(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            })]));
        });
    }
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        var has = Object.prototype.hasOwnProperty;
        hasher = hasher || identity;
        var memoized = _restParam(function memoized(args) {
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (has.call(memo, key)) {   
                async.setImmediate(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (has.call(queues, key)) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([_restParam(function (args) {
                    memo[key] = args;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                        q[i].apply(null, args);
                    }
                })]));
            }
        });
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
        return function () {
            return (fn.unmemoized || fn).apply(null, arguments);
        };
    };

    function _times(mapper) {
        return function (count, iterator, callback) {
            mapper(_range(count), iterator, callback);
        };
    }

    async.times = _times(async.map);
    async.timesSeries = _times(async.mapSeries);
    async.timesLimit = function (count, limit, iterator, callback) {
        return async.mapLimit(_range(count), limit, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return _restParam(function (args) {
            var that = this;

            var callback = args[args.length - 1];
            if (typeof callback == 'function') {
                args.pop();
            } else {
                callback = noop;
            }

            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([_restParam(function (err, nextargs) {
                    cb(err, nextargs);
                })]));
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        });
    };

    async.compose = function (/* functions... */) {
        return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };


    function _applyEach(eachfn) {
        return _restParam(function(fns, args) {
            var go = _restParam(function(args) {
                var that = this;
                var callback = args.pop();
                return eachfn(fns, function (fn, _, cb) {
                    fn.apply(that, args.concat([cb]));
                },
                callback);
            });
            if (args.length) {
                return go.apply(this, args);
            }
            else {
                return go;
            }
        });
    }

    async.applyEach = _applyEach(async.eachOf);
    async.applyEachSeries = _applyEach(async.eachOfSeries);


    async.forever = function (fn, callback) {
        var done = only_once(callback || noop);
        var task = ensureAsync(fn);
        function next(err) {
            if (err) {
                return done(err);
            }
            task(next);
        }
        next();
    };

    function ensureAsync(fn) {
        return _restParam(function (args) {
            var callback = args.pop();
            args.push(function () {
                var innerArgs = arguments;
                if (sync) {
                    async.setImmediate(function () {
                        callback.apply(null, innerArgs);
                    });
                } else {
                    callback.apply(null, innerArgs);
                }
            });
            var sync = true;
            fn.apply(this, args);
            sync = false;
        });
    }

    async.ensureAsync = ensureAsync;

    async.constant = _restParam(function(values) {
        var args = [null].concat(values);
        return function (callback) {
            return callback.apply(this, args);
        };
    });

    async.wrapSync =
    async.asyncify = function asyncify(func) {
        return _restParam(function (args) {
            var callback = args.pop();
            var result;
            try {
                result = func.apply(this, args);
            } catch (e) {
                return callback(e);
            }
            // if result is Promise object
            if (_isObject(result) && typeof result.then === "function") {
                result.then(function(value) {
                    callback(null, value);
                })["catch"](function(err) {
                    callback(err.message ? err : new Error(err));
                });
            } else {
                callback(null, result);
            }
        });
    };

    // Node.js
    if (typeof module === 'object' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define === 'function' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":3}],2:[function(require,module,exports){
module.exports = function blacklist (src) {
  var copy = {}
  var filter = arguments[1]

  if (typeof filter === 'string') {
    filter = {}
    for (var i = 1; i < arguments.length; i++) {
      filter[arguments[i]] = true
    }
  }

  for (var key in src) {
    // blacklist?
    if (filter[key]) continue

    copy[key] = src[key]
  }

  return copy
}

},{}],3:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
/*!
  Copyright (c) 2016 Jed Watson.
  Licensed under the MIT License (MIT), see
  http://jedwatson.github.io/classnames
*/
/* global define */

(function () {
	'use strict';

	var hasOwn = {}.hasOwnProperty;

	function classNames () {
		var classes = [];

		for (var i = 0; i < arguments.length; i++) {
			var arg = arguments[i];
			if (!arg) continue;

			var argType = typeof arg;

			if (argType === 'string' || argType === 'number') {
				classes.push(arg);
			} else if (Array.isArray(arg)) {
				classes.push(classNames.apply(null, arg));
			} else if (argType === 'object') {
				for (var key in arg) {
					if (hasOwn.call(arg, key) && arg[key]) {
						classes.push(key);
					}
				}
			}
		}

		return classes.join(' ');
	}

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = classNames;
	} else if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {
		// register as 'classnames', consistent with npm package name
		define('classnames', [], function () {
			return classNames;
		});
	} else {
		window.classNames = classNames;
	}
}());

},{}],5:[function(require,module,exports){
function makeshiftTitle(title, message) {
  return title ? (title + '\n\n' + message) : message
}

// See http://docs.phonegap.com/en/edge/cordova_notification_notification.md.html for documentation
module.exports = {
  alert: function alert(message, callback, title) {
    if (window.navigator.notification && window.navigator.notification.alert) {
      return window.navigator.notification.alert.apply(null, arguments)
    }

    var text = makeshiftTitle(title, message)

    setTimeout(function() {
      window.alert(text)

      callback()
    }, 0)
  },
  confirm: function confirm(message, callback, title) {
    if (window.navigator.notification && window.navigator.notification.confirm) {
      return window.navigator.notification.confirm.apply(null, arguments)
    }

    var text = makeshiftTitle(title, message)

    setTimeout(function() {
      var confirmed = window.confirm(text)
      var buttonIndex = confirmed ? 1 : 2

      callback(buttonIndex)
    }, 0)
  },

  prompt: function prompt(message, callback, title, defaultText) {
    if (window.navigator.notification && window.navigator.notification.prompt) {
      return window.navigator.notification.prompt.apply(null, arguments)
    }

    var question = makeshiftTitle(title, message)

    setTimeout(function() {
      var text = window.prompt(question, defaultText)
      var buttonIndex = (text === null) ? 0 : 1

      callback({
        buttonIndex: buttonIndex,
        input1: text
      })
    }, 0)
  }
}

},{}],6:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],7:[function(require,module,exports){
var isFunction = require('is-function')

module.exports = forEach

var toString = Object.prototype.toString
var hasOwnProperty = Object.prototype.hasOwnProperty

function forEach(list, iterator, context) {
    if (!isFunction(iterator)) {
        throw new TypeError('iterator must be a function')
    }

    if (arguments.length < 3) {
        context = this
    }
    
    if (toString.call(list) === '[object Array]')
        forEachArray(list, iterator, context)
    else if (typeof list === 'string')
        forEachString(list, iterator, context)
    else
        forEachObject(list, iterator, context)
}

function forEachArray(array, iterator, context) {
    for (var i = 0, len = array.length; i < len; i++) {
        if (hasOwnProperty.call(array, i)) {
            iterator.call(context, array[i], i, array)
        }
    }
}

function forEachString(string, iterator, context) {
    for (var i = 0, len = string.length; i < len; i++) {
        // no such thing as a sparse string.
        iterator.call(context, string.charAt(i), i, string)
    }
}

function forEachObject(object, iterator, context) {
    for (var k in object) {
        if (hasOwnProperty.call(object, k)) {
            iterator.call(context, object[k], k, object)
        }
    }
}

},{"is-function":11}],8:[function(require,module,exports){
(function (global){
var win;

if (typeof window !== "undefined") {
    win = window;
} else if (typeof global !== "undefined") {
    win = global;
} else if (typeof self !== "undefined"){
    win = self;
} else {
    win = {};
}

module.exports = win;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],9:[function(require,module,exports){
var request = require('request')

if (typeof Promise !== 'function') {
  throw new TypeError('Please provide a Promise polyfill as your environment doesn\'t support them natively')
}

module.exports = function (options, callback) {

  return new Promise(function (resolve, reject) {

    request(options, function (err, response, body) {

      var status = (response) ? response.statusCode : 0
      callback = callback || function () {}

      if (err) {
        callback(err)
        reject(err)
        return
      }

      try{
        response.body = JSON.parse(body)
      }
      catch (e) {}

      if (status >= 400 && status < 600) {
        callback(null, response, response.body)
        reject(response)
        return
      }

      callback(null, response, response.body)
      resolve(response)
    })
  })
}

},{"request":10}],10:[function(require,module,exports){
var request = require('xhr');

// Wrapper to make the features more similiar between
// request and xhr

module.exports = function (options, callback) {
  callback = callback || function () {};
  
  // Set up for Request module
  if (options.data && !window) options.form = options.data;
  
  // Set up for xhr module
  if (options.form && window) {
    options.body = (typeof options.form === 'object')
      ? JSON.stringify(options.form)
      : options.form;
  }
  
  if (options.data) {
    options.body = (typeof options.data === 'object')
      ? JSON.stringify(options.data)
      : options.data;
  }
  
  if (options.url && window) options.uri = options.url;
  if (window) options.cors = options.withCredentials;
  
  return request(options, callback);
};
},{"xhr":60}],11:[function(require,module,exports){
module.exports = isFunction

var toString = Object.prototype.toString

function isFunction (fn) {
  var string = toString.call(fn)
  return string === '[object Function]' ||
    (typeof fn === 'function' && string !== '[object RegExp]') ||
    (typeof window !== 'undefined' &&
     // IE8 and below
     (fn === window.setTimeout ||
      fn === window.alert ||
      fn === window.confirm ||
      fn === window.prompt))
};

},{}],12:[function(require,module,exports){
var trim = require('trim')
  , forEach = require('for-each')
  , isArray = function(arg) {
      return Object.prototype.toString.call(arg) === '[object Array]';
    }

module.exports = function (headers) {
  if (!headers)
    return {}

  var result = {}

  forEach(
      trim(headers).split('\n')
    , function (row) {
        var index = row.indexOf(':')
          , key = trim(row.slice(0, index)).toLowerCase()
          , value = trim(row.slice(index + 1))

        if (typeof(result[key]) === 'undefined') {
          result[key] = value
        } else if (isArray(result[key])) {
          result[key].push(value)
        } else {
          result[key] = [ result[key], value ]
        }
      }
  )

  return result
}
},{"for-each":7,"trim":58}],13:[function(require,module,exports){
"use strict";

module.exports = {
  componentWillMount: function componentWillMount() {
    this.__rs_listeners = [];
  },

  componentWillUnmount: function componentWillUnmount() {
    this.__rs_listeners.forEach(function (listener) {
      var emitter = listener.emitter;
      var eventName = listener.eventName;
      var callback = listener.callback;

      var removeListener = emitter.removeListener || emitter.removeEventListener;
      removeListener.call(emitter, eventName, callback);
    });
  },

  watch: function watch(emitter, eventName, callback) {
    this.__rs_listeners.push({
      emitter: emitter,
      eventName: eventName,
      callback: callback
    });

    var addListener = emitter.addListener || emitter.addEventListener;
    addListener.call(emitter, eventName, callback);
  },

  unwatch: function unwatch(emitter, eventName, callback) {
    this.__rs_listeners = this.__rs_listeners.filter(function (listener) {
      return listener.emitter === emitter && listener.eventName === eventName && listener.callback === callback;
    });

    var removeListener = emitter.removeListener || emitter.removeEventListener;
    removeListener.call(emitter, eventName, callback);
  }
};
},{}],14:[function(require,module,exports){
(function (global){
var GLOBAL = global || window

function clearTimers () {
  this.clearIntervals()
  this.clearTimeouts()
}

module.exports = {
  clearIntervals: function clearIntervals () { this.__rt_intervals.forEach(GLOBAL.clearInterval) },
  clearTimeouts: function clearTimeouts () { this.__rt_timeouts.forEach(GLOBAL.clearTimeout) },
  clearInterval: function clearInterval (id) { return GLOBAL.clearInterval(id) },
  clearTimeout: function clearTimeout (id) { return GLOBAL.clearTimeout(id) },
  clearTimers: clearTimers,

  componentWillMount: function componentWillMount () {
    this.__rt_intervals = []
    this.__rt_timeouts = []
  },
  componentWillUnmount: clearTimers,

  setInterval: function setInterval (callback) {
    var id = GLOBAL.setInterval(callback.bind(this), [].slice.call(arguments, 1))
    this.__rt_intervals.push(id)
    return id
  },
  setTimeout: function setTimeout (callback) {
    var id = GLOBAL.setTimeout(callback.bind(this), [].slice.call(arguments, 1))
    this.__rt_timeouts.push(id)
    return id
  }
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],15:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactContainer = require('react-container');

var _reactContainer2 = _interopRequireDefault(_reactContainer);

var ErrorView = _react2['default'].createClass({
	displayName: 'ErrorView',

	propTypes: {
		children: _react2['default'].PropTypes.node
	},

	render: function render() {
		return _react2['default'].createElement(
			_reactContainer2['default'],
			{ fill: true, className: 'View ErrorView' },
			this.props.children
		);
	}
});

exports['default'] = ErrorView;
module.exports = exports['default'];
},{"react":undefined,"react-container":undefined}],16:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

var _mixinsTransitions = require('../mixins/Transitions');

var _mixinsTransitions2 = _interopRequireDefault(_mixinsTransitions);

var Link = _react2['default'].createClass({
	displayName: 'Link',

	mixins: [_mixinsTransitions2['default']],
	propTypes: {
		children: _react2['default'].PropTypes.any,
		options: _react2['default'].PropTypes.object,
		transition: _react2['default'].PropTypes.string,
		to: _react2['default'].PropTypes.string,
		viewProps: _react2['default'].PropTypes.any
	},

	doTransition: function doTransition() {
		var options = _extends({ viewProps: this.props.viewProps, transition: this.props.transition }, this.props.options);
		console.info('Link to "' + this.props.to + '" using transition "' + this.props.transition + '"' + ' with props ', this.props.viewProps);
		this.transitionTo(this.props.to, options);
	},

	render: function render() {
		var tappableProps = (0, _blacklist2['default'])(this.props, 'children', 'options', 'transition', 'viewProps');

		return _react2['default'].createElement(
			_reactTappable2['default'],
			_extends({ onTap: this.doTransition }, tappableProps),
			this.props.children
		);
	}
});

exports['default'] = Link;
module.exports = exports['default'];
},{"../mixins/Transitions":21,"blacklist":2,"react":undefined,"react-tappable":undefined}],17:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var View = _react2['default'].createClass({
	displayName: 'View',

	propTypes: {
		component: _react2['default'].PropTypes.func.isRequired,
		name: _react2['default'].PropTypes.string.isRequired
	},
	render: function render() {
		throw new Error('TouchstoneJS <View> should not be rendered directly.');
	}
});

exports['default'] = View;
module.exports = exports['default'];
},{"react":undefined}],18:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _ErrorView = require('./ErrorView');

var _ErrorView2 = _interopRequireDefault(_ErrorView);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactAddonsCssTransitionGroup = require('react-addons-css-transition-group');

var _reactAddonsCssTransitionGroup2 = _interopRequireDefault(_reactAddonsCssTransitionGroup);

function createViewsFromChildren(children) {
	var views = {};
	_react2['default'].Children.forEach(children, function (view) {
		views[view.props.name] = view;
	});
	return views;
}

var ViewContainer = _react2['default'].createClass({
	displayName: 'ViewContainer',

	statics: {
		shouldFillVerticalSpace: true
	},
	propTypes: {
		children: _react2['default'].PropTypes.node
	},
	render: function render() {
		var props = (0, _blacklist2['default'])(this.props, 'children');
		return _react2['default'].createElement(
			'div',
			props,
			this.props.children
		);
	}
});

var ViewManager = _react2['default'].createClass({
	displayName: 'ViewManager',

	statics: {
		shouldFillVerticalSpace: true
	},
	contextTypes: {
		app: _react2['default'].PropTypes.object.isRequired
	},
	propTypes: {
		name: _react2['default'].PropTypes.string,
		children: _react2['default'].PropTypes.node,
		className: _react2['default'].PropTypes.string,
		defaultView: _react2['default'].PropTypes.string,
		onViewChange: _react2['default'].PropTypes.func
	},
	getDefaultProps: function getDefaultProps() {
		return {
			name: '__default'
		};
	},
	getInitialState: function getInitialState() {
		return {
			views: createViewsFromChildren(this.props.children),
			currentView: this.props.defaultView,
			options: {}
		};
	},
	componentDidMount: function componentDidMount() {
		this.context.app.viewManagers[this.props.name] = this;
	},
	componentWillUnmount: function componentWillUnmount() {
		delete this.context.app.viewManagers[this.props.name];
	},
	componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
		this.setState({
			views: createViewsFromChildren(this.props.children)
		});
		if (nextProps.name !== this.props.name) {
			this.context.app.viewManagers[nextProps.name] = this;
			delete this.context.app.viewManagers[this.props.name];
		}
		if (nextProps.currentView && nextProps.currentView !== this.state.currentView) {
			this.transitionTo(nextProps.currentView, { viewProps: nextProps.viewProps });
		}
	},
	transitionTo: function transitionTo(viewKey, options) {
		var _this = this;

		if (typeof options === 'string') {
			options = { transition: options };
		}
		if (!options) options = {};
		this.activeTransitionOptions = options;
		this.context.app.viewManagerInTransition = this;
		this.props.onViewChange && this.props.onViewChange(viewKey);
		this.setState({
			currentView: viewKey,
			options: options
		}, function () {
			delete _this.activeTransitionOptions;
			delete _this.context.app.viewManagerInTransition;
		});
	},
	renderViewContainer: function renderViewContainer() {
		var viewKey = this.state.currentView;
		if (!viewKey) {
			return _react2['default'].createElement(
				_ErrorView2['default'],
				null,
				_react2['default'].createElement(
					'span',
					{ className: 'ErrorView__heading' },
					'ViewManager: ',
					this.props.name
				),
				_react2['default'].createElement(
					'span',
					{ className: 'ErrorView__text' },
					'Error: There is no current View.'
				)
			);
		}
		var view = this.state.views[viewKey];
		if (!view || !view.props.component) {
			return _react2['default'].createElement(
				_ErrorView2['default'],
				null,
				_react2['default'].createElement(
					'span',
					{ className: 'ErrorView__heading' },
					'ViewManager: "',
					this.props.name,
					'"'
				),
				_react2['default'].createElement(
					'span',
					{ className: 'ErrorView__text' },
					'The View "',
					viewKey,
					'" is invalid.'
				)
			);
		}
		var options = this.state.options || {};
		var viewClassName = (0, _classnames2['default'])('View View--' + viewKey, view.props.className);
		var ViewComponent = view.props.component;
		var viewProps = (0, _blacklist2['default'])(view.props, 'component', 'className');
		_extends(viewProps, options.viewProps);
		var viewElement = _react2['default'].createElement(ViewComponent, viewProps);

		if (this.__lastRenderedView !== viewKey) {
			// console.log('initialising view ' + viewKey + ' with options', options);
			if (viewElement.type.navigationBar && viewElement.type.getNavigation) {
				var app = this.context.app;
				var transition = options.transition;
				if (app.viewManagerInTransition) {
					transition = app.viewManagerInTransition.activeTransitionOptions.transition;
				}
				setTimeout(function () {
					app.navigationBars[viewElement.type.navigationBar].updateWithTransition(viewElement.type.getNavigation(viewProps, app), transition);
				}, 0);
			}
			this.__lastRenderedView = viewKey;
		}

		return _react2['default'].createElement(
			ViewContainer,
			{ className: viewClassName, key: viewKey },
			viewElement
		);
	},
	render: function render() {
		var className = (0, _classnames2['default'])('ViewManager', this.props.className);
		var viewContainer = this.renderViewContainer(this.state.currentView, { viewProps: this.state.currentViewProps });

		var transitionName = 'view-transition-instant';
		var transitionDurationEnter = 10;
		var transitionDurationLeave = 60;
		if (this.state.options.transition) {
			// console.log('applying view transition: ' + this.state.options.transition + ' to view ' + this.state.currentView);
			transitionName = 'view-transition-' + this.state.options.transition;
			if (this.state.options.transition === 'fade') {
				var transitionDurationEnter = 10;
				var transitionDurationLeave = 340;
			} else {
				var transitionDurationEnter = 500;
				var transitionDurationLeave = 500;
			}
		}
		return _react2['default'].createElement(
			_reactAddonsCssTransitionGroup2['default'],
			{ transitionName: transitionName, transitionEnterTimeout: transitionDurationEnter, transitionLeaveTimeout: transitionDurationLeave, className: className, component: 'div' },
			viewContainer
		);
	}
});

exports['default'] = ViewManager;
module.exports = exports['default'];
},{"./ErrorView":15,"blacklist":2,"classnames":4,"react":undefined,"react-addons-css-transition-group":undefined}],19:[function(require,module,exports){
'use strict';

var animation = require('tween.js');

function update() {
	animation.update();
	if (animation.getAll().length) {
		window.requestAnimationFrame(update);
	}
}

function scrollToTop(el, options) {
	options = options || {};
	var from = el.scrollTop;
	var duration = Math.min(Math.max(200, from / 2), 350);
	if (from > 200) duration = 300;
	el.style.webkitOverflowScrolling = 'auto';
	el.style.overflow = 'hidden';
	var tween = new animation.Tween({ pos: from }).to({ pos: 0 }, duration).easing(animation.Easing.Quadratic.Out).onUpdate(function () {
		el.scrollTop = this.pos;
		if (options.onUpdate) {
			options.onUpdate();
		}
	}).onComplete(function () {
		el.style.webkitOverflowScrolling = 'touch';
		el.style.overflow = 'scroll';
		if (options.onComplete) options.onComplete();
	}).start();
	update();
	return tween;
}

exports.scrollToTop = scrollToTop;

var Mixins = exports.Mixins = {};

Mixins.ScrollContainerToTop = {
	componentDidMount: function componentDidMount() {
		window.addEventListener('statusTap', this.scrollContainerToTop);
	},
	componentWillUnmount: function componentWillUnmount() {
		window.removeEventListener('statusTap', this.scrollContainerToTop);
		if (this._scrollContainerAnimation) {
			this._scrollContainerAnimation.stop();
		}
	},
	scrollContainerToTop: function scrollContainerToTop() {
		var _this = this;

		if (!this.isMounted() || !this.refs.scrollContainer) return;
		this._scrollContainerAnimation = scrollToTop(this.refs.scrollContainer, {
			onComplete: function onComplete() {
				delete _this._scrollContainerAnimation;
			}
		});
	}
};
},{"tween.js":59}],20:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
exports.createApp = createApp;
var React = require('react');

var animation = require('./core/animation');
exports.animation = animation;
var Link = require('./core/Link');
exports.Link = Link;
var View = require('./core/View');
exports.View = View;
var ViewManager = require('./core/ViewManager');

exports.ViewManager = ViewManager;
var Container = require('react-container');
exports.Container = Container;
var Mixins = require('./mixins');
exports.Mixins = Mixins;
var UI = require('./ui');

exports.UI = UI;

function createApp() {
	var app = {
		navigationBars: {},
		viewManagers: {},
		transitionTo: function transitionTo(view, opts) {
			var vm = '__default';
			view = view.split(':');
			if (view.length > 1) {
				vm = view.shift();
			}
			view = view[0];
			app.viewManagers[vm].transitionTo(view, opts);
		}
	};
	return {
		childContextTypes: {
			app: React.PropTypes.object
		},
		getChildContext: function getChildContext() {
			return {
				app: app
			};
		}
	};
}
},{"./core/Link":16,"./core/View":17,"./core/ViewManager":18,"./core/animation":19,"./mixins":22,"./ui":57,"react":undefined,"react-container":undefined}],21:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var Transitions = {
	contextTypes: {
		app: _react2['default'].PropTypes.object
	},
	transitionTo: function transitionTo(view, opts) {
		this.context.app.transitionTo(view, opts);
	}
};

exports['default'] = Transitions;
module.exports = exports['default'];
},{"react":undefined}],22:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
var Transitions = require('./Transitions');
exports.Transitions = Transitions;
},{"./Transitions":21}],23:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactAddonsCssTransitionGroup = require('react-addons-css-transition-group');

var _reactAddonsCssTransitionGroup2 = _interopRequireDefault(_reactAddonsCssTransitionGroup);

module.exports = _react2['default'].createClass({
	displayName: 'Alertbar',
	propTypes: {
		animated: _react2['default'].PropTypes.bool,
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string,
		pulse: _react2['default'].PropTypes.bool,
		type: _react2['default'].PropTypes.oneOf(['default', 'primary', 'success', 'warning', 'danger']),
		visible: _react2['default'].PropTypes.bool
	},

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'default'
		};
	},

	render: function render() {
		var className = (0, _classnames2['default'])('Alertbar', 'Alertbar--' + this.props.type, {
			'Alertbar--animated': this.props.animated,
			'Alertbar--pulse': this.props.pulse
		}, this.props.className);

		var pulseWrap = this.props.pulse ? _react2['default'].createElement(
			'div',
			{ className: 'Alertbar__inner' },
			this.props.children
		) : this.props.children;
		var animatedBar = this.props.visible ? _react2['default'].createElement(
			'div',
			{ className: className },
			pulseWrap
		) : null;

		var component = this.props.animated ? _react2['default'].createElement(
			_reactAddonsCssTransitionGroup2['default'],
			{ transitionName: 'Alertbar', transitionEnterTimeout: 300, transitionLeaveTimeout: 300, component: 'div' },
			animatedBar
		) : _react2['default'].createElement(
			'div',
			{ className: className },
			pulseWrap
		);

		return component;
	}
});
},{"classnames":4,"react":undefined,"react-addons-css-transition-group":undefined}],24:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

module.exports = _react2['default'].createClass({
	displayName: 'Button',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string,
		type: _react2['default'].PropTypes.oneOf(['default', 'info', 'primary', 'success', 'warning', 'danger'])
	},

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'default'
		};
	},

	render: function render() {
		var className = (0, _classnames2['default'])('Button', 'Button--' + this.props.type, this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'type');

		return _react2['default'].createElement(_reactTappable2['default'], _extends({}, props, { className: className, component: 'button' }));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined,"react-tappable":undefined}],25:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'ButtonGroup',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},
	render: function render() {
		var className = (0, _classnames2['default'])('ButtonGroup', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],26:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

var i18n = {
	// TODO: use real i18n strings.
	weekdaysMin: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
	months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
	longMonths: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
	formatYearMonth: function formatYearMonth(year, month) {
		return year + ' - ' + (month + 1);
	}
};

function newState(props) {
	var date = props.date || new Date();
	var year = date.getFullYear();
	var month = date.getMonth();
	var ns = {
		mode: 'day',
		year: year,
		month: month,
		day: date.getDate(),
		displayYear: year,
		displayMonth: month,
		displayYearRangeStart: Math.floor(year / 10) * 10
	};
	return ns;
}

module.exports = _react2['default'].createClass({
	displayName: 'DatePicker',
	propTypes: {
		date: _react2['default'].PropTypes.object,
		mode: _react2['default'].PropTypes.oneOf(['day', 'month']),
		onChange: _react2['default'].PropTypes.func
	},

	getDefaultProps: function getDefaultProps() {
		return {
			date: new Date()
		};
	},

	getInitialState: function getInitialState() {
		return newState(this.props);
	},

	componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
		this.setState(newState(nextProps));
	},

	selectDay: function selectDay(year, month, day) {
		this.setState({
			year: year,
			month: month,
			day: day
		});

		if (this.props.onChange) {
			this.props.onChange(new Date(year, month, day));
		}
	},

	selectMonth: function selectMonth(month) {
		this.setState({
			displayMonth: month,
			mode: 'day'
		});
	},

	selectYear: function selectYear(year) {
		this.setState({
			displayYear: year,
			displayYearRangeStart: Math.floor(year / 10) * 10,
			mode: 'month'
		});
	},

	handlerTopBarTitleClick: function handlerTopBarTitleClick() {
		if (this.state.mode === 'day') {
			this.setState({ mode: 'month' });
		} else {
			this.setState({ mode: 'day' });
		}
	},

	handleLeftArrowClick: function handleLeftArrowClick() {
		switch (this.state.mode) {
			case 'day':
				this.goPreviousMonth();
				break;

			case 'month':
				this.goPreviousYearRange();
				break;

			case 'year':
				this.goPreviousYearRange();
				break;
		}
	},

	handleRightArrowClick: function handleRightArrowClick() {
		switch (this.state.mode) {
			case 'day':
				this.goNextMonth();
				break;

			case 'month':
				this.goNextYearRange();
				break;

			case 'year':
				this.goNextYearRange();
				break;
		}
	},

	goPreviousMonth: function goPreviousMonth() {
		if (this.state.displayMonth === 0) {
			this.setState({
				displayMonth: 11,
				displayYear: this.state.displayYear - 1
			});
		} else {
			this.setState({
				displayMonth: this.state.displayMonth - 1
			});
		}
	},

	goNextMonth: function goNextMonth() {
		if (this.state.displayMonth === 11) {
			this.setState({
				displayMonth: 0,
				displayYear: this.state.displayYear + 1
			});
		} else {
			this.setState({
				displayMonth: this.state.displayMonth + 1
			});
		}
	},

	goPreviousYear: function goPreviousYear() {
		this.setState({
			displayYear: this.state.displayYear - 1
		});
	},

	goNextYear: function goNextYear() {
		this.setState({
			displayYear: this.state.displayYear + 1
		});
	},

	goPreviousYearRange: function goPreviousYearRange() {
		this.setState({
			displayYearRangeStart: this.state.displayYearRangeStart - 10
		});
	},

	goNextYearRange: function goNextYearRange() {
		this.setState({
			displayYearRangeStart: this.state.displayYearRangeStart + 10
		});
	},

	renderWeeknames: function renderWeeknames() {
		return i18n.weekdaysMin.map(function (name, i) {
			return _react2['default'].createElement(
				'span',
				{ key: name + i, className: 'week-name' },
				name
			);
		});
	},

	renderDays: function renderDays() {
		var displayYear = this.state.displayYear;
		var displayMonth = this.state.displayMonth;
		var today = new Date();
		var lastDayInMonth = new Date(displayYear, displayMonth + 1, 0);
		var daysInMonth = lastDayInMonth.getDate();
		var daysInPreviousMonth = new Date(displayYear, displayMonth, 0).getDate();
		var startWeekDay = new Date(displayYear, displayMonth, 1).getDay();
		var days = [];
		var i, dm, dy;

		for (i = 0; i < startWeekDay; i++) {
			var d = daysInPreviousMonth - (startWeekDay - 1 - i);
			dm = displayMonth - 1;
			dy = displayYear;
			if (dm === -1) {
				dm = 11;
				dy -= 1;
			}
			days.push(_react2['default'].createElement(
				_reactTappable2['default'],
				{ key: 'p' + i, onTap: this.selectDay.bind(this, dy, dm, d), className: 'day in-previous-month' },
				d
			));
		}

		var inThisMonth = displayYear === today.getFullYear() && displayMonth === today.getMonth();
		var inSelectedMonth = displayYear === this.state.year && displayMonth === this.state.month;
		for (i = 1; i <= daysInMonth; i++) {
			var cssClass = (0, _classnames2['default'])({
				'day': true,
				'is-today': inThisMonth && i === today.getDate(),
				'is-current': inSelectedMonth && i === this.state.day
			});
			days.push(_react2['default'].createElement(
				_reactTappable2['default'],
				{ key: i, onTap: this.selectDay.bind(this, displayYear, displayMonth, i), className: cssClass },
				i
			));
		}

		var c = startWeekDay + daysInMonth;
		for (i = 1; i <= 42 - c; i++) {
			dm = displayMonth + 1;
			dy = displayYear;
			if (dm === 12) {
				dm = 0;
				dy += 1;
			}
			days.push(_react2['default'].createElement(
				_reactTappable2['default'],
				{ key: 'n' + i, onTap: this.selectDay.bind(this, dy, dm, i), className: 'day in-next-month' },
				i
			));
		}

		return days;
	},

	renderMonths: function renderMonths() {
		var _this = this;

		return i18n.months.map(function (name, m) {
			return _react2['default'].createElement(
				_reactTappable2['default'],
				{ key: name + m, className: (0, _classnames2['default'])('month-name', { 'is-current': m === _this.state.displayMonth }),
					onTap: _this.selectMonth.bind(_this, m) },
				name
			);
		});
	},

	renderYears: function renderYears() {
		var years = [];
		for (var i = this.state.displayYearRangeStart - 1; i < this.state.displayYearRangeStart + 11; i++) {
			years.push(_react2['default'].createElement(
				_reactTappable2['default'],
				{ key: i, className: (0, _classnames2['default'])('year', { 'is-current': i === this.state.displayYear }),
					onTap: this.selectYear.bind(this, i) },
				i
			));
		}

		return years;
	},

	render: function render() {
		var topBarTitle = '';
		switch (this.state.mode) {
			case 'day':
				topBarTitle = i18n.formatYearMonth(this.state.displayYear, this.state.displayMonth);
				break;
			case 'month':
				topBarTitle = this.state.displayYearRangeStart + ' - ' + (this.state.displayYearRangeStart + 9);
				break;
		}

		return _react2['default'].createElement(
			'div',
			{ className: (0, _classnames2['default'])('date-picker', 'mode-' + this.state.mode) },
			_react2['default'].createElement(
				'div',
				{ className: 'top-bar' },
				_react2['default'].createElement(_reactTappable2['default'], { className: 'left-arrow', onTap: this.handleLeftArrowClick }),
				_react2['default'].createElement(_reactTappable2['default'], { className: 'right-arrow', onTap: this.handleRightArrowClick }),
				_react2['default'].createElement(
					_reactTappable2['default'],
					{ className: 'top-bar-title', onTap: this.handlerTopBarTitleClick },
					topBarTitle
				)
			),
			this.state.mode === 'day' && [_react2['default'].createElement(
				'div',
				{ key: 'weeknames', className: 'week-names-container' },
				this.renderWeeknames()
			), _react2['default'].createElement(
				'div',
				{ key: 'days', className: 'days-container' },
				this.renderDays()
			)],
			this.state.mode === 'month' && [_react2['default'].createElement(
				'div',
				{ key: 'years', className: 'years-container' },
				this.renderYears()
			), _react2['default'].createElement(
				'div',
				{ key: 'months', className: 'month-names-container' },
				this.renderMonths()
			)]
		);
	}
});
},{"classnames":4,"react":undefined,"react-tappable":undefined}],27:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _DatePicker = require('./DatePicker');

var _DatePicker2 = _interopRequireDefault(_DatePicker);

var _Popup = require('./Popup');

var _Popup2 = _interopRequireDefault(_Popup);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'DatePickerPopup',

	propTypes: {
		className: _react2['default'].PropTypes.string,
		visible: _react2['default'].PropTypes.bool
	},

	render: function render() {
		var className = (0, _classnames2['default'])('DatePicker', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className', 'visible');
		return _react2['default'].createElement(
			_Popup2['default'],
			{ className: className, visible: this.props.visible },
			_react2['default'].createElement(_DatePicker2['default'], props)
		);
	}
});
},{"./DatePicker":26,"./Popup":49,"blacklist":2,"classnames":4,"react":undefined}],28:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'FieldControl',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},
	render: function render() {
		var className = (0, _classnames2['default'])('FieldControl', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],29:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'FieldLabel',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},
	render: function render() {
		var className = (0, _classnames2['default'])('FieldLabel', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],30:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'Group',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string,
		hasTopGutter: _react2['default'].PropTypes.bool
	},
	render: function render() {
		var className = (0, _classnames2['default'])('Group', {
			'Group--has-gutter-top': this.props.hasTopGutter
		}, this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],31:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'GroupBody',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},
	render: function render() {
		var className = (0, _classnames2['default'])('Group__body', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],32:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'GroupFooter',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},
	render: function render() {
		var className = (0, _classnames2['default'])('Group__footer', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],33:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'GroupHeader',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},
	render: function render() {
		var className = (0, _classnames2['default'])('Group__header', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],34:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'GroupInner',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},
	render: function render() {
		var className = (0, _classnames2['default'])('Group__inner', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],35:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _Item = require('./Item');

var _Item2 = _interopRequireDefault(_Item);

var _ItemContent = require('./ItemContent');

var _ItemContent2 = _interopRequireDefault(_ItemContent);

var _ItemInner = require('./ItemInner');

var _ItemInner2 = _interopRequireDefault(_ItemInner);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

// Many input types DO NOT support setSelectionRange.
// Email will show an error on most desktop browsers but works on
// mobile safari + WKWebView, which is really what we care about
var SELECTABLE_INPUT_TYPES = {
	'email': true,
	'password': true,
	'search': true,
	'tel': true,
	'text': true,
	'url': true
};

module.exports = _react2['default'].createClass({
	displayName: 'Input',

	propTypes: {
		autoFocus: _react2['default'].PropTypes.bool,
		className: _react2['default'].PropTypes.string,
		children: _react2['default'].PropTypes.node,
		disabled: _react2['default'].PropTypes.bool
	},

	componentDidMount: function componentDidMount() {
		if (this.props.autoFocus) {
			this.moveCursorToEnd();
		}
	},

	moveCursorToEnd: function moveCursorToEnd() {
		var target = this.refs.focusTarget.getDOMNode();
		var endOfString = target.value.length;

		if (SELECTABLE_INPUT_TYPES.hasOwnProperty(target.type)) {
			target.focus();
			target.setSelectionRange(endOfString, endOfString);
		}
	},

	render: function render() {
		var inputProps = (0, _blacklist2['default'])(this.props, 'children', 'className');

		return _react2['default'].createElement(
			_Item2['default'],
			{ className: this.props.className, selectable: this.props.disabled, component: 'label' },
			_react2['default'].createElement(
				_ItemInner2['default'],
				null,
				_react2['default'].createElement(
					_ItemContent2['default'],
					{ component: 'label' },
					_react2['default'].createElement('input', _extends({ ref: 'focusTarget', className: 'field', type: 'text' }, inputProps))
				),
				this.props.children
			)
		);
	}
});
},{"./Item":36,"./ItemContent":37,"./ItemInner":38,"blacklist":2,"react":undefined}],36:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'Item',

	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		component: _react2['default'].PropTypes.any,
		className: _react2['default'].PropTypes.string,
		showDisclosureArrow: _react2['default'].PropTypes.bool
	},

	getDefaultProps: function getDefaultProps() {
		return {
			component: 'div'
		};
	},

	render: function render() {
		var componentClass = (0, _classnames2['default'])('Item', {
			'Item--has-disclosure-arrow': this.props.showDisclosureArrow
		}, this.props.className);

		var props = (0, _blacklist2['default'])(this.props, 'children', 'className', 'showDisclosureArrow');
		props.className = componentClass;

		return _react2['default'].createElement(this.props.component, props, this.props.children);
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],37:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'ItemContent',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},
	render: function render() {
		var className = (0, _classnames2['default'])('Item__content', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],38:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'ItemInner',

	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},

	render: function render() {
		var className = (0, _classnames2['default'])('Item__inner', this.props.className);

		return _react2['default'].createElement('div', _extends({ className: className }, this.props));
	}
});
},{"classnames":4,"react":undefined}],39:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'ItemMedia',
	propTypes: {
		avatar: _react2['default'].PropTypes.string,
		avatarInitials: _react2['default'].PropTypes.string,
		className: _react2['default'].PropTypes.string,
		icon: _react2['default'].PropTypes.string,
		thumbnail: _react2['default'].PropTypes.string
	},

	render: function render() {
		var className = (0, _classnames2['default'])({
			'Item__media': true,
			'Item__media--icon': this.props.icon,
			'Item__media--avatar': this.props.avatar || this.props.avatarInitials,
			'Item__media--thumbnail': this.props.thumbnail
		}, this.props.className);

		// media types
		var icon = this.props.icon ? _react2['default'].createElement('div', { className: 'Item__media__icon ' + this.props.icon }) : null;
		var avatar = this.props.avatar || this.props.avatarInitials ? _react2['default'].createElement(
			'div',
			{ className: 'Item__media__avatar' },
			this.props.avatar ? _react2['default'].createElement('img', { src: this.props.avatar }) : this.props.avatarInitials
		) : null;
		var thumbnail = this.props.thumbnail ? _react2['default'].createElement(
			'div',
			{ className: 'Item__media__thumbnail' },
			_react2['default'].createElement('img', { src: this.props.thumbnail })
		) : null;

		return _react2['default'].createElement(
			'div',
			{ className: className },
			icon,
			avatar,
			thumbnail
		);
	}
});
},{"classnames":4,"react":undefined}],40:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'ItemNote',
	propTypes: {
		className: _react2['default'].PropTypes.string,
		icon: _react2['default'].PropTypes.string,
		label: _react2['default'].PropTypes.string,
		type: _react2['default'].PropTypes.string
	},
	getDefaultProps: function getDefaultProps() {
		return {
			type: 'default'
		};
	},
	render: function render() {
		var className = (0, _classnames2['default'])('Item__note', 'Item__note--' + this.props.type, this.props.className);

		// elements
		var label = this.props.label ? _react2['default'].createElement(
			'div',
			{ className: 'Item__note__label' },
			this.props.label
		) : null;
		var icon = this.props.icon ? _react2['default'].createElement('div', { className: 'Item__note__icon ' + this.props.icon }) : null;

		return _react2['default'].createElement(
			'div',
			{ className: className },
			label,
			icon
		);
	}
});
},{"classnames":4,"react":undefined}],41:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'ItemSubTitle',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},
	render: function render() {
		var className = (0, _classnames2['default'])('Item__subtitle', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],42:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'ItemTitle',
	propTypes: {
		children: _react2['default'].PropTypes.node.isRequired,
		className: _react2['default'].PropTypes.string
	},
	render: function render() {
		var className = (0, _classnames2['default'])('Item__title', this.props.className);
		var props = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],43:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _FieldControl = require('./FieldControl');

var _FieldControl2 = _interopRequireDefault(_FieldControl);

var _Item = require('./Item');

var _Item2 = _interopRequireDefault(_Item);

var _ItemInner = require('./ItemInner');

var _ItemInner2 = _interopRequireDefault(_ItemInner);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

// Many input types DO NOT support setSelectionRange.
// Email will show an error on most desktop browsers but works on
// mobile safari + WKWebView, which is really what we care about
var SELECTABLE_INPUT_TYPES = {
	'email': true,
	'password': true,
	'search': true,
	'tel': true,
	'text': true,
	'url': true
};

module.exports = _react2['default'].createClass({
	displayName: 'LabelInput',

	propTypes: {
		alignTop: _react2['default'].PropTypes.bool,
		autoFocus: _react2['default'].PropTypes.bool,
		children: _react2['default'].PropTypes.node,
		className: _react2['default'].PropTypes.string,
		disabled: _react2['default'].PropTypes.bool,
		label: _react2['default'].PropTypes.string,
		readOnly: _react2['default'].PropTypes.bool,
		value: _react2['default'].PropTypes.string
	},

	componentDidMount: function componentDidMount() {
		if (this.props.autoFocus) {
			this.moveCursorToEnd();
		}
	},

	moveCursorToEnd: function moveCursorToEnd() {
		var target = this.refs.focusTarget.getDOMNode();
		var endOfString = target.value.length;

		if (SELECTABLE_INPUT_TYPES.hasOwnProperty(target.type)) {
			target.focus();
			target.setSelectionRange(endOfString, endOfString);
		}
	},

	render: function render() {
		var inputProps = (0, _blacklist2['default'])(this.props, 'alignTop', 'children', 'first', 'readOnly');
		var renderInput = this.props.readOnly ? _react2['default'].createElement(
			'div',
			{ className: 'field u-selectable' },
			this.props.value
		) : _react2['default'].createElement('input', _extends({ ref: 'focusTarget', className: 'field', type: 'text' }, inputProps));

		return _react2['default'].createElement(
			_Item2['default'],
			{ alignTop: this.props.alignTop, selectable: this.props.disabled, className: this.props.className, component: 'label' },
			_react2['default'].createElement(
				_ItemInner2['default'],
				null,
				_react2['default'].createElement(
					_reactTappable2['default'],
					{ onTap: this.moveCursorToEnd, className: 'FieldLabel' },
					this.props.label
				),
				_react2['default'].createElement(
					_FieldControl2['default'],
					null,
					renderInput,
					this.props.children
				)
			)
		);
	}
});
},{"./FieldControl":28,"./Item":36,"./ItemInner":38,"blacklist":2,"react":undefined,"react-tappable":undefined}],44:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _FieldControl = require('./FieldControl');

var _FieldControl2 = _interopRequireDefault(_FieldControl);

var _FieldLabel = require('./FieldLabel');

var _FieldLabel2 = _interopRequireDefault(_FieldLabel);

var _Item = require('./Item');

var _Item2 = _interopRequireDefault(_Item);

var _ItemInner = require('./ItemInner');

var _ItemInner2 = _interopRequireDefault(_ItemInner);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'LabelSelect',
	propTypes: {
		className: _react2['default'].PropTypes.string,
		disabled: _react2['default'].PropTypes.bool,
		label: _react2['default'].PropTypes.string,
		onChange: _react2['default'].PropTypes.func.isRequired,
		options: _react2['default'].PropTypes.array.isRequired,
		value: _react2['default'].PropTypes.oneOfType([_react2['default'].PropTypes.number, _react2['default'].PropTypes.string])
	},

	getDefaultProps: function getDefaultProps() {
		return {
			className: ''
		};
	},

	renderOptions: function renderOptions() {
		return this.props.options.map(function (op) {
			return _react2['default'].createElement(
				'option',
				{ key: 'option-' + op.value, value: op.value },
				op.label
			);
		});
	},

	render: function render() {
		return _react2['default'].createElement(
			_Item2['default'],
			{ className: this.props.className, component: 'label' },
			_react2['default'].createElement(
				_ItemInner2['default'],
				null,
				_react2['default'].createElement(
					_FieldLabel2['default'],
					null,
					this.props.label
				),
				_react2['default'].createElement(
					_FieldControl2['default'],
					null,
					_react2['default'].createElement(
						'select',
						{ disabled: this.props.disabled, value: this.props.value, onChange: this.props.onChange, className: 'select-field' },
						this.renderOptions()
					),
					_react2['default'].createElement(
						'div',
						{ className: 'select-field-indicator' },
						_react2['default'].createElement('div', { className: 'select-field-indicator-arrow' })
					)
				)
			)
		);
	}
});
},{"./FieldControl":28,"./FieldLabel":29,"./Item":36,"./ItemInner":38,"react":undefined}],45:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'LabelTextarea',

	propTypes: {
		children: _react2['default'].PropTypes.node,
		className: _react2['default'].PropTypes.string,
		disabled: _react2['default'].PropTypes.bool,
		first: _react2['default'].PropTypes.bool,
		label: _react2['default'].PropTypes.string,
		readOnly: _react2['default'].PropTypes.bool,
		value: _react2['default'].PropTypes.string
	},

	getDefaultProps: function getDefaultProps() {
		return {
			rows: 3
		};
	},

	render: function render() {
		var className = (0, _classnames2['default'])(this.props.className, 'list-item', 'field-item', 'align-top', {
			'is-first': this.props.first,
			'u-selectable': this.props.disabled
		});

		var props = (0, _blacklist2['default'])(this.props, 'children', 'className', 'disabled', 'first', 'label', 'readOnly');

		var renderInput = this.props.readOnly ? _react2['default'].createElement(
			'div',
			{ className: 'field u-selectable' },
			this.props.value
		) : _react2['default'].createElement('textarea', _extends({}, props, { className: 'field' }));

		return _react2['default'].createElement(
			'div',
			{ className: className },
			_react2['default'].createElement(
				'label',
				{ className: 'item-inner' },
				_react2['default'].createElement(
					'div',
					{ className: 'field-label' },
					this.props.label
				),
				_react2['default'].createElement(
					'div',
					{ className: 'field-control' },
					renderInput,
					this.props.children
				)
			)
		);
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],46:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _FieldControl = require('./FieldControl');

var _FieldControl2 = _interopRequireDefault(_FieldControl);

var _Item = require('./Item');

var _Item2 = _interopRequireDefault(_Item);

var _ItemInner = require('./ItemInner');

var _ItemInner2 = _interopRequireDefault(_ItemInner);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'LabelValue',

	propTypes: {
		alignTop: _react2['default'].PropTypes.bool,
		className: _react2['default'].PropTypes.string,
		label: _react2['default'].PropTypes.string,
		placeholder: _react2['default'].PropTypes.string,
		value: _react2['default'].PropTypes.string
	},

	render: function render() {
		return _react2['default'].createElement(
			_Item2['default'],
			{ alignTop: this.props.alignTop, className: this.props.className, component: 'label' },
			_react2['default'].createElement(
				_ItemInner2['default'],
				null,
				_react2['default'].createElement(
					'div',
					{ className: 'FieldLabel' },
					this.props.label
				),
				_react2['default'].createElement(
					_FieldControl2['default'],
					null,
					_react2['default'].createElement(
						'div',
						{ className: (0, _classnames2['default'])('field', this.props.value ? 'u-selectable' : 'field-placeholder') },
						this.props.value || this.props.placeholder
					)
				)
			)
		);
	}
});
},{"./FieldControl":28,"./Item":36,"./ItemInner":38,"classnames":4,"react":undefined}],47:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'ListHeader',

	propTypes: {
		className: _react2['default'].PropTypes.string,
		sticky: _react2['default'].PropTypes.bool
	},

	render: function render() {
		var className = (0, _classnames2['default'])('list-header', {
			'sticky': this.props.sticky
		}, this.props.className);

		var props = (0, _blacklist2['default'])(this.props, 'sticky');

		return _react2['default'].createElement('div', _extends({ className: className }, props));
	}
});
},{"blacklist":2,"classnames":4,"react":undefined}],48:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactAddonsCssTransitionGroup = require('react-addons-css-transition-group');

var _reactAddonsCssTransitionGroup2 = _interopRequireDefault(_reactAddonsCssTransitionGroup);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

var DIRECTIONS = {
	'reveal-from-right': -1,
	'show-from-left': -1,
	'show-from-right': 1,
	'reveal-from-left': 1
};

var defaultControllerState = {
	direction: 0,
	fade: false,
	leftArrow: false,
	leftButtonDisabled: false,
	leftIcon: '',
	leftLabel: '',
	leftAction: null,
	rightArrow: false,
	rightButtonDisabled: false,
	rightIcon: '',
	rightLabel: '',
	rightAction: null,
	title: ''
};

function newState(from) {
	var ns = _extends({}, defaultControllerState);
	if (from) _extends(ns, from);
	delete ns.name; // may leak from props
	return ns;
}

var NavigationBar = _react2['default'].createClass({
	displayName: 'NavigationBar',

	contextTypes: {
		app: _react2['default'].PropTypes.object
	},

	propTypes: {
		name: _react2['default'].PropTypes.string,
		className: _react2['default'].PropTypes.string
	},

	getInitialState: function getInitialState() {
		return newState(this.props);
	},

	componentDidMount: function componentDidMount() {
		if (this.props.name) {
			this.context.app.navigationBars[this.props.name] = this;
		}
	},

	componentWillUnmount: function componentWillUnmount() {
		if (this.props.name) {
			delete this.context.app.navigationBars[this.props.name];
		}
	},

	componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
		this.setState(newState(nextProps));
		if (nextProps.name !== this.props.name) {
			if (nextProps.name) {
				this.context.app.navigationBars[nextProps.name] = this;
			}
			if (this.props.name) {
				delete this.context.app.navigationBars[this.props.name];
			}
		}
	},

	update: function update(state) {
		// FIXME: what is happening here
		state = newState(state);
		this.setState(newState(state));
	},

	updateWithTransition: function updateWithTransition(state, transition) {
		state = newState(state);
		state.direction = DIRECTIONS[transition] || 0;

		if (transition === 'fade' || transition === 'fade-contract' || transition === 'fade-expand') {
			state.fade = true;
		}

		this.setState(state);
	},

	renderLeftButton: function renderLeftButton() {
		var className = (0, _classnames2['default'])('NavigationBarLeftButton', {
			'has-arrow': this.state.leftArrow
		});

		return _react2['default'].createElement(
			_reactTappable2['default'],
			{ onTap: this.state.leftAction, className: className, disabled: this.state.leftButtonDisabled, component: 'button' },
			this.renderLeftArrow(),
			this.renderLeftLabel()
		);
	},

	renderLeftArrow: function renderLeftArrow() {
		var transitionName = 'NavigationBarTransition-Instant';
		if (this.state.fade || this.state.direction) {
			transitionName = 'NavigationBarTransition-Fade';
		}
		var transitionDuration = transitionName === 'NavigationBarTransition-Instant' ? 50 : 500;

		var arrow = this.state.leftArrow ? _react2['default'].createElement('span', { className: 'NavigationBarLeftArrow' }) : null;

		return _react2['default'].createElement(
			_reactAddonsCssTransitionGroup2['default'],
			{ transitionName: transitionName, transitionEnterTimeout: transitionDuration, transitionLeaveTimeout: transitionDuration },
			arrow
		);
	},

	renderLeftLabel: function renderLeftLabel() {
		var transitionName = 'NavigationBarTransition-Instant';
		if (this.state.fade) {
			transitionName = 'NavigationBarTransition-Fade';
		} else if (this.state.direction > 0) {
			transitionName = 'NavigationBarTransition-Forwards';
		} else if (this.state.direction < 0) {
			transitionName = 'NavigationBarTransition-Backwards';
		}
		var transitionDuration = transitionName === 'NavigationBarTransition-Instant' ? 50 : 500;

		return _react2['default'].createElement(
			_reactAddonsCssTransitionGroup2['default'],
			{ transitionName: transitionName, transitionEnterTimeout: transitionDuration, transitionLeaveTimeout: transitionDuration },
			_react2['default'].createElement(
				'span',
				{ key: Date.now(), className: 'NavigationBarLeftLabel' },
				this.state.leftLabel
			)
		);
	},

	renderTitle: function renderTitle() {
		var title = this.state.title ? _react2['default'].createElement(
			'span',
			{ key: Date.now(), className: 'NavigationBarTitle' },
			this.state.title
		) : null;
		var transitionName = 'NavigationBarTransition-Instant';
		if (this.state.fade) {
			transitionName = 'NavigationBarTransition-Fade';
		} else if (this.state.direction > 0) {
			transitionName = 'NavigationBarTransition-Forwards';
		} else if (this.state.direction < 0) {
			transitionName = 'NavigationBarTransition-Backwards';
		}
		var transitionDuration = transitionName === 'NavigationBarTransition-Instant' ? 50 : 500;

		return _react2['default'].createElement(
			_reactAddonsCssTransitionGroup2['default'],
			{ transitionName: transitionName, transitionEnterTimeout: transitionDuration, transitionLeaveTimeout: transitionDuration },
			title
		);
	},

	renderRightButton: function renderRightButton() {
		var transitionName = 'NavigationBarTransition-Instant';
		if (this.state.fade || this.state.direction) {
			transitionName = 'NavigationBarTransition-Fade';
		}
		var transitionDuration = transitionName === 'NavigationBarTransition-Instant' ? 50 : 500;

		var button = this.state.rightIcon || this.state.rightLabel ? _react2['default'].createElement(
			_reactTappable2['default'],
			{ key: Date.now(), onTap: this.state.rightAction, className: 'NavigationBarRightButton', disabled: this.state.rightButtonDisabled, component: 'button' },
			this.renderRightLabel(),
			this.renderRightIcon()
		) : null;
		return _react2['default'].createElement(
			_reactAddonsCssTransitionGroup2['default'],
			{ transitionName: transitionName, transitionEnterTimeout: transitionDuration, transitionLeaveTimeout: transitionDuration },
			button
		);
	},

	renderRightIcon: function renderRightIcon() {
		if (!this.state.rightIcon) return null;

		var className = (0, _classnames2['default'])('NavigationBarRightIcon', this.state.rightIcon);

		return _react2['default'].createElement('span', { className: className });
	},

	renderRightLabel: function renderRightLabel() {
		return this.state.rightLabel ? _react2['default'].createElement(
			'span',
			{ key: Date.now(), className: 'NavigationBarRightLabel' },
			this.state.rightLabel
		) : null;
	},

	render: function render() {
		return _react2['default'].createElement(
			'div',
			{ className: (0, _classnames2['default'])('NavigationBar', this.props.className) },
			this.renderLeftButton(),
			this.renderTitle(),
			this.renderRightButton()
		);
	}
});

exports['default'] = NavigationBar;
module.exports = exports['default'];
},{"classnames":4,"react":undefined,"react-addons-css-transition-group":undefined,"react-tappable":undefined}],49:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactAddonsCssTransitionGroup = require('react-addons-css-transition-group');

var _reactAddonsCssTransitionGroup2 = _interopRequireDefault(_reactAddonsCssTransitionGroup);

module.exports = _react2['default'].createClass({
	displayName: 'Popup',

	propTypes: {
		children: _react2['default'].PropTypes.node,
		className: _react2['default'].PropTypes.string,
		visible: _react2['default'].PropTypes.bool
	},

	getDefaultProps: function getDefaultProps() {
		return {
			transition: 'none'
		};
	},

	renderBackdrop: function renderBackdrop() {
		if (!this.props.visible) return null;
		return _react2['default'].createElement('div', { className: 'Popup-backdrop' });
	},

	renderDialog: function renderDialog() {
		if (!this.props.visible) return null;

		// Set classnames
		var dialogClassName = (0, _classnames2['default'])('Popup-dialog', this.props.className);

		return _react2['default'].createElement(
			'div',
			{ className: dialogClassName },
			this.props.children
		);
	},

	render: function render() {
		return _react2['default'].createElement(
			'div',
			{ className: 'Popup' },
			_react2['default'].createElement(
				_reactAddonsCssTransitionGroup2['default'],
				{ transitionName: 'Popup-dialog', transitionEnterTimeout: 300, transitionLeaveTimeout: 300, component: 'div' },
				this.renderDialog()
			),
			_react2['default'].createElement(
				_reactAddonsCssTransitionGroup2['default'],
				{ transitionName: 'Popup-background', transitionEnterTimeout: 300, transitionLeaveTimeout: 300, component: 'div' },
				this.renderBackdrop()
			)
		);
	}
});
},{"classnames":4,"react":undefined,"react-addons-css-transition-group":undefined}],50:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'PopupIcon',
	propTypes: {
		name: _react2['default'].PropTypes.string,
		type: _react2['default'].PropTypes.oneOf(['default', 'muted', 'primary', 'success', 'warning', 'danger']),
		spinning: _react2['default'].PropTypes.bool
	},

	render: function render() {
		var className = (0, _classnames2['default'])('PopupIcon', {
			'is-spinning': this.props.spinning
		}, this.props.name, this.props.type);

		return _react2['default'].createElement('div', { className: className });
	}
});
},{"classnames":4,"react":undefined}],51:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _Item = require('./Item');

var _Item2 = _interopRequireDefault(_Item);

var _ItemInner = require('./ItemInner');

var _ItemInner2 = _interopRequireDefault(_ItemInner);

var _ItemNote = require('./ItemNote');

var _ItemNote2 = _interopRequireDefault(_ItemNote);

var _ItemTitle = require('./ItemTitle');

var _ItemTitle2 = _interopRequireDefault(_ItemTitle);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

module.exports = _react2['default'].createClass({
	displayName: 'RadioList',

	propTypes: {
		options: _react2['default'].PropTypes.array.isRequired,
		value: _react2['default'].PropTypes.oneOfType([_react2['default'].PropTypes.string, _react2['default'].PropTypes.number]),
		icon: _react2['default'].PropTypes.string,
		onChange: _react2['default'].PropTypes.func
	},

	onChange: function onChange(value) {
		this.props.onChange(value);
	},

	render: function render() {
		var self = this;
		var options = this.props.options.map(function (op, i) {
			var iconClassname = (0, _classnames2['default'])('item-icon primary', op.icon);
			var checkMark = op.value === self.props.value ? _react2['default'].createElement(_ItemNote2['default'], { type: 'primary', icon: 'ion-checkmark' }) : null;
			var icon = op.icon ? _react2['default'].createElement(
				'div',
				{ className: 'item-media' },
				_react2['default'].createElement('span', { className: iconClassname })
			) : null;

			function onChange() {
				self.onChange(op.value);
			}

			return _react2['default'].createElement(
				_reactTappable2['default'],
				{ key: 'option-' + i, onTap: onChange },
				_react2['default'].createElement(
					_Item2['default'],
					{ key: 'option-' + i, onTap: onChange },
					icon,
					_react2['default'].createElement(
						_ItemInner2['default'],
						null,
						_react2['default'].createElement(
							_ItemTitle2['default'],
							null,
							op.label
						),
						checkMark
					)
				)
			);
		});

		return _react2['default'].createElement(
			'div',
			null,
			options
		);
	}
});
},{"./Item":36,"./ItemInner":38,"./ItemNote":40,"./ItemTitle":42,"classnames":4,"react":undefined,"react-tappable":undefined}],52:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

module.exports = _react2['default'].createClass({
	displayName: 'SearchField',
	propTypes: {
		className: _react2['default'].PropTypes.string,
		onCancel: _react2['default'].PropTypes.func,
		onChange: _react2['default'].PropTypes.func,
		onClear: _react2['default'].PropTypes.func,
		onSubmit: _react2['default'].PropTypes.func,
		placeholder: _react2['default'].PropTypes.string,
		type: _react2['default'].PropTypes.oneOf(['default', 'dark']),
		value: _react2['default'].PropTypes.string
	},

	getInitialState: function getInitialState() {
		return {
			isFocused: false
		};
	},

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'default',
			value: ''
		};
	},

	handleClear: function handleClear() {
		this.refs.input.getDOMNode().focus();
		this.props.onClear();
	},

	handleCancel: function handleCancel() {
		this.refs.input.getDOMNode().blur();
		this.props.onCancel();
	},

	handleChange: function handleChange(e) {
		this.props.onChange(e.target.value);
	},

	handleBlur: function handleBlur(e) {
		this.setState({
			isFocused: false
		});
	},

	handleFocus: function handleFocus(e) {
		this.setState({
			isFocused: true
		});
	},

	handleSubmit: function handleSubmit(e) {
		e.preventDefault();

		var input = this.refs.input.getDOMNode();

		input.blur();
		this.props.onSubmit(input.value);
	},

	renderClear: function renderClear() {
		if (!this.props.value.length) return;
		return _react2['default'].createElement(_reactTappable2['default'], { className: 'SearchField__icon SearchField__icon--clear', onTap: this.handleClear });
	},

	renderCancel: function renderCancel() {
		var className = (0, _classnames2['default'])('SearchField__cancel', {
			'is-visible': this.state.isFocused || this.props.value
		});
		return _react2['default'].createElement(
			_reactTappable2['default'],
			{ className: className, onTap: this.handleCancel },
			'Cancel'
		);
	},

	render: function render() {
		var className = (0, _classnames2['default'])('SearchField', 'SearchField--' + this.props.type, {
			'is-focused': this.state.isFocused,
			'has-value': this.props.value
		}, this.props.className);

		return _react2['default'].createElement(
			'form',
			{ onSubmit: this.handleSubmit, action: 'javascript:;', className: className },
			_react2['default'].createElement(
				'label',
				{ className: 'SearchField__field' },
				_react2['default'].createElement(
					'div',
					{ className: 'SearchField__placeholder' },
					_react2['default'].createElement('span', { className: 'SearchField__icon SearchField__icon--search' }),
					!this.props.value.length ? this.props.placeholder : null
				),
				_react2['default'].createElement('input', { type: 'search', ref: 'input', value: this.props.value, onChange: this.handleChange, onFocus: this.handleFocus, onBlur: this.handleBlur, className: 'SearchField__input' }),
				this.renderClear()
			),
			this.renderCancel()
		);
	}
});
},{"classnames":4,"react":undefined,"react-tappable":undefined}],53:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

module.exports = _react2['default'].createClass({
	displayName: 'SegmentedControl',

	propTypes: {
		className: _react2['default'].PropTypes.string,
		equalWidthSegments: _react2['default'].PropTypes.bool,
		isInline: _react2['default'].PropTypes.bool,
		hasGutter: _react2['default'].PropTypes.bool,
		onChange: _react2['default'].PropTypes.func.isRequired,
		options: _react2['default'].PropTypes.array.isRequired,
		type: _react2['default'].PropTypes.string,
		value: _react2['default'].PropTypes.string
	},

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'primary'
		};
	},

	onChange: function onChange(value) {
		this.props.onChange(value);
	},

	render: function render() {
		var componentClassName = (0, _classnames2['default'])('SegmentedControl', 'SegmentedControl--' + this.props.type, {
			'SegmentedControl--inline': this.props.isInline,
			'SegmentedControl--has-gutter': this.props.hasGutter,
			'SegmentedControl--equal-widths': this.props.equalWidthSegments
		}, this.props.className);
		var self = this;

		var options = this.props.options.map(function (op) {
			function onChange() {
				self.onChange(op.value);
			}

			var itemClassName = (0, _classnames2['default'])('SegmentedControl__item', {
				'is-selected': op.value === self.props.value
			});

			return _react2['default'].createElement(
				_reactTappable2['default'],
				{ key: 'option-' + op.value, onTap: onChange, className: itemClassName },
				op.label
			);
		});

		return _react2['default'].createElement(
			'div',
			{ className: componentClassName },
			options
		);
	}
});
},{"classnames":4,"react":undefined,"react-tappable":undefined}],54:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

module.exports = _react2['default'].createClass({
	displayName: 'Switch',

	propTypes: {
		disabled: _react2['default'].PropTypes.bool,
		on: _react2['default'].PropTypes.bool,
		onTap: _react2['default'].PropTypes.func,
		type: _react2['default'].PropTypes.string
	},

	getDefaultProps: function getDefaultProps() {
		return {
			type: 'default'
		};
	},

	render: function render() {
		var className = (0, _classnames2['default'])('Switch', 'Switch--' + this.props.type, {
			'is-disabled': this.props.disabled,
			'is-on': this.props.on
		});

		return _react2['default'].createElement(
			_reactTappable2['default'],
			{ onTap: this.props.onTap, className: className, component: 'label' },
			_react2['default'].createElement(
				'div',
				{ className: 'Switch__track' },
				_react2['default'].createElement('div', { className: 'Switch__handle' })
			)
		);
	}
});
},{"classnames":4,"react":undefined,"react-tappable":undefined}],55:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

var Navigator = _react2['default'].createClass({
	displayName: 'Navigator',

	propTypes: {
		className: _react2['default'].PropTypes.string
	},

	render: function render() {
		var className = (0, _classnames2['default'])('Tabs-Navigator', this.props.className);
		var otherProps = (0, _blacklist2['default'])(this.props, 'className');

		return _react2['default'].createElement('div', _extends({ className: className }, otherProps));
	}
});

exports.Navigator = Navigator;
var Tab = _react2['default'].createClass({
	displayName: 'Tab',

	propTypes: {
		selected: _react2['default'].PropTypes.bool
	},

	render: function render() {
		var className = (0, _classnames2['default'])('Tabs-Tab', { 'is-selected': this.props.selected });
		var otherProps = (0, _blacklist2['default'])(this.props, 'selected');

		return _react2['default'].createElement(_reactTappable2['default'], _extends({ className: className }, otherProps));
	}
});

exports.Tab = Tab;
var Label = _react2['default'].createClass({
	displayName: 'Label',

	render: function render() {
		return _react2['default'].createElement('div', _extends({ className: 'Tabs-Label' }, this.props));
	}
});
exports.Label = Label;
},{"blacklist":2,"classnames":4,"react":undefined,"react-tappable":undefined}],56:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _blacklist = require('blacklist');

var _blacklist2 = _interopRequireDefault(_blacklist);

var _Item = require('./Item');

var _Item2 = _interopRequireDefault(_Item);

var _ItemContent = require('./ItemContent');

var _ItemContent2 = _interopRequireDefault(_ItemContent);

var _ItemInner = require('./ItemInner');

var _ItemInner2 = _interopRequireDefault(_ItemInner);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'Input',
	propTypes: {
		className: _react2['default'].PropTypes.string,
		children: _react2['default'].PropTypes.node,
		disabled: _react2['default'].PropTypes.bool
	},

	render: function render() {
		var inputProps = (0, _blacklist2['default'])(this.props, 'children', 'className');

		return _react2['default'].createElement(
			_Item2['default'],
			{ selectable: this.props.disabled, className: this.props.className, component: 'label' },
			_react2['default'].createElement(
				_ItemInner2['default'],
				null,
				_react2['default'].createElement(
					_ItemContent2['default'],
					{ component: 'label' },
					_react2['default'].createElement('textarea', _extends({ className: 'field', rows: 3 }, inputProps))
				),
				this.props.children
			)
		);
	}
});
},{"./Item":36,"./ItemContent":37,"./ItemInner":38,"blacklist":2,"react":undefined}],57:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
var Alertbar = require('./Alertbar');
exports.Alertbar = Alertbar;
var Button = require('./Button');
exports.Button = Button;
var ButtonGroup = require('./ButtonGroup');
exports.ButtonGroup = ButtonGroup;
var DatePicker = require('./DatePicker');
exports.DatePicker = DatePicker;
var DatePickerPopup = require('./DatePickerPopup');
exports.DatePickerPopup = DatePickerPopup;
var FieldControl = require('./FieldControl');
exports.FieldControl = FieldControl;
var FieldLabel = require('./FieldLabel');
exports.FieldLabel = FieldLabel;
var Group = require('./Group');
exports.Group = Group;
var GroupBody = require('./GroupBody');
exports.GroupBody = GroupBody;
var GroupFooter = require('./GroupFooter');
exports.GroupFooter = GroupFooter;
var GroupHeader = require('./GroupHeader');
exports.GroupHeader = GroupHeader;
var GroupInner = require('./GroupInner');
exports.GroupInner = GroupInner;
var Item = require('./Item');
exports.Item = Item;
var ItemContent = require('./ItemContent');
exports.ItemContent = ItemContent;
var ItemInner = require('./ItemInner');
exports.ItemInner = ItemInner;
var ItemMedia = require('./ItemMedia');
exports.ItemMedia = ItemMedia;
var ItemNote = require('./ItemNote');
exports.ItemNote = ItemNote;
var ItemSubTitle = require('./ItemSubTitle');
exports.ItemSubTitle = ItemSubTitle;
var ItemTitle = require('./ItemTitle');
exports.ItemTitle = ItemTitle;
var LabelInput = require('./LabelInput');
exports.LabelInput = LabelInput;
var LabelSelect = require('./LabelSelect');
exports.LabelSelect = LabelSelect;
var LabelTextarea = require('./LabelTextarea');
exports.LabelTextarea = LabelTextarea;
var LabelValue = require('./LabelValue');
exports.LabelValue = LabelValue;
var ListHeader = require('./ListHeader');
exports.ListHeader = ListHeader;
var NavigationBar = require('./NavigationBar');
exports.NavigationBar = NavigationBar;
var Popup = require('./Popup');
exports.Popup = Popup;
var PopupIcon = require('./PopupIcon');
exports.PopupIcon = PopupIcon;
var RadioList = require('./RadioList');
exports.RadioList = RadioList;
var SearchField = require('./SearchField');
exports.SearchField = SearchField;
var SegmentedControl = require('./SegmentedControl');
exports.SegmentedControl = SegmentedControl;
var Switch = require('./Switch');
exports.Switch = Switch;
var Tabs = require('./Tabs');
exports.Tabs = Tabs;
var Textarea = require('./Textarea');

exports.Textarea = Textarea;
// depends on above
var Input = require('./Input');
exports.Input = Input;
},{"./Alertbar":23,"./Button":24,"./ButtonGroup":25,"./DatePicker":26,"./DatePickerPopup":27,"./FieldControl":28,"./FieldLabel":29,"./Group":30,"./GroupBody":31,"./GroupFooter":32,"./GroupHeader":33,"./GroupInner":34,"./Input":35,"./Item":36,"./ItemContent":37,"./ItemInner":38,"./ItemMedia":39,"./ItemNote":40,"./ItemSubTitle":41,"./ItemTitle":42,"./LabelInput":43,"./LabelSelect":44,"./LabelTextarea":45,"./LabelValue":46,"./ListHeader":47,"./NavigationBar":48,"./Popup":49,"./PopupIcon":50,"./RadioList":51,"./SearchField":52,"./SegmentedControl":53,"./Switch":54,"./Tabs":55,"./Textarea":56}],58:[function(require,module,exports){

exports = module.exports = trim;

function trim(str){
  return str.replace(/^\s*|\s*$/g, '');
}

exports.left = function(str){
  return str.replace(/^\s*/, '');
};

exports.right = function(str){
  return str.replace(/\s*$/, '');
};

},{}],59:[function(require,module,exports){
(function (process){
/**
 * Tween.js - Licensed under the MIT license
 * https://github.com/tweenjs/tween.js
 * ----------------------------------------------
 *
 * See https://github.com/tweenjs/tween.js/graphs/contributors for the full list of contributors.
 * Thank you all, you're awesome!
 */

var TWEEN = TWEEN || (function () {

	var _tweens = [];

	return {

		getAll: function () {

			return _tweens;

		},

		removeAll: function () {

			_tweens = [];

		},

		add: function (tween) {

			_tweens.push(tween);

		},

		remove: function (tween) {

			var i = _tweens.indexOf(tween);

			if (i !== -1) {
				_tweens.splice(i, 1);
			}

		},

		update: function (time, preserve) {

			if (_tweens.length === 0) {
				return false;
			}

			var i = 0;

			time = time !== undefined ? time : TWEEN.now();

			while (i < _tweens.length) {

				if (_tweens[i].update(time) || preserve) {
					i++;
				} else {
					_tweens.splice(i, 1);
				}

			}

			return true;

		}
	};

})();


// Include a performance.now polyfill.
// In node.js, use process.hrtime.
if (typeof (window) === 'undefined' && typeof (process) !== 'undefined') {
	TWEEN.now = function () {
		var time = process.hrtime();

		// Convert [seconds, nanoseconds] to milliseconds.
		return time[0] * 1000 + time[1] / 1000000;
	};
}
// In a browser, use window.performance.now if it is available.
else if (typeof (window) !== 'undefined' &&
         window.performance !== undefined &&
		 window.performance.now !== undefined) {
	// This must be bound, because directly assigning this function
	// leads to an invocation exception in Chrome.
	TWEEN.now = window.performance.now.bind(window.performance);
}
// Use Date.now if it is available.
else if (Date.now !== undefined) {
	TWEEN.now = Date.now;
}
// Otherwise, use 'new Date().getTime()'.
else {
	TWEEN.now = function () {
		return new Date().getTime();
	};
}


TWEEN.Tween = function (object) {

	var _object = object;
	var _valuesStart = {};
	var _valuesEnd = {};
	var _valuesStartRepeat = {};
	var _duration = 1000;
	var _repeat = 0;
	var _repeatDelayTime;
	var _yoyo = false;
	var _isPlaying = false;
	var _reversed = false;
	var _delayTime = 0;
	var _startTime = null;
	var _easingFunction = TWEEN.Easing.Linear.None;
	var _interpolationFunction = TWEEN.Interpolation.Linear;
	var _chainedTweens = [];
	var _onStartCallback = null;
	var _onStartCallbackFired = false;
	var _onUpdateCallback = null;
	var _onCompleteCallback = null;
	var _onStopCallback = null;

	this.to = function (properties, duration) {

		_valuesEnd = properties;

		if (duration !== undefined) {
			_duration = duration;
		}

		return this;

	};

	this.start = function (time) {

		TWEEN.add(this);

		_isPlaying = true;

		_onStartCallbackFired = false;

		_startTime = time !== undefined ? time : TWEEN.now();
		_startTime += _delayTime;

		for (var property in _valuesEnd) {

			// Check if an Array was provided as property value
			if (_valuesEnd[property] instanceof Array) {

				if (_valuesEnd[property].length === 0) {
					continue;
				}

				// Create a local copy of the Array with the start value at the front
				_valuesEnd[property] = [_object[property]].concat(_valuesEnd[property]);

			}

			// If `to()` specifies a property that doesn't exist in the source object,
			// we should not set that property in the object
			if (_object[property] === undefined) {
				continue;
			}

			// Save the starting value.
			_valuesStart[property] = _object[property];

			if ((_valuesStart[property] instanceof Array) === false) {
				_valuesStart[property] *= 1.0; // Ensures we're using numbers, not strings
			}

			_valuesStartRepeat[property] = _valuesStart[property] || 0;

		}

		return this;

	};

	this.stop = function () {

		if (!_isPlaying) {
			return this;
		}

		TWEEN.remove(this);
		_isPlaying = false;

		if (_onStopCallback !== null) {
			_onStopCallback.call(_object, _object);
		}

		this.stopChainedTweens();
		return this;

	};

	this.end = function () {

		this.update(_startTime + _duration);
		return this;

	};

	this.stopChainedTweens = function () {

		for (var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++) {
			_chainedTweens[i].stop();
		}

	};

	this.delay = function (amount) {

		_delayTime = amount;
		return this;

	};

	this.repeat = function (times) {

		_repeat = times;
		return this;

	};

	this.repeatDelay = function (amount) {

		_repeatDelayTime = amount;
		return this;

	};

	this.yoyo = function (yoyo) {

		_yoyo = yoyo;
		return this;

	};


	this.easing = function (easing) {

		_easingFunction = easing;
		return this;

	};

	this.interpolation = function (interpolation) {

		_interpolationFunction = interpolation;
		return this;

	};

	this.chain = function () {

		_chainedTweens = arguments;
		return this;

	};

	this.onStart = function (callback) {

		_onStartCallback = callback;
		return this;

	};

	this.onUpdate = function (callback) {

		_onUpdateCallback = callback;
		return this;

	};

	this.onComplete = function (callback) {

		_onCompleteCallback = callback;
		return this;

	};

	this.onStop = function (callback) {

		_onStopCallback = callback;
		return this;

	};

	this.update = function (time) {

		var property;
		var elapsed;
		var value;

		if (time < _startTime) {
			return true;
		}

		if (_onStartCallbackFired === false) {

			if (_onStartCallback !== null) {
				_onStartCallback.call(_object, _object);
			}

			_onStartCallbackFired = true;
		}

		elapsed = (time - _startTime) / _duration;
		elapsed = elapsed > 1 ? 1 : elapsed;

		value = _easingFunction(elapsed);

		for (property in _valuesEnd) {

			// Don't update properties that do not exist in the source object
			if (_valuesStart[property] === undefined) {
				continue;
			}

			var start = _valuesStart[property] || 0;
			var end = _valuesEnd[property];

			if (end instanceof Array) {

				_object[property] = _interpolationFunction(end, value);

			} else {

				// Parses relative end values with start as base (e.g.: +10, -3)
				if (typeof (end) === 'string') {

					if (end.charAt(0) === '+' || end.charAt(0) === '-') {
						end = start + parseFloat(end);
					} else {
						end = parseFloat(end);
					}
				}

				// Protect against non numeric properties.
				if (typeof (end) === 'number') {
					_object[property] = start + (end - start) * value;
				}

			}

		}

		if (_onUpdateCallback !== null) {
			_onUpdateCallback.call(_object, value);
		}

		if (elapsed === 1) {

			if (_repeat > 0) {

				if (isFinite(_repeat)) {
					_repeat--;
				}

				// Reassign starting values, restart by making startTime = now
				for (property in _valuesStartRepeat) {

					if (typeof (_valuesEnd[property]) === 'string') {
						_valuesStartRepeat[property] = _valuesStartRepeat[property] + parseFloat(_valuesEnd[property]);
					}

					if (_yoyo) {
						var tmp = _valuesStartRepeat[property];

						_valuesStartRepeat[property] = _valuesEnd[property];
						_valuesEnd[property] = tmp;
					}

					_valuesStart[property] = _valuesStartRepeat[property];

				}

				if (_yoyo) {
					_reversed = !_reversed;
				}

				if (_repeatDelayTime !== undefined) {
					_startTime = time + _repeatDelayTime;
				} else {
					_startTime = time + _delayTime;
				}

				return true;

			} else {

				if (_onCompleteCallback !== null) {

					_onCompleteCallback.call(_object, _object);
				}

				for (var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++) {
					// Make the chained tweens start exactly at the time they should,
					// even if the `update()` method was called way past the duration of the tween
					_chainedTweens[i].start(_startTime + _duration);
				}

				return false;

			}

		}

		return true;

	};

};


TWEEN.Easing = {

	Linear: {

		None: function (k) {

			return k;

		}

	},

	Quadratic: {

		In: function (k) {

			return k * k;

		},

		Out: function (k) {

			return k * (2 - k);

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k;
			}

			return - 0.5 * (--k * (k - 2) - 1);

		}

	},

	Cubic: {

		In: function (k) {

			return k * k * k;

		},

		Out: function (k) {

			return --k * k * k + 1;

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k + 2);

		}

	},

	Quartic: {

		In: function (k) {

			return k * k * k * k;

		},

		Out: function (k) {

			return 1 - (--k * k * k * k);

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k;
			}

			return - 0.5 * ((k -= 2) * k * k * k - 2);

		}

	},

	Quintic: {

		In: function (k) {

			return k * k * k * k * k;

		},

		Out: function (k) {

			return --k * k * k * k * k + 1;

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k * k * k + 2);

		}

	},

	Sinusoidal: {

		In: function (k) {

			return 1 - Math.cos(k * Math.PI / 2);

		},

		Out: function (k) {

			return Math.sin(k * Math.PI / 2);

		},

		InOut: function (k) {

			return 0.5 * (1 - Math.cos(Math.PI * k));

		}

	},

	Exponential: {

		In: function (k) {

			return k === 0 ? 0 : Math.pow(1024, k - 1);

		},

		Out: function (k) {

			return k === 1 ? 1 : 1 - Math.pow(2, - 10 * k);

		},

		InOut: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if ((k *= 2) < 1) {
				return 0.5 * Math.pow(1024, k - 1);
			}

			return 0.5 * (- Math.pow(2, - 10 * (k - 1)) + 2);

		}

	},

	Circular: {

		In: function (k) {

			return 1 - Math.sqrt(1 - k * k);

		},

		Out: function (k) {

			return Math.sqrt(1 - (--k * k));

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return - 0.5 * (Math.sqrt(1 - k * k) - 1);
			}

			return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);

		}

	},

	Elastic: {

		In: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			return -Math.pow(2, 10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI);

		},

		Out: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			return Math.pow(2, -10 * k) * Math.sin((k - 0.1) * 5 * Math.PI) + 1;

		},

		InOut: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			k *= 2;

			if (k < 1) {
				return -0.5 * Math.pow(2, 10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI);
			}

			return 0.5 * Math.pow(2, -10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI) + 1;

		}

	},

	Back: {

		In: function (k) {

			var s = 1.70158;

			return k * k * ((s + 1) * k - s);

		},

		Out: function (k) {

			var s = 1.70158;

			return --k * k * ((s + 1) * k + s) + 1;

		},

		InOut: function (k) {

			var s = 1.70158 * 1.525;

			if ((k *= 2) < 1) {
				return 0.5 * (k * k * ((s + 1) * k - s));
			}

			return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);

		}

	},

	Bounce: {

		In: function (k) {

			return 1 - TWEEN.Easing.Bounce.Out(1 - k);

		},

		Out: function (k) {

			if (k < (1 / 2.75)) {
				return 7.5625 * k * k;
			} else if (k < (2 / 2.75)) {
				return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
			} else if (k < (2.5 / 2.75)) {
				return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
			} else {
				return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
			}

		},

		InOut: function (k) {

			if (k < 0.5) {
				return TWEEN.Easing.Bounce.In(k * 2) * 0.5;
			}

			return TWEEN.Easing.Bounce.Out(k * 2 - 1) * 0.5 + 0.5;

		}

	}

};

TWEEN.Interpolation = {

	Linear: function (v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.Linear;

		if (k < 0) {
			return fn(v[0], v[1], f);
		}

		if (k > 1) {
			return fn(v[m], v[m - 1], m - f);
		}

		return fn(v[i], v[i + 1 > m ? m : i + 1], f - i);

	},

	Bezier: function (v, k) {

		var b = 0;
		var n = v.length - 1;
		var pw = Math.pow;
		var bn = TWEEN.Interpolation.Utils.Bernstein;

		for (var i = 0; i <= n; i++) {
			b += pw(1 - k, n - i) * pw(k, i) * v[i] * bn(n, i);
		}

		return b;

	},

	CatmullRom: function (v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.CatmullRom;

		if (v[0] === v[m]) {

			if (k < 0) {
				i = Math.floor(f = m * (1 + k));
			}

			return fn(v[(i - 1 + m) % m], v[i], v[(i + 1) % m], v[(i + 2) % m], f - i);

		} else {

			if (k < 0) {
				return v[0] - (fn(v[0], v[0], v[1], v[1], -f) - v[0]);
			}

			if (k > 1) {
				return v[m] - (fn(v[m], v[m], v[m - 1], v[m - 1], f - m) - v[m]);
			}

			return fn(v[i ? i - 1 : 0], v[i], v[m < i + 1 ? m : i + 1], v[m < i + 2 ? m : i + 2], f - i);

		}

	},

	Utils: {

		Linear: function (p0, p1, t) {

			return (p1 - p0) * t + p0;

		},

		Bernstein: function (n, i) {

			var fc = TWEEN.Interpolation.Utils.Factorial;

			return fc(n) / fc(i) / fc(n - i);

		},

		Factorial: (function () {

			var a = [1];

			return function (n) {

				var s = 1;

				if (a[n]) {
					return a[n];
				}

				for (var i = n; i > 1; i--) {
					s *= i;
				}

				a[n] = s;
				return s;

			};

		})(),

		CatmullRom: function (p0, p1, p2, p3, t) {

			var v0 = (p2 - p0) * 0.5;
			var v1 = (p3 - p1) * 0.5;
			var t2 = t * t;
			var t3 = t * t2;

			return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (- 3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;

		}

	}

};

// UMD (Universal Module Definition)
(function (root) {

	if (typeof define === 'function' && define.amd) {

		// AMD
		define([], function () {
			return TWEEN;
		});

	} else if (typeof module !== 'undefined' && typeof exports === 'object') {

		// Node.js
		module.exports = TWEEN;

	} else if (root !== undefined) {

		// Global variable
		root.TWEEN = TWEEN;

	}

})(this);

}).call(this,require('_process'))

},{"_process":3}],60:[function(require,module,exports){
"use strict";
var window = require("global/window")
var isFunction = require("is-function")
var parseHeaders = require("parse-headers")
var xtend = require("xtend")

module.exports = createXHR
createXHR.XMLHttpRequest = window.XMLHttpRequest || noop
createXHR.XDomainRequest = "withCredentials" in (new createXHR.XMLHttpRequest()) ? createXHR.XMLHttpRequest : window.XDomainRequest

forEachArray(["get", "put", "post", "patch", "head", "delete"], function(method) {
    createXHR[method === "delete" ? "del" : method] = function(uri, options, callback) {
        options = initParams(uri, options, callback)
        options.method = method.toUpperCase()
        return _createXHR(options)
    }
})

function forEachArray(array, iterator) {
    for (var i = 0; i < array.length; i++) {
        iterator(array[i])
    }
}

function isEmpty(obj){
    for(var i in obj){
        if(obj.hasOwnProperty(i)) return false
    }
    return true
}

function initParams(uri, options, callback) {
    var params = uri

    if (isFunction(options)) {
        callback = options
        if (typeof uri === "string") {
            params = {uri:uri}
        }
    } else {
        params = xtend(options, {uri: uri})
    }

    params.callback = callback
    return params
}

function createXHR(uri, options, callback) {
    options = initParams(uri, options, callback)
    return _createXHR(options)
}

function _createXHR(options) {
    if(typeof options.callback === "undefined"){
        throw new Error("callback argument missing")
    }

    var called = false
    var callback = function cbOnce(err, response, body){
        if(!called){
            called = true
            options.callback(err, response, body)
        }
    }

    function readystatechange() {
        if (xhr.readyState === 4) {
            setTimeout(loadFunc, 0)
        }
    }

    function getBody() {
        // Chrome with requestType=blob throws errors arround when even testing access to responseText
        var body = undefined

        if (xhr.response) {
            body = xhr.response
        } else {
            body = xhr.responseText || getXml(xhr)
        }

        if (isJson) {
            try {
                body = JSON.parse(body)
            } catch (e) {}
        }

        return body
    }

    function errorFunc(evt) {
        clearTimeout(timeoutTimer)
        if(!(evt instanceof Error)){
            evt = new Error("" + (evt || "Unknown XMLHttpRequest Error") )
        }
        evt.statusCode = 0
        return callback(evt, failureResponse)
    }

    // will load the data & process the response in a special response object
    function loadFunc() {
        if (aborted) return
        var status
        clearTimeout(timeoutTimer)
        if(options.useXDR && xhr.status===undefined) {
            //IE8 CORS GET successful response doesn't have a status field, but body is fine
            status = 200
        } else {
            status = (xhr.status === 1223 ? 204 : xhr.status)
        }
        var response = failureResponse
        var err = null

        if (status !== 0){
            response = {
                body: getBody(),
                statusCode: status,
                method: method,
                headers: {},
                url: uri,
                rawRequest: xhr
            }
            if(xhr.getAllResponseHeaders){ //remember xhr can in fact be XDR for CORS in IE
                response.headers = parseHeaders(xhr.getAllResponseHeaders())
            }
        } else {
            err = new Error("Internal XMLHttpRequest Error")
        }
        return callback(err, response, response.body)
    }

    var xhr = options.xhr || null

    if (!xhr) {
        if (options.cors || options.useXDR) {
            xhr = new createXHR.XDomainRequest()
        }else{
            xhr = new createXHR.XMLHttpRequest()
        }
    }

    var key
    var aborted
    var uri = xhr.url = options.uri || options.url
    var method = xhr.method = options.method || "GET"
    var body = options.body || options.data
    var headers = xhr.headers = options.headers || {}
    var sync = !!options.sync
    var isJson = false
    var timeoutTimer
    var failureResponse = {
        body: undefined,
        headers: {},
        statusCode: 0,
        method: method,
        url: uri,
        rawRequest: xhr
    }

    if ("json" in options && options.json !== false) {
        isJson = true
        headers["accept"] || headers["Accept"] || (headers["Accept"] = "application/json") //Don't override existing accept header declared by user
        if (method !== "GET" && method !== "HEAD") {
            headers["content-type"] || headers["Content-Type"] || (headers["Content-Type"] = "application/json") //Don't override existing accept header declared by user
            body = JSON.stringify(options.json === true ? body : options.json)
        }
    }

    xhr.onreadystatechange = readystatechange
    xhr.onload = loadFunc
    xhr.onerror = errorFunc
    // IE9 must have onprogress be set to a unique function.
    xhr.onprogress = function () {
        // IE must die
    }
    xhr.onabort = function(){
        aborted = true;
    }
    xhr.ontimeout = errorFunc
    xhr.open(method, uri, !sync, options.username, options.password)
    //has to be after open
    if(!sync) {
        xhr.withCredentials = !!options.withCredentials
    }
    // Cannot set timeout with sync request
    // not setting timeout on the xhr object, because of old webkits etc. not handling that correctly
    // both npm's request and jquery 1.x use this kind of timeout, so this is being consistent
    if (!sync && options.timeout > 0 ) {
        timeoutTimer = setTimeout(function(){
            if (aborted) return
            aborted = true//IE9 may still call readystatechange
            xhr.abort("timeout")
            var e = new Error("XMLHttpRequest timeout")
            e.code = "ETIMEDOUT"
            errorFunc(e)
        }, options.timeout )
    }

    if (xhr.setRequestHeader) {
        for(key in headers){
            if(headers.hasOwnProperty(key)){
                xhr.setRequestHeader(key, headers[key])
            }
        }
    } else if (options.headers && !isEmpty(options.headers)) {
        throw new Error("Headers cannot be set on an XDomainRequest object")
    }

    if ("responseType" in options) {
        xhr.responseType = options.responseType
    }

    if ("beforeSend" in options &&
        typeof options.beforeSend === "function"
    ) {
        options.beforeSend(xhr)
    }

    // Microsoft Edge browser sends "undefined" when send is called with undefined value.
    // XMLHttpRequest spec says to pass null as body to indicate no body
    // See https://github.com/naugtur/xhr/issues/100.
    xhr.send(body || null)

    return xhr


}

function getXml(xhr) {
    if (xhr.responseType === "document") {
        return xhr.responseXML
    }
    var firefoxBugTakenEffect = xhr.responseXML && xhr.responseXML.documentElement.nodeName === "parsererror"
    if (xhr.responseType === "" && !firefoxBugTakenEffect) {
        return xhr.responseXML
    }

    return null
}

function noop() {}

},{"global/window":8,"is-function":11,"parse-headers":12,"xtend":61}],61:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],62:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactAddonsCssTransitionGroup = require('react-addons-css-transition-group');

var _reactAddonsCssTransitionGroup2 = _interopRequireDefault(_reactAddonsCssTransitionGroup);

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _touchstonejs = require('touchstonejs');

// App Config
// ------------------------------

var PeopleStore = require('./stores/people');
var peopleStore = new PeopleStore();

var App = _react2['default'].createClass({
	displayName: 'App',

	mixins: [(0, _touchstonejs.createApp)()],

	childContextTypes: {
		peopleStore: _react2['default'].PropTypes.object
	},

	getChildContext: function getChildContext() {
		return {
			peopleStore: peopleStore
		};
	},

	componentDidMount: function componentDidMount() {
		// Hide the splash screen when the app is mounted
		if (navigator.splashscreen) {
			navigator.splashscreen.hide();
		}
	},

	render: function render() {
		var appWrapperClassName = 'app-wrapper device--' + (window.device || {}).platform;

		return _react2['default'].createElement(
			'div',
			{ className: appWrapperClassName },
			_react2['default'].createElement(
				'div',
				{ className: 'device-silhouette' },
				_react2['default'].createElement(
					_touchstonejs.ViewManager,
					{ name: 'app', defaultView: 'main' },
					_react2['default'].createElement(_touchstonejs.View, { name: 'main', component: MainViewController }),
					_react2['default'].createElement(_touchstonejs.View, { name: 'transitions-target-over', component: require('./views/transitions-target-over') })
				)
			)
		);
	}
});

// Main Controller
// ------------------------------

var MainViewController = _react2['default'].createClass({
	displayName: 'MainViewController',

	render: function render() {
		return _react2['default'].createElement(
			_touchstonejs.Container,
			null,
			_react2['default'].createElement(_touchstonejs.UI.NavigationBar, { name: 'main' }),
			_react2['default'].createElement(
				_touchstonejs.ViewManager,
				{ name: 'main', defaultView: 'tabs' },
				_react2['default'].createElement(_touchstonejs.View, { name: 'tabs', component: TabViewController })
			)
		);
	}
});

// Tab Controller
// ------------------------------

var lastSelectedTab = 'lists';
var TabViewController = _react2['default'].createClass({
	displayName: 'TabViewController',

	getInitialState: function getInitialState() {
		return {
			selectedTab: lastSelectedTab
		};
	},

	onViewChange: function onViewChange(nextView) {
		lastSelectedTab = nextView;

		this.setState({
			selectedTab: nextView
		});
	},

	selectTab: function selectTab(value) {
		var viewProps = undefined;

		this.refs.vm.transitionTo(value, {
			transition: 'instant',
			viewProps: viewProps
		});

		this.setState({
			selectedTab: value
		});
	},

	render: function render() {
		var selectedTab = this.state.selectedTab;
		var selectedTabSpan = selectedTab;

		if (selectedTab === 'lists' || selectedTab === 'list-simple' || selectedTab === 'list-complex' || selectedTab === 'list-details') {
			selectedTabSpan = 'lists';
		}

		if (selectedTab === 'transitions' || selectedTab === 'transitions-target') {
			selectedTabSpan = 'transitions';
		}

		return _react2['default'].createElement(
			_touchstonejs.Container,
			null,
			_react2['default'].createElement(
				_touchstonejs.ViewManager,
				{ ref: 'vm', name: 'tabs', defaultView: selectedTab, onViewChange: this.onViewChange },
				_react2['default'].createElement(_touchstonejs.View, { name: 'lists', component: require('./views/lists') }),
				_react2['default'].createElement(_touchstonejs.View, { name: 'list-simple', component: require('./views/list-simple') }),
				_react2['default'].createElement(_touchstonejs.View, { name: 'list-complex', component: require('./views/list-complex') }),
				_react2['default'].createElement(_touchstonejs.View, { name: 'list-details', component: require('./views/list-details') }),
				_react2['default'].createElement(_touchstonejs.View, { name: 'form', component: require('./views/form') }),
				_react2['default'].createElement(_touchstonejs.View, { name: 'controls', component: require('./views/controls') }),
				_react2['default'].createElement(_touchstonejs.View, { name: 'transitions', component: require('./views/transitions') }),
				_react2['default'].createElement(_touchstonejs.View, { name: 'transitions-target', component: require('./views/transitions-target') })
			),
			_react2['default'].createElement(
				_touchstonejs.UI.Tabs.Navigator,
				null,
				_react2['default'].createElement(
					_touchstonejs.UI.Tabs.Tab,
					{ onTap: this.selectTab.bind(this, 'lists'), selected: selectedTabSpan === 'lists' },
					_react2['default'].createElement('span', { className: 'Tabs-Icon Tabs-Icon--lists' }),
					_react2['default'].createElement(
						_touchstonejs.UI.Tabs.Label,
						null,
						'Lists'
					)
				),
				_react2['default'].createElement(
					_touchstonejs.UI.Tabs.Tab,
					{ onTap: this.selectTab.bind(this, 'form'), selected: selectedTabSpan === 'form' },
					_react2['default'].createElement('span', { className: 'Tabs-Icon Tabs-Icon--forms' }),
					_react2['default'].createElement(
						_touchstonejs.UI.Tabs.Label,
						null,
						'Forms'
					)
				),
				_react2['default'].createElement(
					_touchstonejs.UI.Tabs.Tab,
					{ onTap: this.selectTab.bind(this, 'controls'), selected: selectedTabSpan === 'controls' },
					_react2['default'].createElement('span', { className: 'Tabs-Icon Tabs-Icon--controls' }),
					_react2['default'].createElement(
						_touchstonejs.UI.Tabs.Label,
						null,
						'Controls'
					)
				),
				_react2['default'].createElement(
					_touchstonejs.UI.Tabs.Tab,
					{ onTap: this.selectTab.bind(this, 'transitions'), selected: selectedTabSpan === 'transitions' },
					_react2['default'].createElement('span', { className: 'Tabs-Icon Tabs-Icon--transitions' }),
					_react2['default'].createElement(
						_touchstonejs.UI.Tabs.Label,
						null,
						'Transitions'
					)
				)
			)
		);
	}
});

function startApp() {
	if (window.StatusBar) {
		window.StatusBar.styleDefault();
	}
	_reactDom2['default'].render(_react2['default'].createElement(App, null), document.getElementById('app'));
}

if (!window.cordova) {
	startApp();
} else {
	document.addEventListener('deviceready', startApp, false);
}

},{"./stores/people":63,"./views/controls":64,"./views/form":65,"./views/list-complex":66,"./views/list-details":67,"./views/list-simple":68,"./views/lists":69,"./views/transitions":72,"./views/transitions-target":71,"./views/transitions-target-over":70,"react":undefined,"react-addons-css-transition-group":undefined,"react-dom":undefined,"touchstonejs":20}],63:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var EventEmitter = require('events').EventEmitter;

var async = require('async');
var httpify = require('httpify');

var apiUrl = window.location.protocol === 'https:' ? 'https://randomuser.me/api?nat=au&results=16' : 'http://api.randomuser.me/?nat=au&results=16';

function PeopleStore() {
	EventEmitter.call(this);

	// initialize internal cache
	var storage = this.cache = {
		people: []
	};
	var self = this;

	// Dispatchers
	this.starQueue = async.queue(function (data, callback) {
		var id = data.id;
		var starred = data.starred;

		// update internal data
		self.cache.people.filter(function (person) {
			return person.id === id;
		}).forEach(function (person) {
			return person.isStarred = starred;
		});

		// emit events
		self.emit('people-updated', storage.people);

		callback();
	}, 1);

	this.refreshQueue = async.queue(function (_, callback) {
		// update
		httpify({
			method: 'GET',
			url: apiUrl
		}, function (err, res) {
			if (err) return callback(err);

			storage.people = res.body.results.map(function (p) {
				return p.user;
			});

			// post process new data
			storage.people.forEach(function (person, i) {
				person.id = i;
				person.name.first = person.name.first[0].toUpperCase() + person.name.first.slice(1);
				person.name.last = person.name.last[0].toUpperCase() + person.name.last.slice(1);
				person.name.initials = person.name.first[0] + person.name.last[0];
				person.name.full = person.name.first + ' ' + person.name.last;
				person.category = Math.random() > 0.5 ? 'A' : 'B';
				person.github = person.name.first.toLowerCase() + person.name.last.toLowerCase();
				person.picture = person.picture.medium;
				person.twitter = '@' + person.name.first.toLowerCase() + Math.random().toString(32).slice(2, 5);
			});

			// emit events
			self.emit('people-updated', storage.people);
			self.emit('refresh');

			callback(null, storage.people);
		});
	}, 1);

	// refresh immediately
	this.refresh();
}

_extends(PeopleStore.prototype, EventEmitter.prototype);

// Intents
PeopleStore.prototype.refresh = function (callback) {
	this.refreshQueue.push(null, callback);
};

PeopleStore.prototype.star = function (_ref, starred, callback) {
	var id = _ref.id;

	this.starQueue.push({ id: id, starred: starred }, callback);
};

// Getters
PeopleStore.prototype.getPeople = function () {
	return this.cache.people;
};

module.exports = PeopleStore;

},{"async":1,"events":6,"httpify":9}],64:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _reactContainer = require('react-container');

var _reactContainer2 = _interopRequireDefault(_reactContainer);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

var _reactTimers = require('react-timers');

var _reactTimers2 = _interopRequireDefault(_reactTimers);

var _touchstonejs = require('touchstonejs');

module.exports = _react2['default'].createClass({
	displayName: 'exports',

	mixins: [_reactTimers2['default']],
	statics: {
		navigationBar: 'main',
		getNavigation: function getNavigation() {
			return {
				title: 'Controls'
			};
		}
	},

	getInitialState: function getInitialState() {
		return {
			alertbar: {
				visible: false,
				type: '',
				text: ''
			},
			popup: {
				visible: false
			}
		};
	},

	showLoadingPopup: function showLoadingPopup() {
		var _this = this;

		this.setState({
			popup: {
				visible: true,
				loading: true,
				header: 'Loading',
				iconName: 'ion-load-c',
				iconType: 'default'
			}
		});

		this.setTimeout(function () {
			_this.setState({
				popup: {
					visible: true,
					loading: false,
					header: 'Done!',
					iconName: 'ion-ios-checkmark',
					iconType: 'success'
				}
			});
		}, 2000);

		this.setTimeout(function () {
			_this.setState({
				popup: {
					visible: false
				}
			});
		}, 3000);
	},

	showAlertbar: function showAlertbar(type, text) {
		var _this2 = this;

		this.setState({
			alertbar: {
				visible: true,
				type: type,
				text: text
			}
		});

		this.setTimeout(function () {
			_this2.setState({
				alertbar: {
					visible: false
				}
			});
		}, 2000);
	},

	handleModeChange: function handleModeChange(newMode) {
		var selectedItem = newMode;

		if (this.state.selectedMode === newMode) {
			selectedItem = null;
		}

		this.setState({
			selectedMode: selectedItem
		});
	},

	render: function render() {
		var alertbar = this.state.alertbar;

		return _react2['default'].createElement(
			_reactContainer2['default'],
			{ scrollable: true },
			_react2['default'].createElement(
				_touchstonejs.UI.Alertbar,
				{ type: alertbar.type || 'default', visible: alertbar.visible, animated: true },
				alertbar.text || ''
			),
			_react2['default'].createElement(
				_touchstonejs.UI.Group,
				{ hasTopGutter: true },
				_react2['default'].createElement(
					_touchstonejs.UI.GroupHeader,
					null,
					'Segmented Control'
				),
				_react2['default'].createElement(_touchstonejs.UI.SegmentedControl, { value: this.state.selectedMode, onChange: this.handleModeChange, hasGutter: true, options: [{ label: 'One', value: 'one' }, { label: 'Two', value: 'two' }, { label: 'Three', value: 'three' }, { label: 'Four', value: 'four' }] })
			),
			_react2['default'].createElement(
				_touchstonejs.UI.Group,
				null,
				_react2['default'].createElement(
					_touchstonejs.UI.GroupHeader,
					null,
					'Alert Bar'
				),
				_react2['default'].createElement(
					_touchstonejs.UI.ButtonGroup,
					null,
					_react2['default'].createElement(
						_touchstonejs.UI.Button,
						{ type: 'primary', onTap: this.showAlertbar.bind(this, 'danger', 'No Internet Connection'), disabled: this.state.alertbar.visible },
						'Danger'
					),
					_react2['default'].createElement(
						_touchstonejs.UI.Button,
						{ type: 'primary', onTap: this.showAlertbar.bind(this, 'warning', 'Connecting...'), disabled: this.state.alertbar.visible },
						'Warning'
					),
					_react2['default'].createElement(
						_touchstonejs.UI.Button,
						{ type: 'primary', onTap: this.showAlertbar.bind(this, 'success', 'Connected'), disabled: this.state.alertbar.visible },
						'Success'
					)
				)
			),
			_react2['default'].createElement(
				_touchstonejs.UI.Group,
				null,
				_react2['default'].createElement(
					_touchstonejs.UI.GroupHeader,
					null,
					'Popup'
				),
				_react2['default'].createElement(
					_touchstonejs.UI.Button,
					{ type: 'primary', onTap: this.showLoadingPopup, disabled: this.state.popup.visible },
					'Show Popup'
				)
			),
			_react2['default'].createElement(
				_touchstonejs.UI.Group,
				null,
				_react2['default'].createElement(
					_touchstonejs.UI.GroupHeader,
					null,
					'Application State'
				),
				_react2['default'].createElement(
					_touchstonejs.UI.GroupBody,
					null,
					_react2['default'].createElement(
						_touchstonejs.Link,
						{ to: 'tabs:non-existent', transition: 'show-from-right' },
						_react2['default'].createElement(
							_touchstonejs.UI.Item,
							{ showDisclosureArrow: true },
							_react2['default'].createElement(
								_touchstonejs.UI.ItemInner,
								null,
								'Invalid View'
							)
						)
					)
				)
			),
			_react2['default'].createElement(
				_touchstonejs.UI.Popup,
				{ visible: this.state.popup.visible },
				_react2['default'].createElement(_touchstonejs.UI.PopupIcon, { name: this.state.popup.iconName, type: this.state.popup.iconType, spinning: this.state.popup.loading }),
				_react2['default'].createElement(
					'div',
					null,
					_react2['default'].createElement(
						'strong',
						null,
						this.state.popup.header
					)
				)
			)
		);
	}
});

},{"react":undefined,"react-container":undefined,"react-tappable":undefined,"react-timers":14,"touchstonejs":20}],65:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _reactContainer = require('react-container');

var _reactContainer2 = _interopRequireDefault(_reactContainer);

var _cordovaDialogs = require('cordova-dialogs');

var _cordovaDialogs2 = _interopRequireDefault(_cordovaDialogs);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

var _touchstonejs = require('touchstonejs');

var scrollable = _reactContainer2['default'].initScrollable();

// html5 input types for testing
// omitted: button, checkbox, radio, image, hidden, reset, submit
var HTML5_INPUT_TYPES = ['color', 'date', 'datetime', 'datetime-local', 'email', 'file', 'month', 'number', 'password', 'range', 'search', 'tel', 'text', 'time', 'url', 'week'];
var FLAVOURS = [{ label: 'Vanilla', value: 'vanilla' }, { label: 'Chocolate', value: 'chocolate' }, { label: 'Caramel', value: 'caramel' }, { label: 'Strawberry', value: 'strawberry' }];

module.exports = _react2['default'].createClass({
	displayName: 'exports',

	statics: {
		navigationBar: 'main',
		getNavigation: function getNavigation() {
			return {
				title: 'Forms'
			};
		}
	},

	getInitialState: function getInitialState() {
		return {
			flavourLabelSelect: 'chocolate',
			flavourRadioList: 'chocolate',
			switchValue: true
		};
	},

	handleRadioListChange: function handleRadioListChange(key, newValue) {
		console.log('handleFlavourChange:', key, newValue);
		var newState = {};
		newState[key] = newValue;

		this.setState(newState);
	},

	handleLabelSelectChange: function handleLabelSelectChange(key, event) {
		console.log('handleFlavourChange:', key, event.target.value);
		var newState = {};
		newState[key] = event.target.value;

		this.setState(newState);
	},

	handleSwitch: function handleSwitch(key, event) {
		var newState = {};
		newState[key] = !this.state[key];

		this.setState(newState);
	},

	alert: function alert(message) {
		_cordovaDialogs2['default'].alert(message, function () {}, null);
	},

	// used for testing
	renderInputTypes: function renderInputTypes() {
		return HTML5_INPUT_TYPES.map(function (type) {
			return _react2['default'].createElement(_touchstonejs.UI.LabelInput, { key: type, type: type, label: type, placeholder: type });
		});
	},

	showDatePicker: function showDatePicker() {
		this.setState({ datePicker: true });
	},

	handleDatePickerChange: function handleDatePickerChange(d) {
		this.setState({ datePicker: false, date: d });
	},

	formatDate: function formatDate(date) {
		if (date) {
			return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
		}
	},

	render: function render() {

		return _react2['default'].createElement(
			_reactContainer2['default'],
			{ fill: true },
			_react2['default'].createElement(
				_reactContainer2['default'],
				{ scrollable: scrollable },
				_react2['default'].createElement(
					_touchstonejs.UI.Group,
					null,
					_react2['default'].createElement(
						_touchstonejs.UI.GroupHeader,
						null,
						'Checkbox'
					),
					_react2['default'].createElement(
						_touchstonejs.UI.GroupBody,
						null,
						_react2['default'].createElement(
							_touchstonejs.UI.Item,
							null,
							_react2['default'].createElement(
								_touchstonejs.UI.ItemInner,
								null,
								_react2['default'].createElement(
									_touchstonejs.UI.FieldLabel,
									null,
									'Switch'
								),
								_react2['default'].createElement(_touchstonejs.UI.Switch, { onTap: this.handleSwitch.bind(this, 'switchValue'), on: this.state.switchValue })
							)
						),
						_react2['default'].createElement(
							_touchstonejs.UI.Item,
							null,
							_react2['default'].createElement(
								_touchstonejs.UI.ItemInner,
								null,
								_react2['default'].createElement(
									_touchstonejs.UI.FieldLabel,
									null,
									'Disabled'
								),
								_react2['default'].createElement(_touchstonejs.UI.Switch, { disabled: true })
							)
						)
					)
				),
				_react2['default'].createElement(
					_touchstonejs.UI.Group,
					null,
					_react2['default'].createElement(
						_touchstonejs.UI.GroupHeader,
						null,
						'Radio'
					),
					_react2['default'].createElement(
						_touchstonejs.UI.GroupBody,
						null,
						_react2['default'].createElement(_touchstonejs.UI.RadioList, { value: this.state.flavourRadioList, onChange: this.handleRadioListChange.bind(this, 'flavourRadioList'), options: FLAVOURS })
					)
				),
				_react2['default'].createElement(
					_touchstonejs.UI.Group,
					null,
					_react2['default'].createElement(
						_touchstonejs.UI.GroupHeader,
						null,
						'Inputs'
					),
					_react2['default'].createElement(
						_touchstonejs.UI.GroupBody,
						null,
						_react2['default'].createElement(_touchstonejs.UI.Input, { placeholder: 'Default' }),
						_react2['default'].createElement(_touchstonejs.UI.Input, { defaultValue: 'With Value', placeholder: 'Placeholder' }),
						_react2['default'].createElement(_touchstonejs.UI.Textarea, { defaultValue: 'Longtext is good for bios etc.', placeholder: 'Longtext' })
					)
				),
				_react2['default'].createElement(
					_touchstonejs.UI.Group,
					null,
					_react2['default'].createElement(
						_touchstonejs.UI.GroupHeader,
						null,
						'Labelled Inputs'
					),
					_react2['default'].createElement(
						_touchstonejs.UI.GroupBody,
						null,
						_react2['default'].createElement(_touchstonejs.UI.LabelInput, { type: 'email', label: 'Email', placeholder: 'your.name@example.com' }),
						_react2['default'].createElement(
							_reactTappable2['default'],
							{ component: 'label', onTap: this.showDatePicker },
							_react2['default'].createElement(_touchstonejs.UI.LabelValue, { label: 'Date', value: this.formatDate(this.state.date), placeholder: 'Select a date' })
						),
						_react2['default'].createElement(_touchstonejs.UI.LabelInput, { type: 'url', label: 'URL', placeholder: 'http://www.yourwebsite.com' }),
						_react2['default'].createElement(_touchstonejs.UI.LabelInput, { noedit: true, label: 'No Edit', defaultValue: 'Un-editable, scrollable, selectable content' }),
						_react2['default'].createElement(_touchstonejs.UI.LabelSelect, { label: 'Flavour', value: this.state.flavourLabelSelect, onChange: this.handleLabelSelectChange.bind(this, 'flavourLabelSelect'), options: FLAVOURS })
					)
				),
				_react2['default'].createElement(
					_touchstonejs.UI.Button,
					{ type: 'primary', onTap: this.alert.bind(this, 'You clicked the Primary Button') },
					'Primary Button'
				),
				_react2['default'].createElement(
					_touchstonejs.UI.Button,
					{ onTap: this.alert.bind(this, 'You clicked the Default Button') },
					'Default Button'
				),
				_react2['default'].createElement(
					_touchstonejs.UI.Button,
					{ type: 'danger', onTap: this.alert.bind(this, 'You clicked the Danger Button') },
					'Danger Button'
				),
				_react2['default'].createElement(
					_touchstonejs.UI.Button,
					{ type: 'danger', onTap: this.alert.bind(this, 'You clicked the Danger Button'), disabled: true },
					'Disabled Button'
				)
			),
			_react2['default'].createElement(_touchstonejs.UI.DatePickerPopup, { visible: this.state.datePicker, date: this.state.date, onChange: this.handleDatePickerChange })
		);
	}
});
/*<UI.Group>
<UI.GroupHeader>Input Type Experiment</UI.GroupHeader>
<UI.GroupBody>
	{this.renderInputTypes()}
</UI.GroupBody>
</UI.Group>*/

},{"cordova-dialogs":5,"react":undefined,"react-container":undefined,"react-tappable":undefined,"touchstonejs":20}],66:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _reactContainer = require('react-container');

var _reactContainer2 = _interopRequireDefault(_reactContainer);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactSentry = require('react-sentry');

var _reactSentry2 = _interopRequireDefault(_reactSentry);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

var _touchstonejs = require('touchstonejs');

var scrollable = _reactContainer2['default'].initScrollable();

var ComplexLinkItem = _react2['default'].createClass({
	displayName: 'ComplexLinkItem',

	contextTypes: { peopleStore: _react2['default'].PropTypes.object.isRequired },

	toggleStar: function toggleStar() {
		var person = this.props.person;

		this.context.peopleStore.star(person, !person.isStarred);
	},

	render: function render() {
		var person = this.props.person;

		return _react2['default'].createElement(
			_touchstonejs.Link,
			{ to: 'tabs:list-details', transition: 'show-from-right', viewProps: { person: person, prevView: 'list-complex' } },
			_react2['default'].createElement(
				_touchstonejs.UI.Item,
				null,
				_react2['default'].createElement(_touchstonejs.UI.ItemMedia, { avatar: person.picture, avatarInitials: person.initials }),
				_react2['default'].createElement(
					_touchstonejs.UI.ItemInner,
					null,
					_react2['default'].createElement(
						_touchstonejs.UI.ItemContent,
						null,
						_react2['default'].createElement(
							_touchstonejs.UI.ItemTitle,
							null,
							person.name.full
						),
						_react2['default'].createElement(
							_touchstonejs.UI.ItemSubTitle,
							null,
							person.email || ''
						)
					),
					_react2['default'].createElement(
						_reactTappable2['default'],
						{ onTap: this.toggleStar, stopPropagation: true },
						_react2['default'].createElement(_touchstonejs.UI.ItemNote, { icon: person.isStarred ? 'ion-ios-star' : 'ion-ios-star-outline', type: person.isStarred ? 'warning' : 'default', className: 'ion-lg' })
					)
				)
			)
		);
	}
});

// FIXME: this bit is global and hacky, expect it to change
var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter();

function getNavigation(props, app, filterStarred) {
	return {
		leftLabel: 'Lists',
		leftArrow: true,
		leftAction: function leftAction() {
			app.transitionTo('tabs:lists', { transition: 'reveal-from-right' });
		},
		rightLabel: filterStarred ? 'All' : 'Starred',
		rightAction: emitter.emit.bind(emitter, 'navigationBarRightAction'),
		title: 'Complex'
	};
}

module.exports = _react2['default'].createClass({
	displayName: 'exports',

	contextTypes: {
		app: _react2['default'].PropTypes.object,
		peopleStore: _react2['default'].PropTypes.object.isRequired
	},
	mixins: [_reactSentry2['default']],

	statics: {
		navigationBar: 'main',
		getNavigation: getNavigation
	},

	getInitialState: function getInitialState() {
		return {
			filterStarred: false,
			people: this.context.peopleStore.getPeople()
		};
	},

	componentDidMount: function componentDidMount() {
		var _this = this;

		this.watch(this.context.peopleStore, 'people-updated', function (people) {
			_this.setState({ people: people });
		});

		this.watch(emitter, 'navigationBarRightAction', this.toggleStarred);
	},

	toggleStarred: function toggleStarred() {
		var filterStarred = !this.state.filterStarred;
		this.setState({ filterStarred: filterStarred });
		this.context.app.navigationBars.main.update(getNavigation({}, this.context.app, filterStarred));
	},

	handleModeChange: function handleModeChange(newMode) {
		var selectedMode = newMode;

		if (this.state.selectedMode === newMode) {
			selectedMode = null;
		}

		this.setState({ selectedMode: selectedMode });
	},

	render: function render() {
		var _state = this.state;
		var people = _state.people;
		var filterStarred = _state.filterStarred;
		var selectedMode = _state.selectedMode;

		if (filterStarred) {
			people = people.filter(function (person) {
				return person.isStarred;
			});
		}

		if (selectedMode === 'A' || selectedMode === 'B') {
			people = people.filter(function (person) {
				return person.category === selectedMode;
			});
		}

		function sortByName(a, b) {
			return a.name.full.localeCompare(b.name.full);
		}

		var sortedPeople = people.sort(sortByName);
		var results = undefined;

		if (sortedPeople.length) {
			var aPeople = sortedPeople.filter(function (person) {
				return person.category === 'A';
			}).map(function (person, i) {
				return _react2['default'].createElement(ComplexLinkItem, { key: 'persona' + i, person: person });
			});

			var bPeople = sortedPeople.filter(function (person) {
				return person.category === 'B';
			}).map(function (person, i) {
				return _react2['default'].createElement(ComplexLinkItem, { key: 'personb' + i, person: person });
			});

			results = _react2['default'].createElement(
				_touchstonejs.UI.GroupBody,
				null,
				aPeople.length > 0 ? _react2['default'].createElement(
					_touchstonejs.UI.ListHeader,
					{ sticky: true },
					'Category A'
				) : '',
				aPeople,
				bPeople.length > 0 ? _react2['default'].createElement(
					_touchstonejs.UI.ListHeader,
					{ sticky: true },
					'Category B'
				) : '',
				bPeople
			);
		} else {
			results = _react2['default'].createElement(
				_reactContainer2['default'],
				{ direction: 'column', align: 'center', justify: 'center', className: 'no-results' },
				_react2['default'].createElement('div', { className: 'no-results__icon ion-ios-star' }),
				_react2['default'].createElement(
					'div',
					{ className: 'no-results__text' },
					'Go star some people!'
				)
			);
		}

		return _react2['default'].createElement(
			_reactContainer2['default'],
			{ scrollable: scrollable },
			_react2['default'].createElement(_touchstonejs.UI.SegmentedControl, { value: this.state.selectedMode, onChange: this.handleModeChange, hasGutter: true, equalWidthSegments: true, options: [{ label: 'A', value: 'A' }, { label: 'B', value: 'B' }] }),
			results
		);
	}
});

},{"events":6,"react":undefined,"react-container":undefined,"react-sentry":13,"react-tappable":undefined,"touchstonejs":20}],67:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _reactContainer = require('react-container');

var _reactContainer2 = _interopRequireDefault(_reactContainer);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

module.exports = _react2['default'].createClass({
	displayName: 'exports',

	statics: {
		navigationBar: 'main',
		getNavigation: function getNavigation(props, app) {
			var leftLabel = props.prevView === 'list-simple' ? 'Simple' : 'Complex';
			return {
				leftArrow: true,
				leftLabel: leftLabel,
				leftAction: function leftAction() {
					app.transitionTo('tabs:' + props.prevView, { transition: 'reveal-from-right' });
				},
				title: 'Person'
			};
		}
	},
	getDefaultProps: function getDefaultProps() {
		return {
			prevView: 'home'
		};
	},
	render: function render() {
		var person = this.props.person;

		return _react2['default'].createElement(
			_reactContainer2['default'],
			{ direction: 'column' },
			_react2['default'].createElement(
				_reactContainer2['default'],
				{ fill: true, scrollable: true, ref: 'scrollContainer', className: 'PersonDetails' },
				_react2['default'].createElement('img', { src: person.picture, className: 'PersonDetails__avatar' }),
				_react2['default'].createElement(
					'div',
					{ className: 'PersonDetails__heading' },
					person.name.full
				),
				_react2['default'].createElement(
					'div',
					{ className: 'PersonDetails__text text-block' },
					person.email || ''
				),
				(person.twitter || person.github) && _react2['default'].createElement(
					'div',
					{ className: 'PersonDetails__profiles' },
					person.twitter && _react2['default'].createElement(
						'div',
						{ className: 'PersonDetails__profile' },
						_react2['default'].createElement('span', { className: 'PersonDetails__profile__icon ion-social-twitter' }),
						person.twitter
					),
					person.github && _react2['default'].createElement(
						'div',
						{ className: 'PersonDetails__profile' },
						_react2['default'].createElement('span', { className: 'PersonDetails__profile__icon ion-social-github' }),
						person.github
					)
				)
			)
		);
	}
});

},{"react":undefined,"react-container":undefined}],68:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _reactContainer = require('react-container');

var _reactContainer2 = _interopRequireDefault(_reactContainer);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactSentry = require('react-sentry');

var _reactSentry2 = _interopRequireDefault(_reactSentry);

var _reactTappable = require('react-tappable');

var _reactTappable2 = _interopRequireDefault(_reactTappable);

var _touchstonejs = require('touchstonejs');

var scrollable = _reactContainer2['default'].initScrollable({ left: 0, top: 44 });

var SimpleLinkItem = _react2['default'].createClass({
	displayName: 'SimpleLinkItem',

	propTypes: {
		person: _react2['default'].PropTypes.object.isRequired
	},

	render: function render() {
		return _react2['default'].createElement(
			_touchstonejs.Link,
			{ to: 'tabs:list-details', transition: 'show-from-right', viewProps: { person: this.props.person, prevView: 'list-simple' } },
			_react2['default'].createElement(
				_touchstonejs.UI.Item,
				{ showDisclosureArrow: true },
				_react2['default'].createElement(
					_touchstonejs.UI.ItemInner,
					null,
					_react2['default'].createElement(
						_touchstonejs.UI.ItemTitle,
						null,
						this.props.person.name.full
					)
				)
			)
		);
	}
});

module.exports = _react2['default'].createClass({
	displayName: 'exports',

	mixins: [_reactSentry2['default']],
	contextTypes: { peopleStore: _react2['default'].PropTypes.object.isRequired },

	statics: {
		navigationBar: 'main',
		getNavigation: function getNavigation(props, app) {
			return {
				leftArrow: true,
				leftLabel: 'Lists',
				leftAction: function leftAction() {
					app.transitionTo('tabs:lists', { transition: 'reveal-from-right' });
				},
				title: 'Simple'
			};
		}
	},

	componentDidMount: function componentDidMount() {
		var _this = this;

		this.watch(this.context.peopleStore, 'people-updated', function (people) {
			_this.setState({ people: people });
		});
	},

	getInitialState: function getInitialState() {
		return {
			searchString: '',
			people: this.context.peopleStore.getPeople()
		};
	},

	clearSearch: function clearSearch() {
		this.setState({ searchString: '' });
	},

	updateSearch: function updateSearch(str) {
		this.setState({ searchString: str });
	},

	submitSearch: function submitSearch(str) {
		console.log(str);
	},

	render: function render() {
		var _state = this.state;
		var people = _state.people;
		var searchString = _state.searchString;

		var searchRegex = new RegExp(searchString);

		function searchFilter(person) {
			return searchRegex.test(person.name.full.toLowerCase());
		};
		function sortByName(a, b) {
			return a.name.full.localeCompare(b.name.full);
		};

		var filteredPeople = people.filter(searchFilter).sort(sortByName);

		var results = undefined;

		if (searchString && !filteredPeople.length) {
			results = _react2['default'].createElement(
				_reactContainer2['default'],
				{ direction: 'column', align: 'center', justify: 'center', className: 'no-results' },
				_react2['default'].createElement('div', { className: 'no-results__icon ion-ios-search-strong' }),
				_react2['default'].createElement(
					'div',
					{ className: 'no-results__text' },
					'No results for "' + searchString + '"'
				)
			);
		} else {
			results = _react2['default'].createElement(
				_touchstonejs.UI.GroupBody,
				null,
				filteredPeople.map(function (person, i) {
					return _react2['default'].createElement(SimpleLinkItem, { key: 'person' + i, person: person });
				})
			);
		}

		return _react2['default'].createElement(
			_reactContainer2['default'],
			{ ref: 'scrollContainer', scrollable: scrollable },
			_react2['default'].createElement(_touchstonejs.UI.SearchField, { type: 'dark', value: this.state.searchString, onSubmit: this.submitSearch, onChange: this.updateSearch, onCancel: this.clearSearch, onClear: this.clearSearch, placeholder: 'Search...' }),
			results
		);
	}
});

},{"react":undefined,"react-container":undefined,"react-sentry":13,"react-tappable":undefined,"touchstonejs":20}],69:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _reactContainer = require('react-container');

var _reactContainer2 = _interopRequireDefault(_reactContainer);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _touchstonejs = require('touchstonejs');

module.exports = _react2['default'].createClass({
	displayName: 'exports',

	statics: {
		navigationBar: 'main',
		getNavigation: function getNavigation() {
			return {
				title: 'Lists'
			};
		}
	},

	render: function render() {
		return _react2['default'].createElement(
			_reactContainer2['default'],
			{ scrollable: true },
			_react2['default'].createElement(
				_touchstonejs.UI.Group,
				null,
				_react2['default'].createElement(
					_touchstonejs.UI.GroupHeader,
					null,
					'Lists'
				),
				_react2['default'].createElement(
					_touchstonejs.UI.GroupBody,
					null,
					_react2['default'].createElement(
						_touchstonejs.Link,
						{ to: 'tabs:list-simple', transition: 'show-from-right' },
						_react2['default'].createElement(
							_touchstonejs.UI.Item,
							{ showDisclosureArrow: true },
							_react2['default'].createElement(
								_touchstonejs.UI.ItemInner,
								null,
								'Simple List'
							)
						)
					),
					_react2['default'].createElement(
						_touchstonejs.Link,
						{ to: 'tabs:list-complex', transition: 'show-from-right' },
						_react2['default'].createElement(
							_touchstonejs.UI.Item,
							{ showDisclosureArrow: true },
							_react2['default'].createElement(
								_touchstonejs.UI.ItemInner,
								null,
								'Complex List'
							)
						)
					)
				)
			),
			_react2['default'].createElement(
				_touchstonejs.UI.Group,
				null,
				_react2['default'].createElement(
					_touchstonejs.UI.GroupHeader,
					null,
					'GroupHeader'
				),
				_react2['default'].createElement(
					_touchstonejs.UI.GroupBody,
					null,
					_react2['default'].createElement(
						_touchstonejs.UI.GroupInner,
						null,
						_react2['default'].createElement(
							'p',
							null,
							'Use groups to contain content or lists. Where appropriate a Group should be accompanied by a GroupHeading and optionally a GroupFooter.'
						),
						'GroupBody will apply the background for content inside groups.'
					)
				),
				_react2['default'].createElement(
					_touchstonejs.UI.GroupFooter,
					null,
					'GroupFooter: useful for a detailed explanation to express the intentions of the Group. Try to be concise - remember that users are likely to read the text in your UI many times.'
				)
			)
		);
	}
});

},{"react":undefined,"react-container":undefined,"touchstonejs":20}],70:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _reactContainer = require('react-container');

var _reactContainer2 = _interopRequireDefault(_reactContainer);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTimers = require('react-timers');

var _reactTimers2 = _interopRequireDefault(_reactTimers);

var _touchstonejs = require('touchstonejs');

module.exports = _react2['default'].createClass({
	displayName: 'exports',

	mixins: [_touchstonejs.Mixins.Transitions, _reactTimers2['default']],
	componentDidMount: function componentDidMount() {
		var self = this;
		this.setTimeout(function () {
			self.transitionTo('app:main', { transition: 'fade' });
		}, 1000);
	},
	render: function render() {
		return _react2['default'].createElement(
			_reactContainer2['default'],
			{ direction: 'column' },
			_react2['default'].createElement(_touchstonejs.UI.NavigationBar, { name: 'over', title: this.props.navbarTitle }),
			_react2['default'].createElement(
				_reactContainer2['default'],
				{ direction: 'column', align: 'center', justify: 'center', className: 'no-results' },
				_react2['default'].createElement('div', { className: 'no-results__icon ion-ios-photos' }),
				_react2['default'].createElement(
					'div',
					{ className: 'no-results__text' },
					'Hold on a sec...'
				)
			)
		);
	}
});

},{"react":undefined,"react-container":undefined,"react-timers":14,"touchstonejs":20}],71:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _reactContainer = require('react-container');

var _reactContainer2 = _interopRequireDefault(_reactContainer);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactTimers = require('react-timers');

var _reactTimers2 = _interopRequireDefault(_reactTimers);

var _touchstonejs = require('touchstonejs');

module.exports = _react2['default'].createClass({
	displayName: 'exports',

	mixins: [_touchstonejs.Mixins.Transitions, _reactTimers2['default']],
	statics: {
		navigationBar: 'main',
		getNavigation: function getNavigation(props) {
			return {
				title: props.navbarTitle
			};
		}
	},
	componentDidMount: function componentDidMount() {
		var self = this;

		this.setTimeout(function () {
			self.transitionTo('tabs:transitions', { transition: 'fade' });
		}, 1000);
	},
	render: function render() {
		return _react2['default'].createElement(
			_reactContainer2['default'],
			{ direction: 'column', align: 'center', justify: 'center', className: 'no-results' },
			_react2['default'].createElement('div', { className: 'no-results__icon ion-ios-photos' }),
			_react2['default'].createElement(
				'div',
				{ className: 'no-results__text' },
				'Hold on a sec...'
			)
		);
	}
});

},{"react":undefined,"react-container":undefined,"react-timers":14,"touchstonejs":20}],72:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _reactContainer = require('react-container');

var _reactContainer2 = _interopRequireDefault(_reactContainer);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _touchstonejs = require('touchstonejs');

var scrollable = _reactContainer2['default'].initScrollable();

module.exports = _react2['default'].createClass({
	displayName: 'exports',

	statics: {
		navigationBar: 'main',
		getNavigation: function getNavigation() {
			return {
				title: 'Transitions'
			};
		}
	},

	render: function render() {
		return _react2['default'].createElement(
			_reactContainer2['default'],
			{ scrollable: scrollable },
			_react2['default'].createElement(
				_touchstonejs.UI.Group,
				null,
				_react2['default'].createElement(
					_touchstonejs.UI.GroupHeader,
					null,
					'Default'
				),
				_react2['default'].createElement(
					_touchstonejs.UI.GroupBody,
					null,
					_react2['default'].createElement(
						_touchstonejs.Link,
						{ to: 'tabs:transitions-target', viewProps: { navbarTitle: 'Instant' } },
						_react2['default'].createElement(
							_touchstonejs.UI.Item,
							{ showDisclosureArrow: true },
							_react2['default'].createElement(
								_touchstonejs.UI.ItemInner,
								null,
								'Instant'
							)
						)
					)
				)
			),
			_react2['default'].createElement(
				_touchstonejs.UI.Group,
				null,
				_react2['default'].createElement(
					_touchstonejs.UI.GroupHeader,
					null,
					'Fade'
				),
				_react2['default'].createElement(
					_touchstonejs.UI.GroupBody,
					null,
					_react2['default'].createElement(
						_touchstonejs.Link,
						{ to: 'tabs:transitions-target', transition: 'fade', viewProps: { navbarTitle: 'Fade' } },
						_react2['default'].createElement(
							_touchstonejs.UI.Item,
							{ showDisclosureArrow: true },
							_react2['default'].createElement(
								_touchstonejs.UI.ItemInner,
								null,
								'Fade'
							)
						)
					),
					_react2['default'].createElement(
						_touchstonejs.Link,
						{ to: 'tabs:transitions-target', transition: 'fade-expand', viewProps: { navbarTitle: 'Fade Expand' } },
						_react2['default'].createElement(
							_touchstonejs.UI.Item,
							{ showDisclosureArrow: true },
							_react2['default'].createElement(
								_touchstonejs.UI.ItemInner,
								null,
								_react2['default'].createElement(
									'span',
									null,
									'Fade Expand ',
									_react2['default'].createElement(
										'span',
										{ className: 'text-muted' },
										'(non-standard)'
									)
								)
							)
						)
					),
					_react2['default'].createElement(
						_touchstonejs.Link,
						{ to: 'tabs:transitions-target', transition: 'fade-contract', viewProps: { navbarTitle: 'Fade Contract' } },
						_react2['default'].createElement(
							_touchstonejs.UI.Item,
							{ showDisclosureArrow: true },
							_react2['default'].createElement(
								_touchstonejs.UI.ItemInner,
								null,
								_react2['default'].createElement(
									'span',
									null,
									'Fade Contract ',
									_react2['default'].createElement(
										'span',
										{ className: 'text-muted' },
										'(non-standard)'
									)
								)
							)
						)
					)
				)
			),
			_react2['default'].createElement(
				_touchstonejs.UI.Group,
				null,
				_react2['default'].createElement(
					_touchstonejs.UI.GroupHeader,
					null,
					'Show'
				),
				_react2['default'].createElement(
					_touchstonejs.UI.GroupBody,
					null,
					_react2['default'].createElement(
						_touchstonejs.Link,
						{ to: 'tabs:transitions-target', transition: 'show-from-left', viewProps: { navbarTitle: 'Show from Left' } },
						_react2['default'].createElement(
							_touchstonejs.UI.Item,
							{ showDisclosureArrow: true },
							_react2['default'].createElement(
								_touchstonejs.UI.ItemInner,
								null,
								_react2['default'].createElement(
									'span',
									null,
									'Show from Left ',
									_react2['default'].createElement(
										'span',
										{ className: 'text-muted' },
										'(non-standard)'
									)
								)
							)
						)
					),
					_react2['default'].createElement(
						_touchstonejs.Link,
						{ to: 'tabs:transitions-target', transition: 'show-from-right', viewProps: { navbarTitle: 'Show from Right' } },
						_react2['default'].createElement(
							_touchstonejs.UI.Item,
							{ showDisclosureArrow: true },
							_react2['default'].createElement(
								_touchstonejs.UI.ItemInner,
								null,
								'Show from Right'
							)
						)
					),
					_react2['default'].createElement(
						_touchstonejs.Link,
						{ to: 'app:transitions-target-over', transition: 'show-from-top', viewProps: { navbarTitle: 'Show from Top' } },
						_react2['default'].createElement(
							_touchstonejs.UI.Item,
							{ showDisclosureArrow: true },
							_react2['default'].createElement(
								_touchstonejs.UI.ItemInner,
								null,
								_react2['default'].createElement(
									'span',
									null,
									'Show from Top ',
									_react2['default'].createElement(
										'span',
										{ className: 'text-muted' },
										'(non-standard)'
									)
								)
							)
						)
					),
					_react2['default'].createElement(
						_touchstonejs.Link,
						{ to: 'app:transitions-target-over', transition: 'show-from-bottom', viewProps: { navbarTitle: 'Show from Bottom' } },
						_react2['default'].createElement(
							_touchstonejs.UI.Item,
							{ showDisclosureArrow: true },
							_react2['default'].createElement(
								_touchstonejs.UI.ItemInner,
								null,
								'Show from Bottom'
							)
						)
					)
				)
			),
			_react2['default'].createElement(
				_touchstonejs.UI.Group,
				null,
				_react2['default'].createElement(
					_touchstonejs.UI.GroupHeader,
					null,
					'Reveal'
				),
				_react2['default'].createElement(
					_touchstonejs.UI.GroupBody,
					null,
					_react2['default'].createElement(
						_touchstonejs.Link,
						{ to: 'tabs:transitions-target', transition: 'reveal-from-left', viewProps: { navbarTitle: 'Reveal from Left' } },
						_react2['default'].createElement(
							_touchstonejs.UI.Item,
							{ showDisclosureArrow: true },
							_react2['default'].createElement(
								_touchstonejs.UI.ItemInner,
								null,
								_react2['default'].createElement(
									'span',
									null,
									'Reveal from Left ',
									_react2['default'].createElement(
										'span',
										{ className: 'text-muted' },
										'(non-standard)'
									)
								)
							)
						)
					),
					_react2['default'].createElement(
						_touchstonejs.Link,
						{ to: 'tabs:transitions-target', transition: 'reveal-from-right', viewProps: { navbarTitle: 'Reveal from Right' } },
						_react2['default'].createElement(
							_touchstonejs.UI.Item,
							{ showDisclosureArrow: true },
							_react2['default'].createElement(
								_touchstonejs.UI.ItemInner,
								null,
								'Reveal from Right'
							)
						)
					),
					_react2['default'].createElement(
						_touchstonejs.Link,
						{ to: 'app:transitions-target-over', transition: 'reveal-from-top', viewProps: { navbarTitle: 'Reveal from Top' } },
						_react2['default'].createElement(
							_touchstonejs.UI.Item,
							{ showDisclosureArrow: true },
							_react2['default'].createElement(
								_touchstonejs.UI.ItemInner,
								null,
								_react2['default'].createElement(
									'span',
									null,
									'Reveal from Top ',
									_react2['default'].createElement(
										'span',
										{ className: 'text-muted' },
										'(non-standard)'
									)
								)
							)
						)
					),
					_react2['default'].createElement(
						_touchstonejs.Link,
						{ to: 'app:transitions-target-over', transition: 'reveal-from-bottom', viewProps: { navbarTitle: 'Reveal from Bottom' } },
						_react2['default'].createElement(
							_touchstonejs.UI.Item,
							{ showDisclosureArrow: true },
							_react2['default'].createElement(
								_touchstonejs.UI.ItemInner,
								null,
								'Reveal from Bottom'
							)
						)
					)
				)
			)
		);
	}
});

},{"react":undefined,"react-container":undefined,"touchstonejs":20}]},{},[62])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYXN5bmMvbGliL2FzeW5jLmpzIiwibm9kZV9tb2R1bGVzL2JsYWNrbGlzdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvY2xhc3NuYW1lcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jb3Jkb3ZhLWRpYWxvZ3MvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIm5vZGVfbW9kdWxlcy9mb3ItZWFjaC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9nbG9iYWwvd2luZG93LmpzIiwibm9kZV9tb2R1bGVzL2h0dHBpZnkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvaHR0cGlmeS9saWIvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9pcy1mdW5jdGlvbi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wYXJzZS1oZWFkZXJzL3BhcnNlLWhlYWRlcnMuanMiLCJub2RlX21vZHVsZXMvcmVhY3Qtc2VudHJ5L2xpYi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9yZWFjdC10aW1lcnMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi9jb3JlL0Vycm9yVmlldy5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL2NvcmUvTGluay5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL2NvcmUvVmlldy5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL2NvcmUvVmlld01hbmFnZXIuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi9jb3JlL2FuaW1hdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvbWl4aW5zL1RyYW5zaXRpb25zLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvbWl4aW5zL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvQWxlcnRiYXIuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9CdXR0b24uanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9CdXR0b25Hcm91cC5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL0RhdGVQaWNrZXIuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9EYXRlUGlja2VyUG9wdXAuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9GaWVsZENvbnRyb2wuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9GaWVsZExhYmVsLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvR3JvdXAuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9Hcm91cEJvZHkuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9Hcm91cEZvb3Rlci5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL0dyb3VwSGVhZGVyLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvR3JvdXBJbm5lci5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL0lucHV0LmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvSXRlbS5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL0l0ZW1Db250ZW50LmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvSXRlbUlubmVyLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvSXRlbU1lZGlhLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvSXRlbU5vdGUuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9JdGVtU3ViVGl0bGUuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9JdGVtVGl0bGUuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9MYWJlbElucHV0LmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvTGFiZWxTZWxlY3QuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9MYWJlbFRleHRhcmVhLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvTGFiZWxWYWx1ZS5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL0xpc3RIZWFkZXIuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9OYXZpZ2F0aW9uQmFyLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvUG9wdXAuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9Qb3B1cEljb24uanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9SYWRpb0xpc3QuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9TZWFyY2hGaWVsZC5qcyIsIm5vZGVfbW9kdWxlcy90b3VjaHN0b25lanMvbGliL3VpL1NlZ21lbnRlZENvbnRyb2wuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9Td2l0Y2guanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9UYWJzLmpzIiwibm9kZV9tb2R1bGVzL3RvdWNoc3RvbmVqcy9saWIvdWkvVGV4dGFyZWEuanMiLCJub2RlX21vZHVsZXMvdG91Y2hzdG9uZWpzL2xpYi91aS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy90cmltL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3R3ZWVuLmpzL3NyYy9Ud2Vlbi5qcyIsIm5vZGVfbW9kdWxlcy94aHIvaW5kZXguanMiLCJub2RlX21vZHVsZXMveHRlbmQvaW1tdXRhYmxlLmpzIiwiL1VzZXJzL2dpbGxlc2RhbmpvdS9EZXNrdG9wL1NUQVJUVVAvdG91Y2hzdG9uZWpzLXN0YXJ0ZXIvc3JjL2pzL2FwcC5qcyIsIi9Vc2Vycy9naWxsZXNkYW5qb3UvRGVza3RvcC9TVEFSVFVQL3RvdWNoc3RvbmVqcy1zdGFydGVyL3NyYy9qcy9zdG9yZXMvcGVvcGxlLmpzIiwiL1VzZXJzL2dpbGxlc2RhbmpvdS9EZXNrdG9wL1NUQVJUVVAvdG91Y2hzdG9uZWpzLXN0YXJ0ZXIvc3JjL2pzL3ZpZXdzL2NvbnRyb2xzLmpzIiwiL1VzZXJzL2dpbGxlc2RhbmpvdS9EZXNrdG9wL1NUQVJUVVAvdG91Y2hzdG9uZWpzLXN0YXJ0ZXIvc3JjL2pzL3ZpZXdzL2Zvcm0uanMiLCIvVXNlcnMvZ2lsbGVzZGFuam91L0Rlc2t0b3AvU1RBUlRVUC90b3VjaHN0b25lanMtc3RhcnRlci9zcmMvanMvdmlld3MvbGlzdC1jb21wbGV4LmpzIiwiL1VzZXJzL2dpbGxlc2RhbmpvdS9EZXNrdG9wL1NUQVJUVVAvdG91Y2hzdG9uZWpzLXN0YXJ0ZXIvc3JjL2pzL3ZpZXdzL2xpc3QtZGV0YWlscy5qcyIsIi9Vc2Vycy9naWxsZXNkYW5qb3UvRGVza3RvcC9TVEFSVFVQL3RvdWNoc3RvbmVqcy1zdGFydGVyL3NyYy9qcy92aWV3cy9saXN0LXNpbXBsZS5qcyIsIi9Vc2Vycy9naWxsZXNkYW5qb3UvRGVza3RvcC9TVEFSVFVQL3RvdWNoc3RvbmVqcy1zdGFydGVyL3NyYy9qcy92aWV3cy9saXN0cy5qcyIsIi9Vc2Vycy9naWxsZXNkYW5qb3UvRGVza3RvcC9TVEFSVFVQL3RvdWNoc3RvbmVqcy1zdGFydGVyL3NyYy9qcy92aWV3cy90cmFuc2l0aW9ucy10YXJnZXQtb3Zlci5qcyIsIi9Vc2Vycy9naWxsZXNkYW5qb3UvRGVza3RvcC9TVEFSVFVQL3RvdWNoc3RvbmVqcy1zdGFydGVyL3NyYy9qcy92aWV3cy90cmFuc2l0aW9ucy10YXJnZXQuanMiLCIvVXNlcnMvZ2lsbGVzZGFuam91L0Rlc2t0b3AvU1RBUlRVUC90b3VjaHN0b25lanMtc3RhcnRlci9zcmMvanMvdmlld3MvdHJhbnNpdGlvbnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDanZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbDNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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QjtBQUFDLHlCQUFHLFNBQVM7OztRQUFrQztPQUN0QztNQUNKO0tBQ087SUFDTDtHQUNBLENBQ1g7RUFDRjtDQUNELENBQUMsQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiFcbiAqIGFzeW5jXG4gKiBodHRwczovL2dpdGh1Yi5jb20vY2FvbGFuL2FzeW5jXG4gKlxuICogQ29weXJpZ2h0IDIwMTAtMjAxNCBDYW9sYW4gTWNNYWhvblxuICogUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlXG4gKi9cbihmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgYXN5bmMgPSB7fTtcbiAgICBmdW5jdGlvbiBub29wKCkge31cbiAgICBmdW5jdGlvbiBpZGVudGl0eSh2KSB7XG4gICAgICAgIHJldHVybiB2O1xuICAgIH1cbiAgICBmdW5jdGlvbiB0b0Jvb2wodikge1xuICAgICAgICByZXR1cm4gISF2O1xuICAgIH1cbiAgICBmdW5jdGlvbiBub3RJZCh2KSB7XG4gICAgICAgIHJldHVybiAhdjtcbiAgICB9XG5cbiAgICAvLyBnbG9iYWwgb24gdGhlIHNlcnZlciwgd2luZG93IGluIHRoZSBicm93c2VyXG4gICAgdmFyIHByZXZpb3VzX2FzeW5jO1xuXG4gICAgLy8gRXN0YWJsaXNoIHRoZSByb290IG9iamVjdCwgYHdpbmRvd2AgKGBzZWxmYCkgaW4gdGhlIGJyb3dzZXIsIGBnbG9iYWxgXG4gICAgLy8gb24gdGhlIHNlcnZlciwgb3IgYHRoaXNgIGluIHNvbWUgdmlydHVhbCBtYWNoaW5lcy4gV2UgdXNlIGBzZWxmYFxuICAgIC8vIGluc3RlYWQgb2YgYHdpbmRvd2AgZm9yIGBXZWJXb3JrZXJgIHN1cHBvcnQuXG4gICAgdmFyIHJvb3QgPSB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgJiYgc2VsZi5zZWxmID09PSBzZWxmICYmIHNlbGYgfHxcbiAgICAgICAgICAgIHR5cGVvZiBnbG9iYWwgPT09ICdvYmplY3QnICYmIGdsb2JhbC5nbG9iYWwgPT09IGdsb2JhbCAmJiBnbG9iYWwgfHxcbiAgICAgICAgICAgIHRoaXM7XG5cbiAgICBpZiAocm9vdCAhPSBudWxsKSB7XG4gICAgICAgIHByZXZpb3VzX2FzeW5jID0gcm9vdC5hc3luYztcbiAgICB9XG5cbiAgICBhc3luYy5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByb290LmFzeW5jID0gcHJldmlvdXNfYXN5bmM7XG4gICAgICAgIHJldHVybiBhc3luYztcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gb25seV9vbmNlKGZuKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChmbiA9PT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGJhY2sgd2FzIGFscmVhZHkgY2FsbGVkLlwiKTtcbiAgICAgICAgICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICBmbiA9IG51bGw7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX29uY2UoZm4pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKGZuID09PSBudWxsKSByZXR1cm47XG4gICAgICAgICAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgZm4gPSBudWxsO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vLy8gY3Jvc3MtYnJvd3NlciBjb21wYXRpYmxpdHkgZnVuY3Rpb25zIC8vLy9cblxuICAgIHZhciBfdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4gICAgdmFyIF9pc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHJldHVybiBfdG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgIH07XG5cbiAgICAvLyBQb3J0ZWQgZnJvbSB1bmRlcnNjb3JlLmpzIGlzT2JqZWN0XG4gICAgdmFyIF9pc09iamVjdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICB2YXIgdHlwZSA9IHR5cGVvZiBvYmo7XG4gICAgICAgIHJldHVybiB0eXBlID09PSAnZnVuY3Rpb24nIHx8IHR5cGUgPT09ICdvYmplY3QnICYmICEhb2JqO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBfaXNBcnJheUxpa2UoYXJyKSB7XG4gICAgICAgIHJldHVybiBfaXNBcnJheShhcnIpIHx8IChcbiAgICAgICAgICAgIC8vIGhhcyBhIHBvc2l0aXZlIGludGVnZXIgbGVuZ3RoIHByb3BlcnR5XG4gICAgICAgICAgICB0eXBlb2YgYXJyLmxlbmd0aCA9PT0gXCJudW1iZXJcIiAmJlxuICAgICAgICAgICAgYXJyLmxlbmd0aCA+PSAwICYmXG4gICAgICAgICAgICBhcnIubGVuZ3RoICUgMSA9PT0gMFxuICAgICAgICApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9hcnJheUVhY2goYXJyLCBpdGVyYXRvcikge1xuICAgICAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgICAgIGxlbmd0aCA9IGFyci5sZW5ndGg7XG5cbiAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKGFycltpbmRleF0sIGluZGV4LCBhcnIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX21hcChhcnIsIGl0ZXJhdG9yKSB7XG4gICAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgICAgbGVuZ3RoID0gYXJyLmxlbmd0aCxcbiAgICAgICAgICAgIHJlc3VsdCA9IEFycmF5KGxlbmd0aCk7XG5cbiAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIHJlc3VsdFtpbmRleF0gPSBpdGVyYXRvcihhcnJbaW5kZXhdLCBpbmRleCwgYXJyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9yYW5nZShjb3VudCkge1xuICAgICAgICByZXR1cm4gX21hcChBcnJheShjb3VudCksIGZ1bmN0aW9uICh2LCBpKSB7IHJldHVybiBpOyB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfcmVkdWNlKGFyciwgaXRlcmF0b3IsIG1lbW8pIHtcbiAgICAgICAgX2FycmF5RWFjaChhcnIsIGZ1bmN0aW9uICh4LCBpLCBhKSB7XG4gICAgICAgICAgICBtZW1vID0gaXRlcmF0b3IobWVtbywgeCwgaSwgYSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbWVtbztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfZm9yRWFjaE9mKG9iamVjdCwgaXRlcmF0b3IpIHtcbiAgICAgICAgX2FycmF5RWFjaChfa2V5cyhvYmplY3QpLCBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICBpdGVyYXRvcihvYmplY3Rba2V5XSwga2V5KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2luZGV4T2YoYXJyLCBpdGVtKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoYXJyW2ldID09PSBpdGVtKSByZXR1cm4gaTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgfVxuXG4gICAgdmFyIF9rZXlzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24gKG9iaikge1xuICAgICAgICB2YXIga2V5cyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBrIGluIG9iaikge1xuICAgICAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgICAgIGtleXMucHVzaChrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ga2V5cztcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX2tleUl0ZXJhdG9yKGNvbGwpIHtcbiAgICAgICAgdmFyIGkgPSAtMTtcbiAgICAgICAgdmFyIGxlbjtcbiAgICAgICAgdmFyIGtleXM7XG4gICAgICAgIGlmIChfaXNBcnJheUxpa2UoY29sbCkpIHtcbiAgICAgICAgICAgIGxlbiA9IGNvbGwubGVuZ3RoO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgIHJldHVybiBpIDwgbGVuID8gaSA6IG51bGw7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAga2V5cyA9IF9rZXlzKGNvbGwpO1xuICAgICAgICAgICAgbGVuID0ga2V5cy5sZW5ndGg7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGkgPCBsZW4gPyBrZXlzW2ldIDogbnVsbDtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTaW1pbGFyIHRvIEVTNidzIHJlc3QgcGFyYW0gKGh0dHA6Ly9hcml5YS5vZmlsYWJzLmNvbS8yMDEzLzAzL2VzNi1hbmQtcmVzdC1wYXJhbWV0ZXIuaHRtbClcbiAgICAvLyBUaGlzIGFjY3VtdWxhdGVzIHRoZSBhcmd1bWVudHMgcGFzc2VkIGludG8gYW4gYXJyYXksIGFmdGVyIGEgZ2l2ZW4gaW5kZXguXG4gICAgLy8gRnJvbSB1bmRlcnNjb3JlLmpzIChodHRwczovL2dpdGh1Yi5jb20vamFzaGtlbmFzL3VuZGVyc2NvcmUvcHVsbC8yMTQwKS5cbiAgICBmdW5jdGlvbiBfcmVzdFBhcmFtKGZ1bmMsIHN0YXJ0SW5kZXgpIHtcbiAgICAgICAgc3RhcnRJbmRleCA9IHN0YXJ0SW5kZXggPT0gbnVsbCA/IGZ1bmMubGVuZ3RoIC0gMSA6ICtzdGFydEluZGV4O1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgbGVuZ3RoID0gTWF0aC5tYXgoYXJndW1lbnRzLmxlbmd0aCAtIHN0YXJ0SW5kZXgsIDApO1xuICAgICAgICAgICAgdmFyIHJlc3QgPSBBcnJheShsZW5ndGgpO1xuICAgICAgICAgICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgICAgICAgIHJlc3RbaW5kZXhdID0gYXJndW1lbnRzW2luZGV4ICsgc3RhcnRJbmRleF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzd2l0Y2ggKHN0YXJ0SW5kZXgpIHtcbiAgICAgICAgICAgICAgICBjYXNlIDA6IHJldHVybiBmdW5jLmNhbGwodGhpcywgcmVzdCk7XG4gICAgICAgICAgICAgICAgY2FzZSAxOiByZXR1cm4gZnVuYy5jYWxsKHRoaXMsIGFyZ3VtZW50c1swXSwgcmVzdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBDdXJyZW50bHkgdW51c2VkIGJ1dCBoYW5kbGUgY2FzZXMgb3V0c2lkZSBvZiB0aGUgc3dpdGNoIHN0YXRlbWVudDpcbiAgICAgICAgICAgIC8vIHZhciBhcmdzID0gQXJyYXkoc3RhcnRJbmRleCArIDEpO1xuICAgICAgICAgICAgLy8gZm9yIChpbmRleCA9IDA7IGluZGV4IDwgc3RhcnRJbmRleDsgaW5kZXgrKykge1xuICAgICAgICAgICAgLy8gICAgIGFyZ3NbaW5kZXhdID0gYXJndW1lbnRzW2luZGV4XTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIC8vIGFyZ3Nbc3RhcnRJbmRleF0gPSByZXN0O1xuICAgICAgICAgICAgLy8gcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX3dpdGhvdXRJbmRleChpdGVyYXRvcikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHZhbHVlLCBpbmRleCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHJldHVybiBpdGVyYXRvcih2YWx1ZSwgY2FsbGJhY2spO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vLy8gZXhwb3J0ZWQgYXN5bmMgbW9kdWxlIGZ1bmN0aW9ucyAvLy8vXG5cbiAgICAvLy8vIG5leHRUaWNrIGltcGxlbWVudGF0aW9uIHdpdGggYnJvd3Nlci1jb21wYXRpYmxlIGZhbGxiYWNrIC8vLy9cblxuICAgIC8vIGNhcHR1cmUgdGhlIGdsb2JhbCByZWZlcmVuY2UgdG8gZ3VhcmQgYWdhaW5zdCBmYWtlVGltZXIgbW9ja3NcbiAgICB2YXIgX3NldEltbWVkaWF0ZSA9IHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09ICdmdW5jdGlvbicgJiYgc2V0SW1tZWRpYXRlO1xuXG4gICAgdmFyIF9kZWxheSA9IF9zZXRJbW1lZGlhdGUgPyBmdW5jdGlvbihmbikge1xuICAgICAgICAvLyBub3QgYSBkaXJlY3QgYWxpYXMgZm9yIElFMTAgY29tcGF0aWJpbGl0eVxuICAgICAgICBfc2V0SW1tZWRpYXRlKGZuKTtcbiAgICB9IDogZnVuY3Rpb24oZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcblxuICAgIGlmICh0eXBlb2YgcHJvY2VzcyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHByb2Nlc3MubmV4dFRpY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgYXN5bmMubmV4dFRpY2sgPSBwcm9jZXNzLm5leHRUaWNrO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGFzeW5jLm5leHRUaWNrID0gX2RlbGF5O1xuICAgIH1cbiAgICBhc3luYy5zZXRJbW1lZGlhdGUgPSBfc2V0SW1tZWRpYXRlID8gX2RlbGF5IDogYXN5bmMubmV4dFRpY2s7XG5cblxuICAgIGFzeW5jLmZvckVhY2ggPVxuICAgIGFzeW5jLmVhY2ggPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIGFzeW5jLmVhY2hPZihhcnIsIF93aXRob3V0SW5kZXgoaXRlcmF0b3IpLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLmZvckVhY2hTZXJpZXMgPVxuICAgIGFzeW5jLmVhY2hTZXJpZXMgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIGFzeW5jLmVhY2hPZlNlcmllcyhhcnIsIF93aXRob3V0SW5kZXgoaXRlcmF0b3IpLCBjYWxsYmFjayk7XG4gICAgfTtcblxuXG4gICAgYXN5bmMuZm9yRWFjaExpbWl0ID1cbiAgICBhc3luYy5lYWNoTGltaXQgPSBmdW5jdGlvbiAoYXJyLCBsaW1pdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBfZWFjaE9mTGltaXQobGltaXQpKGFyciwgX3dpdGhvdXRJbmRleChpdGVyYXRvciksIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuZm9yRWFjaE9mID1cbiAgICBhc3luYy5lYWNoT2YgPSBmdW5jdGlvbiAob2JqZWN0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBfb25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICAgICAgb2JqZWN0ID0gb2JqZWN0IHx8IFtdO1xuXG4gICAgICAgIHZhciBpdGVyID0gX2tleUl0ZXJhdG9yKG9iamVjdCk7XG4gICAgICAgIHZhciBrZXksIGNvbXBsZXRlZCA9IDA7XG5cbiAgICAgICAgd2hpbGUgKChrZXkgPSBpdGVyKCkpICE9IG51bGwpIHtcbiAgICAgICAgICAgIGNvbXBsZXRlZCArPSAxO1xuICAgICAgICAgICAgaXRlcmF0b3Iob2JqZWN0W2tleV0sIGtleSwgb25seV9vbmNlKGRvbmUpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb21wbGV0ZWQgPT09IDApIGNhbGxiYWNrKG51bGwpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGRvbmUoZXJyKSB7XG4gICAgICAgICAgICBjb21wbGV0ZWQtLTtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQ2hlY2sga2V5IGlzIG51bGwgaW4gY2FzZSBpdGVyYXRvciBpc24ndCBleGhhdXN0ZWRcbiAgICAgICAgICAgIC8vIGFuZCBkb25lIHJlc29sdmVkIHN5bmNocm9ub3VzbHkuXG4gICAgICAgICAgICBlbHNlIGlmIChrZXkgPT09IG51bGwgJiYgY29tcGxldGVkIDw9IDApIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBhc3luYy5mb3JFYWNoT2ZTZXJpZXMgPVxuICAgIGFzeW5jLmVhY2hPZlNlcmllcyA9IGZ1bmN0aW9uIChvYmosIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IF9vbmNlKGNhbGxiYWNrIHx8IG5vb3ApO1xuICAgICAgICBvYmogPSBvYmogfHwgW107XG4gICAgICAgIHZhciBuZXh0S2V5ID0gX2tleUl0ZXJhdG9yKG9iaik7XG4gICAgICAgIHZhciBrZXkgPSBuZXh0S2V5KCk7XG4gICAgICAgIGZ1bmN0aW9uIGl0ZXJhdGUoKSB7XG4gICAgICAgICAgICB2YXIgc3luYyA9IHRydWU7XG4gICAgICAgICAgICBpZiAoa2V5ID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaXRlcmF0b3Iob2JqW2tleV0sIGtleSwgb25seV9vbmNlKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBrZXkgPSBuZXh0S2V5KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXkgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzeW5jKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlKGl0ZXJhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVyYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICBzeW5jID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaXRlcmF0ZSgpO1xuICAgIH07XG5cblxuXG4gICAgYXN5bmMuZm9yRWFjaE9mTGltaXQgPVxuICAgIGFzeW5jLmVhY2hPZkxpbWl0ID0gZnVuY3Rpb24gKG9iaiwgbGltaXQsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBfZWFjaE9mTGltaXQobGltaXQpKG9iaiwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX2VhY2hPZkxpbWl0KGxpbWl0KSB7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChvYmosIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBfb25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICAgICAgICAgIG9iaiA9IG9iaiB8fCBbXTtcbiAgICAgICAgICAgIHZhciBuZXh0S2V5ID0gX2tleUl0ZXJhdG9yKG9iaik7XG4gICAgICAgICAgICBpZiAobGltaXQgPD0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBkb25lID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgcnVubmluZyA9IDA7XG4gICAgICAgICAgICB2YXIgZXJyb3JlZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICAoZnVuY3Rpb24gcmVwbGVuaXNoICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoZG9uZSAmJiBydW5uaW5nIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHdoaWxlIChydW5uaW5nIDwgbGltaXQgJiYgIWVycm9yZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IG5leHRLZXkoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocnVubmluZyA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcnVubmluZyArPSAxO1xuICAgICAgICAgICAgICAgICAgICBpdGVyYXRvcihvYmpba2V5XSwga2V5LCBvbmx5X29uY2UoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcnVubmluZyAtPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBsZW5pc2goKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKCk7XG4gICAgICAgIH07XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBkb1BhcmFsbGVsKGZuKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAob2JqLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHJldHVybiBmbihhc3luYy5lYWNoT2YsIG9iaiwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZG9QYXJhbGxlbExpbWl0KGZuKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAob2JqLCBsaW1pdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gZm4oX2VhY2hPZkxpbWl0KGxpbWl0KSwgb2JqLCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBmdW5jdGlvbiBkb1Nlcmllcyhmbikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKG9iaiwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gZm4oYXN5bmMuZWFjaE9mU2VyaWVzLCBvYmosIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2FzeW5jTWFwKGVhY2hmbiwgYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBfb25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICAgICAgYXJyID0gYXJyIHx8IFtdO1xuICAgICAgICB2YXIgcmVzdWx0cyA9IF9pc0FycmF5TGlrZShhcnIpID8gW10gOiB7fTtcbiAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHZhbHVlLCBpbmRleCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHZhbHVlLCBmdW5jdGlvbiAoZXJyLCB2KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0c1tpbmRleF0gPSB2O1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHRzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgYXN5bmMubWFwID0gZG9QYXJhbGxlbChfYXN5bmNNYXApO1xuICAgIGFzeW5jLm1hcFNlcmllcyA9IGRvU2VyaWVzKF9hc3luY01hcCk7XG4gICAgYXN5bmMubWFwTGltaXQgPSBkb1BhcmFsbGVsTGltaXQoX2FzeW5jTWFwKTtcblxuICAgIC8vIHJlZHVjZSBvbmx5IGhhcyBhIHNlcmllcyB2ZXJzaW9uLCBhcyBkb2luZyByZWR1Y2UgaW4gcGFyYWxsZWwgd29uJ3RcbiAgICAvLyB3b3JrIGluIG1hbnkgc2l0dWF0aW9ucy5cbiAgICBhc3luYy5pbmplY3QgPVxuICAgIGFzeW5jLmZvbGRsID1cbiAgICBhc3luYy5yZWR1Y2UgPSBmdW5jdGlvbiAoYXJyLCBtZW1vLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgYXN5bmMuZWFjaE9mU2VyaWVzKGFyciwgZnVuY3Rpb24gKHgsIGksIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcihtZW1vLCB4LCBmdW5jdGlvbiAoZXJyLCB2KSB7XG4gICAgICAgICAgICAgICAgbWVtbyA9IHY7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIsIG1lbW8pO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgYXN5bmMuZm9sZHIgPVxuICAgIGFzeW5jLnJlZHVjZVJpZ2h0ID0gZnVuY3Rpb24gKGFyciwgbWVtbywgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByZXZlcnNlZCA9IF9tYXAoYXJyLCBpZGVudGl0eSkucmV2ZXJzZSgpO1xuICAgICAgICBhc3luYy5yZWR1Y2UocmV2ZXJzZWQsIG1lbW8sIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChhcnIsIG1lbW8sIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBpdGVyYXRvcjtcbiAgICAgICAgICAgIGl0ZXJhdG9yID0gbWVtbztcbiAgICAgICAgICAgIG1lbW8gPSBfaXNBcnJheShhcnIpID8gW10gOiB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFzeW5jLmVhY2hPZihhcnIsIGZ1bmN0aW9uKHYsIGssIGNiKSB7XG4gICAgICAgICAgICBpdGVyYXRvcihtZW1vLCB2LCBrLCBjYik7XG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBtZW1vKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIF9maWx0ZXIoZWFjaGZuLCBhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgICAgICBlYWNoZm4oYXJyLCBmdW5jdGlvbiAoeCwgaW5kZXgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7aW5kZXg6IGluZGV4LCB2YWx1ZTogeH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKF9tYXAocmVzdWx0cy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGEuaW5kZXggLSBiLmluZGV4O1xuICAgICAgICAgICAgfSksIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHgudmFsdWU7XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFzeW5jLnNlbGVjdCA9XG4gICAgYXN5bmMuZmlsdGVyID0gZG9QYXJhbGxlbChfZmlsdGVyKTtcblxuICAgIGFzeW5jLnNlbGVjdExpbWl0ID1cbiAgICBhc3luYy5maWx0ZXJMaW1pdCA9IGRvUGFyYWxsZWxMaW1pdChfZmlsdGVyKTtcblxuICAgIGFzeW5jLnNlbGVjdFNlcmllcyA9XG4gICAgYXN5bmMuZmlsdGVyU2VyaWVzID0gZG9TZXJpZXMoX2ZpbHRlcik7XG5cbiAgICBmdW5jdGlvbiBfcmVqZWN0KGVhY2hmbiwgYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgX2ZpbHRlcihlYWNoZm4sIGFyciwgZnVuY3Rpb24odmFsdWUsIGNiKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih2YWx1ZSwgZnVuY3Rpb24odikge1xuICAgICAgICAgICAgICAgIGNiKCF2KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBjYWxsYmFjayk7XG4gICAgfVxuICAgIGFzeW5jLnJlamVjdCA9IGRvUGFyYWxsZWwoX3JlamVjdCk7XG4gICAgYXN5bmMucmVqZWN0TGltaXQgPSBkb1BhcmFsbGVsTGltaXQoX3JlamVjdCk7XG4gICAgYXN5bmMucmVqZWN0U2VyaWVzID0gZG9TZXJpZXMoX3JlamVjdCk7XG5cbiAgICBmdW5jdGlvbiBfY3JlYXRlVGVzdGVyKGVhY2hmbiwgY2hlY2ssIGdldFJlc3VsdCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oYXJyLCBsaW1pdCwgaXRlcmF0b3IsIGNiKSB7XG4gICAgICAgICAgICBmdW5jdGlvbiBkb25lKCkge1xuICAgICAgICAgICAgICAgIGlmIChjYikgY2IoZ2V0UmVzdWx0KGZhbHNlLCB2b2lkIDApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZ1bmN0aW9uIGl0ZXJhdGVlKHgsIF8sIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFjYikgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgaXRlcmF0b3IoeCwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNiICYmIGNoZWNrKHYpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYihnZXRSZXN1bHQodHJ1ZSwgeCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2IgPSBpdGVyYXRvciA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDMpIHtcbiAgICAgICAgICAgICAgICBlYWNoZm4oYXJyLCBsaW1pdCwgaXRlcmF0ZWUsIGRvbmUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYiA9IGl0ZXJhdG9yO1xuICAgICAgICAgICAgICAgIGl0ZXJhdG9yID0gbGltaXQ7XG4gICAgICAgICAgICAgICAgZWFjaGZuKGFyciwgaXRlcmF0ZWUsIGRvbmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGFzeW5jLmFueSA9XG4gICAgYXN5bmMuc29tZSA9IF9jcmVhdGVUZXN0ZXIoYXN5bmMuZWFjaE9mLCB0b0Jvb2wsIGlkZW50aXR5KTtcblxuICAgIGFzeW5jLnNvbWVMaW1pdCA9IF9jcmVhdGVUZXN0ZXIoYXN5bmMuZWFjaE9mTGltaXQsIHRvQm9vbCwgaWRlbnRpdHkpO1xuXG4gICAgYXN5bmMuYWxsID1cbiAgICBhc3luYy5ldmVyeSA9IF9jcmVhdGVUZXN0ZXIoYXN5bmMuZWFjaE9mLCBub3RJZCwgbm90SWQpO1xuXG4gICAgYXN5bmMuZXZlcnlMaW1pdCA9IF9jcmVhdGVUZXN0ZXIoYXN5bmMuZWFjaE9mTGltaXQsIG5vdElkLCBub3RJZCk7XG5cbiAgICBmdW5jdGlvbiBfZmluZEdldFJlc3VsdCh2LCB4KSB7XG4gICAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgICBhc3luYy5kZXRlY3QgPSBfY3JlYXRlVGVzdGVyKGFzeW5jLmVhY2hPZiwgaWRlbnRpdHksIF9maW5kR2V0UmVzdWx0KTtcbiAgICBhc3luYy5kZXRlY3RTZXJpZXMgPSBfY3JlYXRlVGVzdGVyKGFzeW5jLmVhY2hPZlNlcmllcywgaWRlbnRpdHksIF9maW5kR2V0UmVzdWx0KTtcbiAgICBhc3luYy5kZXRlY3RMaW1pdCA9IF9jcmVhdGVUZXN0ZXIoYXN5bmMuZWFjaE9mTGltaXQsIGlkZW50aXR5LCBfZmluZEdldFJlc3VsdCk7XG5cbiAgICBhc3luYy5zb3J0QnkgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgYXN5bmMubWFwKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LCBmdW5jdGlvbiAoZXJyLCBjcml0ZXJpYSkge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHt2YWx1ZTogeCwgY3JpdGVyaWE6IGNyaXRlcmlhfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIsIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIF9tYXAocmVzdWx0cy5zb3J0KGNvbXBhcmF0b3IpLCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geC52YWx1ZTtcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gY29tcGFyYXRvcihsZWZ0LCByaWdodCkge1xuICAgICAgICAgICAgdmFyIGEgPSBsZWZ0LmNyaXRlcmlhLCBiID0gcmlnaHQuY3JpdGVyaWE7XG4gICAgICAgICAgICByZXR1cm4gYSA8IGIgPyAtMSA6IGEgPiBiID8gMSA6IDA7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgYXN5bmMuYXV0byA9IGZ1bmN0aW9uICh0YXNrcywgY29uY3VycmVuY3ksIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYXJndW1lbnRzWzFdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAvLyBjb25jdXJyZW5jeSBpcyBvcHRpb25hbCwgc2hpZnQgdGhlIGFyZ3MuXG4gICAgICAgICAgICBjYWxsYmFjayA9IGNvbmN1cnJlbmN5O1xuICAgICAgICAgICAgY29uY3VycmVuY3kgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGNhbGxiYWNrID0gX29uY2UoY2FsbGJhY2sgfHwgbm9vcCk7XG4gICAgICAgIHZhciBrZXlzID0gX2tleXModGFza3MpO1xuICAgICAgICB2YXIgcmVtYWluaW5nVGFza3MgPSBrZXlzLmxlbmd0aDtcbiAgICAgICAgaWYgKCFyZW1haW5pbmdUYXNrcykge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY29uY3VycmVuY3kpIHtcbiAgICAgICAgICAgIGNvbmN1cnJlbmN5ID0gcmVtYWluaW5nVGFza3M7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcmVzdWx0cyA9IHt9O1xuICAgICAgICB2YXIgcnVubmluZ1Rhc2tzID0gMDtcblxuICAgICAgICB2YXIgaGFzRXJyb3IgPSBmYWxzZTtcblxuICAgICAgICB2YXIgbGlzdGVuZXJzID0gW107XG4gICAgICAgIGZ1bmN0aW9uIGFkZExpc3RlbmVyKGZuKSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnMudW5zaGlmdChmbik7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIoZm4pIHtcbiAgICAgICAgICAgIHZhciBpZHggPSBfaW5kZXhPZihsaXN0ZW5lcnMsIGZuKTtcbiAgICAgICAgICAgIGlmIChpZHggPj0gMCkgbGlzdGVuZXJzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIHRhc2tDb21wbGV0ZSgpIHtcbiAgICAgICAgICAgIHJlbWFpbmluZ1Rhc2tzLS07XG4gICAgICAgICAgICBfYXJyYXlFYWNoKGxpc3RlbmVycy5zbGljZSgwKSwgZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgYWRkTGlzdGVuZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKCFyZW1haW5pbmdUYXNrcykge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBfYXJyYXlFYWNoKGtleXMsIGZ1bmN0aW9uIChrKSB7XG4gICAgICAgICAgICBpZiAoaGFzRXJyb3IpIHJldHVybjtcbiAgICAgICAgICAgIHZhciB0YXNrID0gX2lzQXJyYXkodGFza3Nba10pID8gdGFza3Nba106IFt0YXNrc1trXV07XG4gICAgICAgICAgICB2YXIgdGFza0NhbGxiYWNrID0gX3Jlc3RQYXJhbShmdW5jdGlvbihlcnIsIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICBydW5uaW5nVGFza3MtLTtcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2FmZVJlc3VsdHMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgX2ZvckVhY2hPZihyZXN1bHRzLCBmdW5jdGlvbih2YWwsIHJrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhZmVSZXN1bHRzW3JrZXldID0gdmFsO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc2FmZVJlc3VsdHNba10gPSBhcmdzO1xuICAgICAgICAgICAgICAgICAgICBoYXNFcnJvciA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBzYWZlUmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzW2tdID0gYXJncztcbiAgICAgICAgICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlKHRhc2tDb21wbGV0ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIgcmVxdWlyZXMgPSB0YXNrLnNsaWNlKDAsIHRhc2subGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICAvLyBwcmV2ZW50IGRlYWQtbG9ja3NcbiAgICAgICAgICAgIHZhciBsZW4gPSByZXF1aXJlcy5sZW5ndGg7XG4gICAgICAgICAgICB2YXIgZGVwO1xuICAgICAgICAgICAgd2hpbGUgKGxlbi0tKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoZGVwID0gdGFza3NbcmVxdWlyZXNbbGVuXV0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSGFzIG5vbmV4aXN0ZW50IGRlcGVuZGVuY3kgaW4gJyArIHJlcXVpcmVzLmpvaW4oJywgJykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoX2lzQXJyYXkoZGVwKSAmJiBfaW5kZXhPZihkZXAsIGspID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdIYXMgY3ljbGljIGRlcGVuZGVuY2llcycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZ1bmN0aW9uIHJlYWR5KCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBydW5uaW5nVGFza3MgPCBjb25jdXJyZW5jeSAmJiBfcmVkdWNlKHJlcXVpcmVzLCBmdW5jdGlvbiAoYSwgeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKGEgJiYgcmVzdWx0cy5oYXNPd25Qcm9wZXJ0eSh4KSk7XG4gICAgICAgICAgICAgICAgfSwgdHJ1ZSkgJiYgIXJlc3VsdHMuaGFzT3duUHJvcGVydHkoayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVhZHkoKSkge1xuICAgICAgICAgICAgICAgIHJ1bm5pbmdUYXNrcysrO1xuICAgICAgICAgICAgICAgIHRhc2tbdGFzay5sZW5ndGggLSAxXSh0YXNrQ2FsbGJhY2ssIHJlc3VsdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYWRkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnVuY3Rpb24gbGlzdGVuZXIoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlYWR5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcnVubmluZ1Rhc2tzKys7XG4gICAgICAgICAgICAgICAgICAgIHJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgdGFza1t0YXNrLmxlbmd0aCAtIDFdKHRhc2tDYWxsYmFjaywgcmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG5cblxuICAgIGFzeW5jLnJldHJ5ID0gZnVuY3Rpb24odGltZXMsIHRhc2ssIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBERUZBVUxUX1RJTUVTID0gNTtcbiAgICAgICAgdmFyIERFRkFVTFRfSU5URVJWQUwgPSAwO1xuXG4gICAgICAgIHZhciBhdHRlbXB0cyA9IFtdO1xuXG4gICAgICAgIHZhciBvcHRzID0ge1xuICAgICAgICAgICAgdGltZXM6IERFRkFVTFRfVElNRVMsXG4gICAgICAgICAgICBpbnRlcnZhbDogREVGQVVMVF9JTlRFUlZBTFxuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIHBhcnNlVGltZXMoYWNjLCB0KXtcbiAgICAgICAgICAgIGlmKHR5cGVvZiB0ID09PSAnbnVtYmVyJyl7XG4gICAgICAgICAgICAgICAgYWNjLnRpbWVzID0gcGFyc2VJbnQodCwgMTApIHx8IERFRkFVTFRfVElNRVM7XG4gICAgICAgICAgICB9IGVsc2UgaWYodHlwZW9mIHQgPT09ICdvYmplY3QnKXtcbiAgICAgICAgICAgICAgICBhY2MudGltZXMgPSBwYXJzZUludCh0LnRpbWVzLCAxMCkgfHwgREVGQVVMVF9USU1FUztcbiAgICAgICAgICAgICAgICBhY2MuaW50ZXJ2YWwgPSBwYXJzZUludCh0LmludGVydmFsLCAxMCkgfHwgREVGQVVMVF9JTlRFUlZBTDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbnN1cHBvcnRlZCBhcmd1bWVudCB0eXBlIGZvciBcXCd0aW1lc1xcJzogJyArIHR5cGVvZiB0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBpZiAobGVuZ3RoIDwgMSB8fCBsZW5ndGggPiAzKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgYXJndW1lbnRzIC0gbXVzdCBiZSBlaXRoZXIgKHRhc2spLCAodGFzaywgY2FsbGJhY2spLCAodGltZXMsIHRhc2spIG9yICh0aW1lcywgdGFzaywgY2FsbGJhY2spJyk7XG4gICAgICAgIH0gZWxzZSBpZiAobGVuZ3RoIDw9IDIgJiYgdHlwZW9mIHRpbWVzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IHRhc2s7XG4gICAgICAgICAgICB0YXNrID0gdGltZXM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiB0aW1lcyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcGFyc2VUaW1lcyhvcHRzLCB0aW1lcyk7XG4gICAgICAgIH1cbiAgICAgICAgb3B0cy5jYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICBvcHRzLnRhc2sgPSB0YXNrO1xuXG4gICAgICAgIGZ1bmN0aW9uIHdyYXBwZWRUYXNrKHdyYXBwZWRDYWxsYmFjaywgd3JhcHBlZFJlc3VsdHMpIHtcbiAgICAgICAgICAgIGZ1bmN0aW9uIHJldHJ5QXR0ZW1wdCh0YXNrLCBmaW5hbEF0dGVtcHQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oc2VyaWVzQ2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgdGFzayhmdW5jdGlvbihlcnIsIHJlc3VsdCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXJpZXNDYWxsYmFjayghZXJyIHx8IGZpbmFsQXR0ZW1wdCwge2VycjogZXJyLCByZXN1bHQ6IHJlc3VsdH0pO1xuICAgICAgICAgICAgICAgICAgICB9LCB3cmFwcGVkUmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gcmV0cnlJbnRlcnZhbChpbnRlcnZhbCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHNlcmllc0NhbGxiYWNrKXtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VyaWVzQ2FsbGJhY2sobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIGludGVydmFsKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB3aGlsZSAob3B0cy50aW1lcykge1xuXG4gICAgICAgICAgICAgICAgdmFyIGZpbmFsQXR0ZW1wdCA9ICEob3B0cy50aW1lcy09MSk7XG4gICAgICAgICAgICAgICAgYXR0ZW1wdHMucHVzaChyZXRyeUF0dGVtcHQob3B0cy50YXNrLCBmaW5hbEF0dGVtcHQpKTtcbiAgICAgICAgICAgICAgICBpZighZmluYWxBdHRlbXB0ICYmIG9wdHMuaW50ZXJ2YWwgPiAwKXtcbiAgICAgICAgICAgICAgICAgICAgYXR0ZW1wdHMucHVzaChyZXRyeUludGVydmFsKG9wdHMuaW50ZXJ2YWwpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGFzeW5jLnNlcmllcyhhdHRlbXB0cywgZnVuY3Rpb24oZG9uZSwgZGF0YSl7XG4gICAgICAgICAgICAgICAgZGF0YSA9IGRhdGFbZGF0YS5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICAod3JhcHBlZENhbGxiYWNrIHx8IG9wdHMuY2FsbGJhY2spKGRhdGEuZXJyLCBkYXRhLnJlc3VsdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIGEgY2FsbGJhY2sgaXMgcGFzc2VkLCBydW4gdGhpcyBhcyBhIGNvbnRyb2xsIGZsb3dcbiAgICAgICAgcmV0dXJuIG9wdHMuY2FsbGJhY2sgPyB3cmFwcGVkVGFzaygpIDogd3JhcHBlZFRhc2s7XG4gICAgfTtcblxuICAgIGFzeW5jLndhdGVyZmFsbCA9IGZ1bmN0aW9uICh0YXNrcywgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBfb25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICAgICAgaWYgKCFfaXNBcnJheSh0YXNrcykpIHtcbiAgICAgICAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoJ0ZpcnN0IGFyZ3VtZW50IHRvIHdhdGVyZmFsbCBtdXN0IGJlIGFuIGFycmF5IG9mIGZ1bmN0aW9ucycpO1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0YXNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIHdyYXBJdGVyYXRvcihpdGVyYXRvcikge1xuICAgICAgICAgICAgcmV0dXJuIF9yZXN0UGFyYW0oZnVuY3Rpb24gKGVyciwgYXJncykge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgW2Vycl0uY29uY2F0KGFyZ3MpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXh0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5wdXNoKHdyYXBJdGVyYXRvcihuZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVuc3VyZUFzeW5jKGl0ZXJhdG9yKS5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB3cmFwSXRlcmF0b3IoYXN5bmMuaXRlcmF0b3IodGFza3MpKSgpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBfcGFyYWxsZWwoZWFjaGZuLCB0YXNrcywgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBub29wO1xuICAgICAgICB2YXIgcmVzdWx0cyA9IF9pc0FycmF5TGlrZSh0YXNrcykgPyBbXSA6IHt9O1xuXG4gICAgICAgIGVhY2hmbih0YXNrcywgZnVuY3Rpb24gKHRhc2ssIGtleSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHRhc2soX3Jlc3RQYXJhbShmdW5jdGlvbiAoZXJyLCBhcmdzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgYXJncyA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdHNba2V5XSA9IGFyZ3M7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHRzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgYXN5bmMucGFyYWxsZWwgPSBmdW5jdGlvbiAodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIF9wYXJhbGxlbChhc3luYy5lYWNoT2YsIHRhc2tzLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLnBhcmFsbGVsTGltaXQgPSBmdW5jdGlvbih0YXNrcywgbGltaXQsIGNhbGxiYWNrKSB7XG4gICAgICAgIF9wYXJhbGxlbChfZWFjaE9mTGltaXQobGltaXQpLCB0YXNrcywgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBhc3luYy5zZXJpZXMgPSBmdW5jdGlvbih0YXNrcywgY2FsbGJhY2spIHtcbiAgICAgICAgX3BhcmFsbGVsKGFzeW5jLmVhY2hPZlNlcmllcywgdGFza3MsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuaXRlcmF0b3IgPSBmdW5jdGlvbiAodGFza3MpIHtcbiAgICAgICAgZnVuY3Rpb24gbWFrZUNhbGxiYWNrKGluZGV4KSB7XG4gICAgICAgICAgICBmdW5jdGlvbiBmbigpIHtcbiAgICAgICAgICAgICAgICBpZiAodGFza3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhc2tzW2luZGV4XS5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZm4ubmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm4ubmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGluZGV4IDwgdGFza3MubGVuZ3RoIC0gMSkgPyBtYWtlQ2FsbGJhY2soaW5kZXggKyAxKTogbnVsbDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZm47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1ha2VDYWxsYmFjaygwKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuYXBwbHkgPSBfcmVzdFBhcmFtKGZ1bmN0aW9uIChmbiwgYXJncykge1xuICAgICAgICByZXR1cm4gX3Jlc3RQYXJhbShmdW5jdGlvbiAoY2FsbEFyZ3MpIHtcbiAgICAgICAgICAgIHJldHVybiBmbi5hcHBseShcbiAgICAgICAgICAgICAgICBudWxsLCBhcmdzLmNvbmNhdChjYWxsQXJncylcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gX2NvbmNhdChlYWNoZm4sIGFyciwgZm4sIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHgsIGluZGV4LCBjYikge1xuICAgICAgICAgICAgZm4oeCwgZnVuY3Rpb24gKGVyciwgeSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdC5jb25jYXQoeSB8fCBbXSk7XG4gICAgICAgICAgICAgICAgY2IoZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIsIHJlc3VsdCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBhc3luYy5jb25jYXQgPSBkb1BhcmFsbGVsKF9jb25jYXQpO1xuICAgIGFzeW5jLmNvbmNhdFNlcmllcyA9IGRvU2VyaWVzKF9jb25jYXQpO1xuXG4gICAgYXN5bmMud2hpbHN0ID0gZnVuY3Rpb24gKHRlc3QsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IG5vb3A7XG4gICAgICAgIGlmICh0ZXN0KCkpIHtcbiAgICAgICAgICAgIHZhciBuZXh0ID0gX3Jlc3RQYXJhbShmdW5jdGlvbihlcnIsIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0ZXN0LmFwcGx5KHRoaXMsIGFyZ3MpKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZXJhdG9yKG5leHQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KG51bGwsIFtudWxsXS5jb25jYXQoYXJncykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaXRlcmF0b3IobmV4dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBhc3luYy5kb1doaWxzdCA9IGZ1bmN0aW9uIChpdGVyYXRvciwgdGVzdCwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGNhbGxzID0gMDtcbiAgICAgICAgcmV0dXJuIGFzeW5jLndoaWxzdChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiArK2NhbGxzIDw9IDEgfHwgdGVzdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9LCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBhc3luYy51bnRpbCA9IGZ1bmN0aW9uICh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIGFzeW5jLndoaWxzdChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiAhdGVzdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9LCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBhc3luYy5kb1VudGlsID0gZnVuY3Rpb24gKGl0ZXJhdG9yLCB0ZXN0LCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gYXN5bmMuZG9XaGlsc3QoaXRlcmF0b3IsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuICF0ZXN0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH0sIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuZHVyaW5nID0gZnVuY3Rpb24gKHRlc3QsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IG5vb3A7XG5cbiAgICAgICAgdmFyIG5leHQgPSBfcmVzdFBhcmFtKGZ1bmN0aW9uKGVyciwgYXJncykge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFyZ3MucHVzaChjaGVjayk7XG4gICAgICAgICAgICAgICAgdGVzdC5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIGNoZWNrID0gZnVuY3Rpb24oZXJyLCB0cnV0aCkge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRydXRoKSB7XG4gICAgICAgICAgICAgICAgaXRlcmF0b3IobmV4dCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHRlc3QoY2hlY2spO1xuICAgIH07XG5cbiAgICBhc3luYy5kb0R1cmluZyA9IGZ1bmN0aW9uIChpdGVyYXRvciwgdGVzdCwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGNhbGxzID0gMDtcbiAgICAgICAgYXN5bmMuZHVyaW5nKGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgIGlmIChjYWxscysrIDwgMSkge1xuICAgICAgICAgICAgICAgIG5leHQobnVsbCwgdHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRlc3QuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX3F1ZXVlKHdvcmtlciwgY29uY3VycmVuY3ksIHBheWxvYWQpIHtcbiAgICAgICAgaWYgKGNvbmN1cnJlbmN5ID09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbmN1cnJlbmN5ID0gMTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKGNvbmN1cnJlbmN5ID09PSAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmN1cnJlbmN5IG11c3Qgbm90IGJlIHplcm8nKTtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBfaW5zZXJ0KHEsIGRhdGEsIHBvcywgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAhPSBudWxsICYmIHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidGFzayBjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBxLnN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKCFfaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgIGRhdGEgPSBbZGF0YV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihkYXRhLmxlbmd0aCA9PT0gMCAmJiBxLmlkbGUoKSkge1xuICAgICAgICAgICAgICAgIC8vIGNhbGwgZHJhaW4gaW1tZWRpYXRlbHkgaWYgdGhlcmUgYXJlIG5vIHRhc2tzXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFzeW5jLnNldEltbWVkaWF0ZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcS5kcmFpbigpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgX2FycmF5RWFjaChkYXRhLCBmdW5jdGlvbih0YXNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGl0ZW0gPSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHRhc2ssXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBjYWxsYmFjayB8fCBub29wXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGlmIChwb3MpIHtcbiAgICAgICAgICAgICAgICAgICAgcS50YXNrcy51bnNoaWZ0KGl0ZW0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHEudGFza3MucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocS50YXNrcy5sZW5ndGggPT09IHEuY29uY3VycmVuY3kpIHtcbiAgICAgICAgICAgICAgICAgICAgcS5zYXR1cmF0ZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZShxLnByb2Nlc3MpO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIF9uZXh0KHEsIHRhc2tzKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICB3b3JrZXJzIC09IDE7XG5cbiAgICAgICAgICAgICAgICB2YXIgcmVtb3ZlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgICAgIF9hcnJheUVhY2godGFza3MsIGZ1bmN0aW9uICh0YXNrKSB7XG4gICAgICAgICAgICAgICAgICAgIF9hcnJheUVhY2god29ya2Vyc0xpc3QsIGZ1bmN0aW9uICh3b3JrZXIsIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAod29ya2VyID09PSB0YXNrICYmICFyZW1vdmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2Vyc0xpc3Quc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgdGFzay5jYWxsYmFjay5hcHBseSh0YXNrLCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAocS50YXNrcy5sZW5ndGggKyB3b3JrZXJzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHEuZHJhaW4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcS5wcm9jZXNzKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHdvcmtlcnMgPSAwO1xuICAgICAgICB2YXIgd29ya2Vyc0xpc3QgPSBbXTtcbiAgICAgICAgdmFyIHEgPSB7XG4gICAgICAgICAgICB0YXNrczogW10sXG4gICAgICAgICAgICBjb25jdXJyZW5jeTogY29uY3VycmVuY3ksXG4gICAgICAgICAgICBwYXlsb2FkOiBwYXlsb2FkLFxuICAgICAgICAgICAgc2F0dXJhdGVkOiBub29wLFxuICAgICAgICAgICAgZW1wdHk6IG5vb3AsXG4gICAgICAgICAgICBkcmFpbjogbm9vcCxcbiAgICAgICAgICAgIHN0YXJ0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgcGF1c2VkOiBmYWxzZSxcbiAgICAgICAgICAgIHB1c2g6IGZ1bmN0aW9uIChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIF9pbnNlcnQocSwgZGF0YSwgZmFsc2UsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBraWxsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcS5kcmFpbiA9IG5vb3A7XG4gICAgICAgICAgICAgICAgcS50YXNrcyA9IFtdO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVuc2hpZnQ6IGZ1bmN0aW9uIChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIF9pbnNlcnQocSwgZGF0YSwgdHJ1ZSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByb2Nlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB3aGlsZSghcS5wYXVzZWQgJiYgd29ya2VycyA8IHEuY29uY3VycmVuY3kgJiYgcS50YXNrcy5sZW5ndGgpe1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciB0YXNrcyA9IHEucGF5bG9hZCA/XG4gICAgICAgICAgICAgICAgICAgICAgICBxLnRhc2tzLnNwbGljZSgwLCBxLnBheWxvYWQpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHEudGFza3Muc3BsaWNlKDAsIHEudGFza3MubGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IF9tYXAodGFza3MsIGZ1bmN0aW9uICh0YXNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFzay5kYXRhO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAocS50YXNrcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHEuZW1wdHkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB3b3JrZXJzICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIHdvcmtlcnNMaXN0LnB1c2godGFza3NbMF0pO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2IgPSBvbmx5X29uY2UoX25leHQocSwgdGFza3MpKTtcbiAgICAgICAgICAgICAgICAgICAgd29ya2VyKGRhdGEsIGNiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGVuZ3RoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHEudGFza3MubGVuZ3RoO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJ1bm5pbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gd29ya2VycztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB3b3JrZXJzTGlzdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB3b3JrZXJzTGlzdDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZGxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcS50YXNrcy5sZW5ndGggKyB3b3JrZXJzID09PSAwO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhdXNlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcS5wYXVzZWQgPSB0cnVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlc3VtZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChxLnBhdXNlZCA9PT0gZmFsc2UpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgICAgICAgcS5wYXVzZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdW1lQ291bnQgPSBNYXRoLm1pbihxLmNvbmN1cnJlbmN5LCBxLnRhc2tzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgLy8gTmVlZCB0byBjYWxsIHEucHJvY2VzcyBvbmNlIHBlciBjb25jdXJyZW50XG4gICAgICAgICAgICAgICAgLy8gd29ya2VyIHRvIHByZXNlcnZlIGZ1bGwgY29uY3VycmVuY3kgYWZ0ZXIgcGF1c2VcbiAgICAgICAgICAgICAgICBmb3IgKHZhciB3ID0gMTsgdyA8PSByZXN1bWVDb3VudDsgdysrKSB7XG4gICAgICAgICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZShxLnByb2Nlc3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHE7XG4gICAgfVxuXG4gICAgYXN5bmMucXVldWUgPSBmdW5jdGlvbiAod29ya2VyLCBjb25jdXJyZW5jeSkge1xuICAgICAgICB2YXIgcSA9IF9xdWV1ZShmdW5jdGlvbiAoaXRlbXMsIGNiKSB7XG4gICAgICAgICAgICB3b3JrZXIoaXRlbXNbMF0sIGNiKTtcbiAgICAgICAgfSwgY29uY3VycmVuY3ksIDEpO1xuXG4gICAgICAgIHJldHVybiBxO1xuICAgIH07XG5cbiAgICBhc3luYy5wcmlvcml0eVF1ZXVlID0gZnVuY3Rpb24gKHdvcmtlciwgY29uY3VycmVuY3kpIHtcblxuICAgICAgICBmdW5jdGlvbiBfY29tcGFyZVRhc2tzKGEsIGIpe1xuICAgICAgICAgICAgcmV0dXJuIGEucHJpb3JpdHkgLSBiLnByaW9yaXR5O1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gX2JpbmFyeVNlYXJjaChzZXF1ZW5jZSwgaXRlbSwgY29tcGFyZSkge1xuICAgICAgICAgICAgdmFyIGJlZyA9IC0xLFxuICAgICAgICAgICAgICAgIGVuZCA9IHNlcXVlbmNlLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICB3aGlsZSAoYmVnIDwgZW5kKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1pZCA9IGJlZyArICgoZW5kIC0gYmVnICsgMSkgPj4+IDEpO1xuICAgICAgICAgICAgICAgIGlmIChjb21wYXJlKGl0ZW0sIHNlcXVlbmNlW21pZF0pID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYmVnID0gbWlkO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVuZCA9IG1pZCAtIDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGJlZztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIF9pbnNlcnQocSwgZGF0YSwgcHJpb3JpdHksIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2sgIT0gbnVsbCAmJiB0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInRhc2sgY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcS5zdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmICghX2lzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0gW2RhdGFdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoZGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAvLyBjYWxsIGRyYWluIGltbWVkaWF0ZWx5IGlmIHRoZXJlIGFyZSBubyB0YXNrc1xuICAgICAgICAgICAgICAgIHJldHVybiBhc3luYy5zZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHEuZHJhaW4oKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF9hcnJheUVhY2goZGF0YSwgZnVuY3Rpb24odGFzaykge1xuICAgICAgICAgICAgICAgIHZhciBpdGVtID0ge1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiB0YXNrLFxuICAgICAgICAgICAgICAgICAgICBwcmlvcml0eTogcHJpb3JpdHksXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiB0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicgPyBjYWxsYmFjayA6IG5vb3BcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgcS50YXNrcy5zcGxpY2UoX2JpbmFyeVNlYXJjaChxLnRhc2tzLCBpdGVtLCBfY29tcGFyZVRhc2tzKSArIDEsIDAsIGl0ZW0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHEudGFza3MubGVuZ3RoID09PSBxLmNvbmN1cnJlbmN5KSB7XG4gICAgICAgICAgICAgICAgICAgIHEuc2F0dXJhdGVkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZShxLnByb2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTdGFydCB3aXRoIGEgbm9ybWFsIHF1ZXVlXG4gICAgICAgIHZhciBxID0gYXN5bmMucXVldWUod29ya2VyLCBjb25jdXJyZW5jeSk7XG5cbiAgICAgICAgLy8gT3ZlcnJpZGUgcHVzaCB0byBhY2NlcHQgc2Vjb25kIHBhcmFtZXRlciByZXByZXNlbnRpbmcgcHJpb3JpdHlcbiAgICAgICAgcS5wdXNoID0gZnVuY3Rpb24gKGRhdGEsIHByaW9yaXR5LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgX2luc2VydChxLCBkYXRhLCBwcmlvcml0eSwgY2FsbGJhY2spO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFJlbW92ZSB1bnNoaWZ0IGZ1bmN0aW9uXG4gICAgICAgIGRlbGV0ZSBxLnVuc2hpZnQ7XG5cbiAgICAgICAgcmV0dXJuIHE7XG4gICAgfTtcblxuICAgIGFzeW5jLmNhcmdvID0gZnVuY3Rpb24gKHdvcmtlciwgcGF5bG9hZCkge1xuICAgICAgICByZXR1cm4gX3F1ZXVlKHdvcmtlciwgMSwgcGF5bG9hZCk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIF9jb25zb2xlX2ZuKG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIF9yZXN0UGFyYW0oZnVuY3Rpb24gKGZuLCBhcmdzKSB7XG4gICAgICAgICAgICBmbi5hcHBseShudWxsLCBhcmdzLmNvbmNhdChbX3Jlc3RQYXJhbShmdW5jdGlvbiAoZXJyLCBhcmdzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29uc29sZS5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChjb25zb2xlW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfYXJyYXlFYWNoKGFyZ3MsIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZVtuYW1lXSh4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSldKSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBhc3luYy5sb2cgPSBfY29uc29sZV9mbignbG9nJyk7XG4gICAgYXN5bmMuZGlyID0gX2NvbnNvbGVfZm4oJ2RpcicpO1xuICAgIC8qYXN5bmMuaW5mbyA9IF9jb25zb2xlX2ZuKCdpbmZvJyk7XG4gICAgYXN5bmMud2FybiA9IF9jb25zb2xlX2ZuKCd3YXJuJyk7XG4gICAgYXN5bmMuZXJyb3IgPSBfY29uc29sZV9mbignZXJyb3InKTsqL1xuXG4gICAgYXN5bmMubWVtb2l6ZSA9IGZ1bmN0aW9uIChmbiwgaGFzaGVyKSB7XG4gICAgICAgIHZhciBtZW1vID0ge307XG4gICAgICAgIHZhciBxdWV1ZXMgPSB7fTtcbiAgICAgICAgdmFyIGhhcyA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG4gICAgICAgIGhhc2hlciA9IGhhc2hlciB8fCBpZGVudGl0eTtcbiAgICAgICAgdmFyIG1lbW9pemVkID0gX3Jlc3RQYXJhbShmdW5jdGlvbiBtZW1vaXplZChhcmdzKSB7XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgdmFyIGtleSA9IGhhc2hlci5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgIGlmIChoYXMuY2FsbChtZW1vLCBrZXkpKSB7ICAgXG4gICAgICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgbWVtb1trZXldKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhhcy5jYWxsKHF1ZXVlcywga2V5KSkge1xuICAgICAgICAgICAgICAgIHF1ZXVlc1trZXldLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcXVldWVzW2tleV0gPSBbY2FsbGJhY2tdO1xuICAgICAgICAgICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MuY29uY2F0KFtfcmVzdFBhcmFtKGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lbW9ba2V5XSA9IGFyZ3M7XG4gICAgICAgICAgICAgICAgICAgIHZhciBxID0gcXVldWVzW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBxdWV1ZXNba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBxLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcVtpXS5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgbWVtb2l6ZWQubWVtbyA9IG1lbW87XG4gICAgICAgIG1lbW9pemVkLnVubWVtb2l6ZWQgPSBmbjtcbiAgICAgICAgcmV0dXJuIG1lbW9pemVkO1xuICAgIH07XG5cbiAgICBhc3luYy51bm1lbW9pemUgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAoZm4udW5tZW1vaXplZCB8fCBmbikuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX3RpbWVzKG1hcHBlcikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGNvdW50LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIG1hcHBlcihfcmFuZ2UoY291bnQpLCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGFzeW5jLnRpbWVzID0gX3RpbWVzKGFzeW5jLm1hcCk7XG4gICAgYXN5bmMudGltZXNTZXJpZXMgPSBfdGltZXMoYXN5bmMubWFwU2VyaWVzKTtcbiAgICBhc3luYy50aW1lc0xpbWl0ID0gZnVuY3Rpb24gKGNvdW50LCBsaW1pdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBhc3luYy5tYXBMaW1pdChfcmFuZ2UoY291bnQpLCBsaW1pdCwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuc2VxID0gZnVuY3Rpb24gKC8qIGZ1bmN0aW9ucy4uLiAqLykge1xuICAgICAgICB2YXIgZm5zID0gYXJndW1lbnRzO1xuICAgICAgICByZXR1cm4gX3Jlc3RQYXJhbShmdW5jdGlvbiAoYXJncykge1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzW2FyZ3MubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayA9IG5vb3A7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGFzeW5jLnJlZHVjZShmbnMsIGFyZ3MsIGZ1bmN0aW9uIChuZXdhcmdzLCBmbiwgY2IpIHtcbiAgICAgICAgICAgICAgICBmbi5hcHBseSh0aGF0LCBuZXdhcmdzLmNvbmNhdChbX3Jlc3RQYXJhbShmdW5jdGlvbiAoZXJyLCBuZXh0YXJncykge1xuICAgICAgICAgICAgICAgICAgICBjYihlcnIsIG5leHRhcmdzKTtcbiAgICAgICAgICAgICAgICB9KV0pKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbiAoZXJyLCByZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkodGhhdCwgW2Vycl0uY29uY2F0KHJlc3VsdHMpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgYXN5bmMuY29tcG9zZSA9IGZ1bmN0aW9uICgvKiBmdW5jdGlvbnMuLi4gKi8pIHtcbiAgICAgICAgcmV0dXJuIGFzeW5jLnNlcS5hcHBseShudWxsLCBBcnJheS5wcm90b3R5cGUucmV2ZXJzZS5jYWxsKGFyZ3VtZW50cykpO1xuICAgIH07XG5cblxuICAgIGZ1bmN0aW9uIF9hcHBseUVhY2goZWFjaGZuKSB7XG4gICAgICAgIHJldHVybiBfcmVzdFBhcmFtKGZ1bmN0aW9uKGZucywgYXJncykge1xuICAgICAgICAgICAgdmFyIGdvID0gX3Jlc3RQYXJhbShmdW5jdGlvbihhcmdzKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3MucG9wKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVhY2hmbihmbnMsIGZ1bmN0aW9uIChmbiwgXywgY2IpIHtcbiAgICAgICAgICAgICAgICAgICAgZm4uYXBwbHkodGhhdCwgYXJncy5jb25jYXQoW2NiXSkpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoYXJncy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ28uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ287XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFzeW5jLmFwcGx5RWFjaCA9IF9hcHBseUVhY2goYXN5bmMuZWFjaE9mKTtcbiAgICBhc3luYy5hcHBseUVhY2hTZXJpZXMgPSBfYXBwbHlFYWNoKGFzeW5jLmVhY2hPZlNlcmllcyk7XG5cblxuICAgIGFzeW5jLmZvcmV2ZXIgPSBmdW5jdGlvbiAoZm4sIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBkb25lID0gb25seV9vbmNlKGNhbGxiYWNrIHx8IG5vb3ApO1xuICAgICAgICB2YXIgdGFzayA9IGVuc3VyZUFzeW5jKGZuKTtcbiAgICAgICAgZnVuY3Rpb24gbmV4dChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZG9uZShlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGFzayhuZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBuZXh0KCk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGVuc3VyZUFzeW5jKGZuKSB7XG4gICAgICAgIHJldHVybiBfcmVzdFBhcmFtKGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgYXJncy5wdXNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5uZXJBcmdzID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgICAgIGlmIChzeW5jKSB7XG4gICAgICAgICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseShudWxsLCBpbm5lckFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseShudWxsLCBpbm5lckFyZ3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIHN5bmMgPSB0cnVlO1xuICAgICAgICAgICAgZm4uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgICAgICBzeW5jID0gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFzeW5jLmVuc3VyZUFzeW5jID0gZW5zdXJlQXN5bmM7XG5cbiAgICBhc3luYy5jb25zdGFudCA9IF9yZXN0UGFyYW0oZnVuY3Rpb24odmFsdWVzKSB7XG4gICAgICAgIHZhciBhcmdzID0gW251bGxdLmNvbmNhdCh2YWx1ZXMpO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2suYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhc3luYy53cmFwU3luYyA9XG4gICAgYXN5bmMuYXN5bmNpZnkgPSBmdW5jdGlvbiBhc3luY2lmeShmdW5jKSB7XG4gICAgICAgIHJldHVybiBfcmVzdFBhcmFtKGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBpZiByZXN1bHQgaXMgUHJvbWlzZSBvYmplY3RcbiAgICAgICAgICAgIGlmIChfaXNPYmplY3QocmVzdWx0KSAmJiB0eXBlb2YgcmVzdWx0LnRoZW4gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIHJlc3VsdC50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9KVtcImNhdGNoXCJdKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIubWVzc2FnZSA/IGVyciA6IG5ldyBFcnJvcihlcnIpKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8vIE5vZGUuanNcbiAgICBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBhc3luYztcbiAgICB9XG4gICAgLy8gQU1EIC8gUmVxdWlyZUpTXG4gICAgZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShbXSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGFzeW5jO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gaW5jbHVkZWQgZGlyZWN0bHkgdmlhIDxzY3JpcHQ+IHRhZ1xuICAgIGVsc2Uge1xuICAgICAgICByb290LmFzeW5jID0gYXN5bmM7XG4gICAgfVxuXG59KCkpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBibGFja2xpc3QgKHNyYykge1xuICB2YXIgY29weSA9IHt9XG4gIHZhciBmaWx0ZXIgPSBhcmd1bWVudHNbMV1cblxuICBpZiAodHlwZW9mIGZpbHRlciA9PT0gJ3N0cmluZycpIHtcbiAgICBmaWx0ZXIgPSB7fVxuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBmaWx0ZXJbYXJndW1lbnRzW2ldXSA9IHRydWVcbiAgICB9XG4gIH1cblxuICBmb3IgKHZhciBrZXkgaW4gc3JjKSB7XG4gICAgLy8gYmxhY2tsaXN0P1xuICAgIGlmIChmaWx0ZXJba2V5XSkgY29udGludWVcblxuICAgIGNvcHlba2V5XSA9IHNyY1trZXldXG4gIH1cblxuICByZXR1cm4gY29weVxufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIi8qIVxuICBDb3B5cmlnaHQgKGMpIDIwMTYgSmVkIFdhdHNvbi5cbiAgTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlIChNSVQpLCBzZWVcbiAgaHR0cDovL2plZHdhdHNvbi5naXRodWIuaW8vY2xhc3NuYW1lc1xuKi9cbi8qIGdsb2JhbCBkZWZpbmUgKi9cblxuKGZ1bmN0aW9uICgpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBoYXNPd24gPSB7fS5oYXNPd25Qcm9wZXJ0eTtcblxuXHRmdW5jdGlvbiBjbGFzc05hbWVzICgpIHtcblx0XHR2YXIgY2xhc3NlcyA9IFtdO1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBhcmcgPSBhcmd1bWVudHNbaV07XG5cdFx0XHRpZiAoIWFyZykgY29udGludWU7XG5cblx0XHRcdHZhciBhcmdUeXBlID0gdHlwZW9mIGFyZztcblxuXHRcdFx0aWYgKGFyZ1R5cGUgPT09ICdzdHJpbmcnIHx8IGFyZ1R5cGUgPT09ICdudW1iZXInKSB7XG5cdFx0XHRcdGNsYXNzZXMucHVzaChhcmcpO1xuXHRcdFx0fSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGFyZykpIHtcblx0XHRcdFx0Y2xhc3Nlcy5wdXNoKGNsYXNzTmFtZXMuYXBwbHkobnVsbCwgYXJnKSk7XG5cdFx0XHR9IGVsc2UgaWYgKGFyZ1R5cGUgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdGZvciAodmFyIGtleSBpbiBhcmcpIHtcblx0XHRcdFx0XHRpZiAoaGFzT3duLmNhbGwoYXJnLCBrZXkpICYmIGFyZ1trZXldKSB7XG5cdFx0XHRcdFx0XHRjbGFzc2VzLnB1c2goa2V5KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gY2xhc3Nlcy5qb2luKCcgJyk7XG5cdH1cblxuXHRpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGNsYXNzTmFtZXM7XG5cdH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgZGVmaW5lLmFtZCA9PT0gJ29iamVjdCcgJiYgZGVmaW5lLmFtZCkge1xuXHRcdC8vIHJlZ2lzdGVyIGFzICdjbGFzc25hbWVzJywgY29uc2lzdGVudCB3aXRoIG5wbSBwYWNrYWdlIG5hbWVcblx0XHRkZWZpbmUoJ2NsYXNzbmFtZXMnLCBbXSwgZnVuY3Rpb24gKCkge1xuXHRcdFx0cmV0dXJuIGNsYXNzTmFtZXM7XG5cdFx0fSk7XG5cdH0gZWxzZSB7XG5cdFx0d2luZG93LmNsYXNzTmFtZXMgPSBjbGFzc05hbWVzO1xuXHR9XG59KCkpO1xuIiwiZnVuY3Rpb24gbWFrZXNoaWZ0VGl0bGUodGl0bGUsIG1lc3NhZ2UpIHtcbiAgcmV0dXJuIHRpdGxlID8gKHRpdGxlICsgJ1xcblxcbicgKyBtZXNzYWdlKSA6IG1lc3NhZ2Vcbn1cblxuLy8gU2VlIGh0dHA6Ly9kb2NzLnBob25lZ2FwLmNvbS9lbi9lZGdlL2NvcmRvdmFfbm90aWZpY2F0aW9uX25vdGlmaWNhdGlvbi5tZC5odG1sIGZvciBkb2N1bWVudGF0aW9uXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYWxlcnQ6IGZ1bmN0aW9uIGFsZXJ0KG1lc3NhZ2UsIGNhbGxiYWNrLCB0aXRsZSkge1xuICAgIGlmICh3aW5kb3cubmF2aWdhdG9yLm5vdGlmaWNhdGlvbiAmJiB3aW5kb3cubmF2aWdhdG9yLm5vdGlmaWNhdGlvbi5hbGVydCkge1xuICAgICAgcmV0dXJuIHdpbmRvdy5uYXZpZ2F0b3Iubm90aWZpY2F0aW9uLmFsZXJ0LmFwcGx5KG51bGwsIGFyZ3VtZW50cylcbiAgICB9XG5cbiAgICB2YXIgdGV4dCA9IG1ha2VzaGlmdFRpdGxlKHRpdGxlLCBtZXNzYWdlKVxuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHdpbmRvdy5hbGVydCh0ZXh0KVxuXG4gICAgICBjYWxsYmFjaygpXG4gICAgfSwgMClcbiAgfSxcbiAgY29uZmlybTogZnVuY3Rpb24gY29uZmlybShtZXNzYWdlLCBjYWxsYmFjaywgdGl0bGUpIHtcbiAgICBpZiAod2luZG93Lm5hdmlnYXRvci5ub3RpZmljYXRpb24gJiYgd2luZG93Lm5hdmlnYXRvci5ub3RpZmljYXRpb24uY29uZmlybSkge1xuICAgICAgcmV0dXJuIHdpbmRvdy5uYXZpZ2F0b3Iubm90aWZpY2F0aW9uLmNvbmZpcm0uYXBwbHkobnVsbCwgYXJndW1lbnRzKVxuICAgIH1cblxuICAgIHZhciB0ZXh0ID0gbWFrZXNoaWZ0VGl0bGUodGl0bGUsIG1lc3NhZ2UpXG5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGNvbmZpcm1lZCA9IHdpbmRvdy5jb25maXJtKHRleHQpXG4gICAgICB2YXIgYnV0dG9uSW5kZXggPSBjb25maXJtZWQgPyAxIDogMlxuXG4gICAgICBjYWxsYmFjayhidXR0b25JbmRleClcbiAgICB9LCAwKVxuICB9LFxuXG4gIHByb21wdDogZnVuY3Rpb24gcHJvbXB0KG1lc3NhZ2UsIGNhbGxiYWNrLCB0aXRsZSwgZGVmYXVsdFRleHQpIHtcbiAgICBpZiAod2luZG93Lm5hdmlnYXRvci5ub3RpZmljYXRpb24gJiYgd2luZG93Lm5hdmlnYXRvci5ub3RpZmljYXRpb24ucHJvbXB0KSB7XG4gICAgICByZXR1cm4gd2luZG93Lm5hdmlnYXRvci5ub3RpZmljYXRpb24ucHJvbXB0LmFwcGx5KG51bGwsIGFyZ3VtZW50cylcbiAgICB9XG5cbiAgICB2YXIgcXVlc3Rpb24gPSBtYWtlc2hpZnRUaXRsZSh0aXRsZSwgbWVzc2FnZSlcblxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdGV4dCA9IHdpbmRvdy5wcm9tcHQocXVlc3Rpb24sIGRlZmF1bHRUZXh0KVxuICAgICAgdmFyIGJ1dHRvbkluZGV4ID0gKHRleHQgPT09IG51bGwpID8gMCA6IDFcblxuICAgICAgY2FsbGJhY2soe1xuICAgICAgICBidXR0b25JbmRleDogYnV0dG9uSW5kZXgsXG4gICAgICAgIGlucHV0MTogdGV4dFxuICAgICAgfSlcbiAgICB9LCAwKVxuICB9XG59XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJ2YXIgaXNGdW5jdGlvbiA9IHJlcXVpcmUoJ2lzLWZ1bmN0aW9uJylcblxubW9kdWxlLmV4cG9ydHMgPSBmb3JFYWNoXG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmdcbnZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHlcblxuZnVuY3Rpb24gZm9yRWFjaChsaXN0LCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmICghaXNGdW5jdGlvbihpdGVyYXRvcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignaXRlcmF0b3IgbXVzdCBiZSBhIGZ1bmN0aW9uJylcbiAgICB9XG5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMpIHtcbiAgICAgICAgY29udGV4dCA9IHRoaXNcbiAgICB9XG4gICAgXG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobGlzdCkgPT09ICdbb2JqZWN0IEFycmF5XScpXG4gICAgICAgIGZvckVhY2hBcnJheShsaXN0LCBpdGVyYXRvciwgY29udGV4dClcbiAgICBlbHNlIGlmICh0eXBlb2YgbGlzdCA9PT0gJ3N0cmluZycpXG4gICAgICAgIGZvckVhY2hTdHJpbmcobGlzdCwgaXRlcmF0b3IsIGNvbnRleHQpXG4gICAgZWxzZVxuICAgICAgICBmb3JFYWNoT2JqZWN0KGxpc3QsIGl0ZXJhdG9yLCBjb250ZXh0KVxufVxuXG5mdW5jdGlvbiBmb3JFYWNoQXJyYXkoYXJyYXksIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFycmF5Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKGFycmF5LCBpKSkge1xuICAgICAgICAgICAgaXRlcmF0b3IuY2FsbChjb250ZXh0LCBhcnJheVtpXSwgaSwgYXJyYXkpXG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGZvckVhY2hTdHJpbmcoc3RyaW5nLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBzdHJpbmcubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgLy8gbm8gc3VjaCB0aGluZyBhcyBhIHNwYXJzZSBzdHJpbmcuXG4gICAgICAgIGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgc3RyaW5nLmNoYXJBdChpKSwgaSwgc3RyaW5nKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZm9yRWFjaE9iamVjdChvYmplY3QsIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgZm9yICh2YXIgayBpbiBvYmplY3QpIHtcbiAgICAgICAgaWYgKGhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBrKSkge1xuICAgICAgICAgICAgaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmplY3Rba10sIGssIG9iamVjdClcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsInZhciB3aW47XG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgd2luID0gd2luZG93O1xufSBlbHNlIGlmICh0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgd2luID0gZ2xvYmFsO1xufSBlbHNlIGlmICh0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIil7XG4gICAgd2luID0gc2VsZjtcbn0gZWxzZSB7XG4gICAgd2luID0ge307XG59XG5cbm1vZHVsZS5leHBvcnRzID0gd2luO1xuIiwidmFyIHJlcXVlc3QgPSByZXF1aXJlKCdyZXF1ZXN0JylcblxuaWYgKHR5cGVvZiBQcm9taXNlICE9PSAnZnVuY3Rpb24nKSB7XG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ1BsZWFzZSBwcm92aWRlIGEgUHJvbWlzZSBwb2x5ZmlsbCBhcyB5b3VyIGVudmlyb25tZW50IGRvZXNuXFwndCBzdXBwb3J0IHRoZW0gbmF0aXZlbHknKVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvcHRpb25zLCBjYWxsYmFjaykge1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICByZXF1ZXN0KG9wdGlvbnMsIGZ1bmN0aW9uIChlcnIsIHJlc3BvbnNlLCBib2R5KSB7XG5cbiAgICAgIHZhciBzdGF0dXMgPSAocmVzcG9uc2UpID8gcmVzcG9uc2Uuc3RhdHVzQ29kZSA6IDBcbiAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge31cblxuICAgICAgaWYgKGVycikge1xuICAgICAgICBjYWxsYmFjayhlcnIpXG4gICAgICAgIHJlamVjdChlcnIpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICB0cnl7XG4gICAgICAgIHJlc3BvbnNlLmJvZHkgPSBKU09OLnBhcnNlKGJvZHkpXG4gICAgICB9XG4gICAgICBjYXRjaCAoZSkge31cblxuICAgICAgaWYgKHN0YXR1cyA+PSA0MDAgJiYgc3RhdHVzIDwgNjAwKSB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3BvbnNlLCByZXNwb25zZS5ib2R5KVxuICAgICAgICByZWplY3QocmVzcG9uc2UpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBjYWxsYmFjayhudWxsLCByZXNwb25zZSwgcmVzcG9uc2UuYm9keSlcbiAgICAgIHJlc29sdmUocmVzcG9uc2UpXG4gICAgfSlcbiAgfSlcbn1cbiIsInZhciByZXF1ZXN0ID0gcmVxdWlyZSgneGhyJyk7XG5cbi8vIFdyYXBwZXIgdG8gbWFrZSB0aGUgZmVhdHVyZXMgbW9yZSBzaW1pbGlhciBiZXR3ZWVuXG4vLyByZXF1ZXN0IGFuZCB4aHJcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgXG4gIC8vIFNldCB1cCBmb3IgUmVxdWVzdCBtb2R1bGVcbiAgaWYgKG9wdGlvbnMuZGF0YSAmJiAhd2luZG93KSBvcHRpb25zLmZvcm0gPSBvcHRpb25zLmRhdGE7XG4gIFxuICAvLyBTZXQgdXAgZm9yIHhociBtb2R1bGVcbiAgaWYgKG9wdGlvbnMuZm9ybSAmJiB3aW5kb3cpIHtcbiAgICBvcHRpb25zLmJvZHkgPSAodHlwZW9mIG9wdGlvbnMuZm9ybSA9PT0gJ29iamVjdCcpXG4gICAgICA/IEpTT04uc3RyaW5naWZ5KG9wdGlvbnMuZm9ybSlcbiAgICAgIDogb3B0aW9ucy5mb3JtO1xuICB9XG4gIFxuICBpZiAob3B0aW9ucy5kYXRhKSB7XG4gICAgb3B0aW9ucy5ib2R5ID0gKHR5cGVvZiBvcHRpb25zLmRhdGEgPT09ICdvYmplY3QnKVxuICAgICAgPyBKU09OLnN0cmluZ2lmeShvcHRpb25zLmRhdGEpXG4gICAgICA6IG9wdGlvbnMuZGF0YTtcbiAgfVxuICBcbiAgaWYgKG9wdGlvbnMudXJsICYmIHdpbmRvdykgb3B0aW9ucy51cmkgPSBvcHRpb25zLnVybDtcbiAgaWYgKHdpbmRvdykgb3B0aW9ucy5jb3JzID0gb3B0aW9ucy53aXRoQ3JlZGVudGlhbHM7XG4gIFxuICByZXR1cm4gcmVxdWVzdChvcHRpb25zLCBjYWxsYmFjayk7XG59OyIsIm1vZHVsZS5leHBvcnRzID0gaXNGdW5jdGlvblxuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nXG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24gKGZuKSB7XG4gIHZhciBzdHJpbmcgPSB0b1N0cmluZy5jYWxsKGZuKVxuICByZXR1cm4gc3RyaW5nID09PSAnW29iamVjdCBGdW5jdGlvbl0nIHx8XG4gICAgKHR5cGVvZiBmbiA9PT0gJ2Z1bmN0aW9uJyAmJiBzdHJpbmcgIT09ICdbb2JqZWN0IFJlZ0V4cF0nKSB8fFxuICAgICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAvLyBJRTggYW5kIGJlbG93XG4gICAgIChmbiA9PT0gd2luZG93LnNldFRpbWVvdXQgfHxcbiAgICAgIGZuID09PSB3aW5kb3cuYWxlcnQgfHxcbiAgICAgIGZuID09PSB3aW5kb3cuY29uZmlybSB8fFxuICAgICAgZm4gPT09IHdpbmRvdy5wcm9tcHQpKVxufTtcbiIsInZhciB0cmltID0gcmVxdWlyZSgndHJpbScpXG4gICwgZm9yRWFjaCA9IHJlcXVpcmUoJ2Zvci1lYWNoJylcbiAgLCBpc0FycmF5ID0gZnVuY3Rpb24oYXJnKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGFyZykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgfVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChoZWFkZXJzKSB7XG4gIGlmICghaGVhZGVycylcbiAgICByZXR1cm4ge31cblxuICB2YXIgcmVzdWx0ID0ge31cblxuICBmb3JFYWNoKFxuICAgICAgdHJpbShoZWFkZXJzKS5zcGxpdCgnXFxuJylcbiAgICAsIGZ1bmN0aW9uIChyb3cpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gcm93LmluZGV4T2YoJzonKVxuICAgICAgICAgICwga2V5ID0gdHJpbShyb3cuc2xpY2UoMCwgaW5kZXgpKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgLCB2YWx1ZSA9IHRyaW0ocm93LnNsaWNlKGluZGV4ICsgMSkpXG5cbiAgICAgICAgaWYgKHR5cGVvZihyZXN1bHRba2V5XSkgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgcmVzdWx0W2tleV0gPSB2YWx1ZVxuICAgICAgICB9IGVsc2UgaWYgKGlzQXJyYXkocmVzdWx0W2tleV0pKSB7XG4gICAgICAgICAgcmVzdWx0W2tleV0ucHVzaCh2YWx1ZSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHRba2V5XSA9IFsgcmVzdWx0W2tleV0sIHZhbHVlIF1cbiAgICAgICAgfVxuICAgICAgfVxuICApXG5cbiAgcmV0dXJuIHJlc3VsdFxufSIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY29tcG9uZW50V2lsbE1vdW50OiBmdW5jdGlvbiBjb21wb25lbnRXaWxsTW91bnQoKSB7XG4gICAgdGhpcy5fX3JzX2xpc3RlbmVycyA9IFtdO1xuICB9LFxuXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiBjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcbiAgICB0aGlzLl9fcnNfbGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24gKGxpc3RlbmVyKSB7XG4gICAgICB2YXIgZW1pdHRlciA9IGxpc3RlbmVyLmVtaXR0ZXI7XG4gICAgICB2YXIgZXZlbnROYW1lID0gbGlzdGVuZXIuZXZlbnROYW1lO1xuICAgICAgdmFyIGNhbGxiYWNrID0gbGlzdGVuZXIuY2FsbGJhY2s7XG5cbiAgICAgIHZhciByZW1vdmVMaXN0ZW5lciA9IGVtaXR0ZXIucmVtb3ZlTGlzdGVuZXIgfHwgZW1pdHRlci5yZW1vdmVFdmVudExpc3RlbmVyO1xuICAgICAgcmVtb3ZlTGlzdGVuZXIuY2FsbChlbWl0dGVyLCBldmVudE5hbWUsIGNhbGxiYWNrKTtcbiAgICB9KTtcbiAgfSxcblxuICB3YXRjaDogZnVuY3Rpb24gd2F0Y2goZW1pdHRlciwgZXZlbnROYW1lLCBjYWxsYmFjaykge1xuICAgIHRoaXMuX19yc19saXN0ZW5lcnMucHVzaCh7XG4gICAgICBlbWl0dGVyOiBlbWl0dGVyLFxuICAgICAgZXZlbnROYW1lOiBldmVudE5hbWUsXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2tcbiAgICB9KTtcblxuICAgIHZhciBhZGRMaXN0ZW5lciA9IGVtaXR0ZXIuYWRkTGlzdGVuZXIgfHwgZW1pdHRlci5hZGRFdmVudExpc3RlbmVyO1xuICAgIGFkZExpc3RlbmVyLmNhbGwoZW1pdHRlciwgZXZlbnROYW1lLCBjYWxsYmFjayk7XG4gIH0sXG5cbiAgdW53YXRjaDogZnVuY3Rpb24gdW53YXRjaChlbWl0dGVyLCBldmVudE5hbWUsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5fX3JzX2xpc3RlbmVycyA9IHRoaXMuX19yc19saXN0ZW5lcnMuZmlsdGVyKGZ1bmN0aW9uIChsaXN0ZW5lcikge1xuICAgICAgcmV0dXJuIGxpc3RlbmVyLmVtaXR0ZXIgPT09IGVtaXR0ZXIgJiYgbGlzdGVuZXIuZXZlbnROYW1lID09PSBldmVudE5hbWUgJiYgbGlzdGVuZXIuY2FsbGJhY2sgPT09IGNhbGxiYWNrO1xuICAgIH0pO1xuXG4gICAgdmFyIHJlbW92ZUxpc3RlbmVyID0gZW1pdHRlci5yZW1vdmVMaXN0ZW5lciB8fCBlbWl0dGVyLnJlbW92ZUV2ZW50TGlzdGVuZXI7XG4gICAgcmVtb3ZlTGlzdGVuZXIuY2FsbChlbWl0dGVyLCBldmVudE5hbWUsIGNhbGxiYWNrKTtcbiAgfVxufTsiLCJ2YXIgR0xPQkFMID0gZ2xvYmFsIHx8IHdpbmRvd1xuXG5mdW5jdGlvbiBjbGVhclRpbWVycyAoKSB7XG4gIHRoaXMuY2xlYXJJbnRlcnZhbHMoKVxuICB0aGlzLmNsZWFyVGltZW91dHMoKVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY2xlYXJJbnRlcnZhbHM6IGZ1bmN0aW9uIGNsZWFySW50ZXJ2YWxzICgpIHsgdGhpcy5fX3J0X2ludGVydmFscy5mb3JFYWNoKEdMT0JBTC5jbGVhckludGVydmFsKSB9LFxuICBjbGVhclRpbWVvdXRzOiBmdW5jdGlvbiBjbGVhclRpbWVvdXRzICgpIHsgdGhpcy5fX3J0X3RpbWVvdXRzLmZvckVhY2goR0xPQkFMLmNsZWFyVGltZW91dCkgfSxcbiAgY2xlYXJJbnRlcnZhbDogZnVuY3Rpb24gY2xlYXJJbnRlcnZhbCAoaWQpIHsgcmV0dXJuIEdMT0JBTC5jbGVhckludGVydmFsKGlkKSB9LFxuICBjbGVhclRpbWVvdXQ6IGZ1bmN0aW9uIGNsZWFyVGltZW91dCAoaWQpIHsgcmV0dXJuIEdMT0JBTC5jbGVhclRpbWVvdXQoaWQpIH0sXG4gIGNsZWFyVGltZXJzOiBjbGVhclRpbWVycyxcblxuICBjb21wb25lbnRXaWxsTW91bnQ6IGZ1bmN0aW9uIGNvbXBvbmVudFdpbGxNb3VudCAoKSB7XG4gICAgdGhpcy5fX3J0X2ludGVydmFscyA9IFtdXG4gICAgdGhpcy5fX3J0X3RpbWVvdXRzID0gW11cbiAgfSxcbiAgY29tcG9uZW50V2lsbFVubW91bnQ6IGNsZWFyVGltZXJzLFxuXG4gIHNldEludGVydmFsOiBmdW5jdGlvbiBzZXRJbnRlcnZhbCAoY2FsbGJhY2spIHtcbiAgICB2YXIgaWQgPSBHTE9CQUwuc2V0SW50ZXJ2YWwoY2FsbGJhY2suYmluZCh0aGlzKSwgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKVxuICAgIHRoaXMuX19ydF9pbnRlcnZhbHMucHVzaChpZClcbiAgICByZXR1cm4gaWRcbiAgfSxcbiAgc2V0VGltZW91dDogZnVuY3Rpb24gc2V0VGltZW91dCAoY2FsbGJhY2spIHtcbiAgICB2YXIgaWQgPSBHTE9CQUwuc2V0VGltZW91dChjYWxsYmFjay5iaW5kKHRoaXMpLCBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpXG4gICAgdGhpcy5fX3J0X3RpbWVvdXRzLnB1c2goaWQpXG4gICAgcmV0dXJuIGlkXG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywge1xuXHR2YWx1ZTogdHJ1ZVxufSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH1cblxudmFyIF9yZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG5cbnZhciBfcmVhY3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcmVhY3QpO1xuXG52YXIgX3JlYWN0Q29udGFpbmVyID0gcmVxdWlyZSgncmVhY3QtY29udGFpbmVyJyk7XG5cbnZhciBfcmVhY3RDb250YWluZXIyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcmVhY3RDb250YWluZXIpO1xuXG52YXIgRXJyb3JWaWV3ID0gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdFcnJvclZpZXcnLFxuXG5cdHByb3BUeXBlczoge1xuXHRcdGNoaWxkcmVuOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLm5vZGVcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRfcmVhY3RDb250YWluZXIyWydkZWZhdWx0J10sXG5cdFx0XHR7IGZpbGw6IHRydWUsIGNsYXNzTmFtZTogJ1ZpZXcgRXJyb3JWaWV3JyB9LFxuXHRcdFx0dGhpcy5wcm9wcy5jaGlsZHJlblxuXHRcdCk7XG5cdH1cbn0pO1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBFcnJvclZpZXc7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHtcblx0dmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9XG5cbnZhciBfYmxhY2tsaXN0ID0gcmVxdWlyZSgnYmxhY2tsaXN0Jyk7XG5cbnZhciBfYmxhY2tsaXN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2JsYWNrbGlzdCk7XG5cbnZhciBfcmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG52YXIgX3JlYWN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0KTtcblxudmFyIF9yZWFjdFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKTtcblxudmFyIF9yZWFjdFRhcHBhYmxlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0VGFwcGFibGUpO1xuXG52YXIgX21peGluc1RyYW5zaXRpb25zID0gcmVxdWlyZSgnLi4vbWl4aW5zL1RyYW5zaXRpb25zJyk7XG5cbnZhciBfbWl4aW5zVHJhbnNpdGlvbnMyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfbWl4aW5zVHJhbnNpdGlvbnMpO1xuXG52YXIgTGluayA9IF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnTGluaycsXG5cblx0bWl4aW5zOiBbX21peGluc1RyYW5zaXRpb25zMlsnZGVmYXVsdCddXSxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2hpbGRyZW46IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuYW55LFxuXHRcdG9wdGlvbnM6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMub2JqZWN0LFxuXHRcdHRyYW5zaXRpb246IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHRvOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZyxcblx0XHR2aWV3UHJvcHM6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuYW55XG5cdH0sXG5cblx0ZG9UcmFuc2l0aW9uOiBmdW5jdGlvbiBkb1RyYW5zaXRpb24oKSB7XG5cdFx0dmFyIG9wdGlvbnMgPSBfZXh0ZW5kcyh7IHZpZXdQcm9wczogdGhpcy5wcm9wcy52aWV3UHJvcHMsIHRyYW5zaXRpb246IHRoaXMucHJvcHMudHJhbnNpdGlvbiB9LCB0aGlzLnByb3BzLm9wdGlvbnMpO1xuXHRcdGNvbnNvbGUuaW5mbygnTGluayB0byBcIicgKyB0aGlzLnByb3BzLnRvICsgJ1wiIHVzaW5nIHRyYW5zaXRpb24gXCInICsgdGhpcy5wcm9wcy50cmFuc2l0aW9uICsgJ1wiJyArICcgd2l0aCBwcm9wcyAnLCB0aGlzLnByb3BzLnZpZXdQcm9wcyk7XG5cdFx0dGhpcy50cmFuc2l0aW9uVG8odGhpcy5wcm9wcy50bywgb3B0aW9ucyk7XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIHRhcHBhYmxlUHJvcHMgPSAoMCwgX2JsYWNrbGlzdDJbJ2RlZmF1bHQnXSkodGhpcy5wcm9wcywgJ2NoaWxkcmVuJywgJ29wdGlvbnMnLCAndHJhbnNpdGlvbicsICd2aWV3UHJvcHMnKTtcblxuXHRcdHJldHVybiBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdF9yZWFjdFRhcHBhYmxlMlsnZGVmYXVsdCddLFxuXHRcdFx0X2V4dGVuZHMoeyBvblRhcDogdGhpcy5kb1RyYW5zaXRpb24gfSwgdGFwcGFibGVQcm9wcyksXG5cdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0KTtcblx0fVxufSk7XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IExpbms7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHtcblx0dmFsdWU6IHRydWVcbn0pO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9XG5cbnZhciBfcmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG52YXIgX3JlYWN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0KTtcblxudmFyIFZpZXcgPSBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ1ZpZXcnLFxuXG5cdHByb3BUeXBlczoge1xuXHRcdGNvbXBvbmVudDogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5mdW5jLmlzUmVxdWlyZWQsXG5cdFx0bmFtZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmcuaXNSZXF1aXJlZFxuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ1RvdWNoc3RvbmVKUyA8Vmlldz4gc2hvdWxkIG5vdCBiZSByZW5kZXJlZCBkaXJlY3RseS4nKTtcblx0fVxufSk7XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IFZpZXc7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbJ2RlZmF1bHQnXTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHtcblx0dmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9XG5cbnZhciBfYmxhY2tsaXN0ID0gcmVxdWlyZSgnYmxhY2tsaXN0Jyk7XG5cbnZhciBfYmxhY2tsaXN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2JsYWNrbGlzdCk7XG5cbnZhciBfY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcblxudmFyIF9jbGFzc25hbWVzMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2NsYXNzbmFtZXMpO1xuXG52YXIgX0Vycm9yVmlldyA9IHJlcXVpcmUoJy4vRXJyb3JWaWV3Jyk7XG5cbnZhciBfRXJyb3JWaWV3MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0Vycm9yVmlldyk7XG5cbnZhciBfcmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG52YXIgX3JlYWN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0KTtcblxudmFyIF9yZWFjdEFkZG9uc0Nzc1RyYW5zaXRpb25Hcm91cCA9IHJlcXVpcmUoJ3JlYWN0LWFkZG9ucy1jc3MtdHJhbnNpdGlvbi1ncm91cCcpO1xuXG52YXIgX3JlYWN0QWRkb25zQ3NzVHJhbnNpdGlvbkdyb3VwMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0QWRkb25zQ3NzVHJhbnNpdGlvbkdyb3VwKTtcblxuZnVuY3Rpb24gY3JlYXRlVmlld3NGcm9tQ2hpbGRyZW4oY2hpbGRyZW4pIHtcblx0dmFyIHZpZXdzID0ge307XG5cdF9yZWFjdDJbJ2RlZmF1bHQnXS5DaGlsZHJlbi5mb3JFYWNoKGNoaWxkcmVuLCBmdW5jdGlvbiAodmlldykge1xuXHRcdHZpZXdzW3ZpZXcucHJvcHMubmFtZV0gPSB2aWV3O1xuXHR9KTtcblx0cmV0dXJuIHZpZXdzO1xufVxuXG52YXIgVmlld0NvbnRhaW5lciA9IF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnVmlld0NvbnRhaW5lcicsXG5cblx0c3RhdGljczoge1xuXHRcdHNob3VsZEZpbGxWZXJ0aWNhbFNwYWNlOiB0cnVlXG5cdH0sXG5cdHByb3BUeXBlczoge1xuXHRcdGNoaWxkcmVuOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLm5vZGVcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIHByb3BzID0gKDAsIF9ibGFja2xpc3QyWydkZWZhdWx0J10pKHRoaXMucHJvcHMsICdjaGlsZHJlbicpO1xuXHRcdHJldHVybiBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0cHJvcHMsXG5cdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0KTtcblx0fVxufSk7XG5cbnZhciBWaWV3TWFuYWdlciA9IF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnVmlld01hbmFnZXInLFxuXG5cdHN0YXRpY3M6IHtcblx0XHRzaG91bGRGaWxsVmVydGljYWxTcGFjZTogdHJ1ZVxuXHR9LFxuXHRjb250ZXh0VHlwZXM6IHtcblx0XHRhcHA6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMub2JqZWN0LmlzUmVxdWlyZWRcblx0fSxcblx0cHJvcFR5cGVzOiB7XG5cdFx0bmFtZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0Y2hpbGRyZW46IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMubm9kZSxcblx0XHRjbGFzc05hbWU6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGRlZmF1bHRWaWV3OiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZyxcblx0XHRvblZpZXdDaGFuZ2U6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuZnVuY1xuXHR9LFxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0bmFtZTogJ19fZGVmYXVsdCdcblx0XHR9O1xuXHR9LFxuXHRnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uIGdldEluaXRpYWxTdGF0ZSgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dmlld3M6IGNyZWF0ZVZpZXdzRnJvbUNoaWxkcmVuKHRoaXMucHJvcHMuY2hpbGRyZW4pLFxuXHRcdFx0Y3VycmVudFZpZXc6IHRoaXMucHJvcHMuZGVmYXVsdFZpZXcsXG5cdFx0XHRvcHRpb25zOiB7fVxuXHRcdH07XG5cdH0sXG5cdGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiBjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLmNvbnRleHQuYXBwLnZpZXdNYW5hZ2Vyc1t0aGlzLnByb3BzLm5hbWVdID0gdGhpcztcblx0fSxcblx0Y29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uIGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdGRlbGV0ZSB0aGlzLmNvbnRleHQuYXBwLnZpZXdNYW5hZ2Vyc1t0aGlzLnByb3BzLm5hbWVdO1xuXHR9LFxuXHRjb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzOiBmdW5jdGlvbiBjb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzKG5leHRQcm9wcykge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0dmlld3M6IGNyZWF0ZVZpZXdzRnJvbUNoaWxkcmVuKHRoaXMucHJvcHMuY2hpbGRyZW4pXG5cdFx0fSk7XG5cdFx0aWYgKG5leHRQcm9wcy5uYW1lICE9PSB0aGlzLnByb3BzLm5hbWUpIHtcblx0XHRcdHRoaXMuY29udGV4dC5hcHAudmlld01hbmFnZXJzW25leHRQcm9wcy5uYW1lXSA9IHRoaXM7XG5cdFx0XHRkZWxldGUgdGhpcy5jb250ZXh0LmFwcC52aWV3TWFuYWdlcnNbdGhpcy5wcm9wcy5uYW1lXTtcblx0XHR9XG5cdFx0aWYgKG5leHRQcm9wcy5jdXJyZW50VmlldyAmJiBuZXh0UHJvcHMuY3VycmVudFZpZXcgIT09IHRoaXMuc3RhdGUuY3VycmVudFZpZXcpIHtcblx0XHRcdHRoaXMudHJhbnNpdGlvblRvKG5leHRQcm9wcy5jdXJyZW50VmlldywgeyB2aWV3UHJvcHM6IG5leHRQcm9wcy52aWV3UHJvcHMgfSk7XG5cdFx0fVxuXHR9LFxuXHR0cmFuc2l0aW9uVG86IGZ1bmN0aW9uIHRyYW5zaXRpb25Ubyh2aWV3S2V5LCBvcHRpb25zKSB7XG5cdFx0dmFyIF90aGlzID0gdGhpcztcblxuXHRcdGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ3N0cmluZycpIHtcblx0XHRcdG9wdGlvbnMgPSB7IHRyYW5zaXRpb246IG9wdGlvbnMgfTtcblx0XHR9XG5cdFx0aWYgKCFvcHRpb25zKSBvcHRpb25zID0ge307XG5cdFx0dGhpcy5hY3RpdmVUcmFuc2l0aW9uT3B0aW9ucyA9IG9wdGlvbnM7XG5cdFx0dGhpcy5jb250ZXh0LmFwcC52aWV3TWFuYWdlckluVHJhbnNpdGlvbiA9IHRoaXM7XG5cdFx0dGhpcy5wcm9wcy5vblZpZXdDaGFuZ2UgJiYgdGhpcy5wcm9wcy5vblZpZXdDaGFuZ2Uodmlld0tleSk7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRjdXJyZW50Vmlldzogdmlld0tleSxcblx0XHRcdG9wdGlvbnM6IG9wdGlvbnNcblx0XHR9LCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRkZWxldGUgX3RoaXMuYWN0aXZlVHJhbnNpdGlvbk9wdGlvbnM7XG5cdFx0XHRkZWxldGUgX3RoaXMuY29udGV4dC5hcHAudmlld01hbmFnZXJJblRyYW5zaXRpb247XG5cdFx0fSk7XG5cdH0sXG5cdHJlbmRlclZpZXdDb250YWluZXI6IGZ1bmN0aW9uIHJlbmRlclZpZXdDb250YWluZXIoKSB7XG5cdFx0dmFyIHZpZXdLZXkgPSB0aGlzLnN0YXRlLmN1cnJlbnRWaWV3O1xuXHRcdGlmICghdmlld0tleSkge1xuXHRcdFx0cmV0dXJuIF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRfRXJyb3JWaWV3MlsnZGVmYXVsdCddLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHQnc3BhbicsXG5cdFx0XHRcdFx0eyBjbGFzc05hbWU6ICdFcnJvclZpZXdfX2hlYWRpbmcnIH0sXG5cdFx0XHRcdFx0J1ZpZXdNYW5hZ2VyOiAnLFxuXHRcdFx0XHRcdHRoaXMucHJvcHMubmFtZVxuXHRcdFx0XHQpLFxuXHRcdFx0XHRfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHQnc3BhbicsXG5cdFx0XHRcdFx0eyBjbGFzc05hbWU6ICdFcnJvclZpZXdfX3RleHQnIH0sXG5cdFx0XHRcdFx0J0Vycm9yOiBUaGVyZSBpcyBubyBjdXJyZW50IFZpZXcuJ1xuXHRcdFx0XHQpXG5cdFx0XHQpO1xuXHRcdH1cblx0XHR2YXIgdmlldyA9IHRoaXMuc3RhdGUudmlld3Nbdmlld0tleV07XG5cdFx0aWYgKCF2aWV3IHx8ICF2aWV3LnByb3BzLmNvbXBvbmVudCkge1xuXHRcdFx0cmV0dXJuIF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRfRXJyb3JWaWV3MlsnZGVmYXVsdCddLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHQnc3BhbicsXG5cdFx0XHRcdFx0eyBjbGFzc05hbWU6ICdFcnJvclZpZXdfX2hlYWRpbmcnIH0sXG5cdFx0XHRcdFx0J1ZpZXdNYW5hZ2VyOiBcIicsXG5cdFx0XHRcdFx0dGhpcy5wcm9wcy5uYW1lLFxuXHRcdFx0XHRcdCdcIidcblx0XHRcdFx0KSxcblx0XHRcdFx0X3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0J3NwYW4nLFxuXHRcdFx0XHRcdHsgY2xhc3NOYW1lOiAnRXJyb3JWaWV3X190ZXh0JyB9LFxuXHRcdFx0XHRcdCdUaGUgVmlldyBcIicsXG5cdFx0XHRcdFx0dmlld0tleSxcblx0XHRcdFx0XHQnXCIgaXMgaW52YWxpZC4nXG5cdFx0XHRcdClcblx0XHRcdCk7XG5cdFx0fVxuXHRcdHZhciBvcHRpb25zID0gdGhpcy5zdGF0ZS5vcHRpb25zIHx8IHt9O1xuXHRcdHZhciB2aWV3Q2xhc3NOYW1lID0gKDAsIF9jbGFzc25hbWVzMlsnZGVmYXVsdCddKSgnVmlldyBWaWV3LS0nICsgdmlld0tleSwgdmlldy5wcm9wcy5jbGFzc05hbWUpO1xuXHRcdHZhciBWaWV3Q29tcG9uZW50ID0gdmlldy5wcm9wcy5jb21wb25lbnQ7XG5cdFx0dmFyIHZpZXdQcm9wcyA9ICgwLCBfYmxhY2tsaXN0MlsnZGVmYXVsdCddKSh2aWV3LnByb3BzLCAnY29tcG9uZW50JywgJ2NsYXNzTmFtZScpO1xuXHRcdF9leHRlbmRzKHZpZXdQcm9wcywgb3B0aW9ucy52aWV3UHJvcHMpO1xuXHRcdHZhciB2aWV3RWxlbWVudCA9IF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFZpZXdDb21wb25lbnQsIHZpZXdQcm9wcyk7XG5cblx0XHRpZiAodGhpcy5fX2xhc3RSZW5kZXJlZFZpZXcgIT09IHZpZXdLZXkpIHtcblx0XHRcdC8vIGNvbnNvbGUubG9nKCdpbml0aWFsaXNpbmcgdmlldyAnICsgdmlld0tleSArICcgd2l0aCBvcHRpb25zJywgb3B0aW9ucyk7XG5cdFx0XHRpZiAodmlld0VsZW1lbnQudHlwZS5uYXZpZ2F0aW9uQmFyICYmIHZpZXdFbGVtZW50LnR5cGUuZ2V0TmF2aWdhdGlvbikge1xuXHRcdFx0XHR2YXIgYXBwID0gdGhpcy5jb250ZXh0LmFwcDtcblx0XHRcdFx0dmFyIHRyYW5zaXRpb24gPSBvcHRpb25zLnRyYW5zaXRpb247XG5cdFx0XHRcdGlmIChhcHAudmlld01hbmFnZXJJblRyYW5zaXRpb24pIHtcblx0XHRcdFx0XHR0cmFuc2l0aW9uID0gYXBwLnZpZXdNYW5hZ2VySW5UcmFuc2l0aW9uLmFjdGl2ZVRyYW5zaXRpb25PcHRpb25zLnRyYW5zaXRpb247XG5cdFx0XHRcdH1cblx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0YXBwLm5hdmlnYXRpb25CYXJzW3ZpZXdFbGVtZW50LnR5cGUubmF2aWdhdGlvbkJhcl0udXBkYXRlV2l0aFRyYW5zaXRpb24odmlld0VsZW1lbnQudHlwZS5nZXROYXZpZ2F0aW9uKHZpZXdQcm9wcywgYXBwKSwgdHJhbnNpdGlvbik7XG5cdFx0XHRcdH0sIDApO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5fX2xhc3RSZW5kZXJlZFZpZXcgPSB2aWV3S2V5O1xuXHRcdH1cblxuXHRcdHJldHVybiBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdFZpZXdDb250YWluZXIsXG5cdFx0XHR7IGNsYXNzTmFtZTogdmlld0NsYXNzTmFtZSwga2V5OiB2aWV3S2V5IH0sXG5cdFx0XHR2aWV3RWxlbWVudFxuXHRcdCk7XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBjbGFzc05hbWUgPSAoMCwgX2NsYXNzbmFtZXMyWydkZWZhdWx0J10pKCdWaWV3TWFuYWdlcicsIHRoaXMucHJvcHMuY2xhc3NOYW1lKTtcblx0XHR2YXIgdmlld0NvbnRhaW5lciA9IHRoaXMucmVuZGVyVmlld0NvbnRhaW5lcih0aGlzLnN0YXRlLmN1cnJlbnRWaWV3LCB7IHZpZXdQcm9wczogdGhpcy5zdGF0ZS5jdXJyZW50Vmlld1Byb3BzIH0pO1xuXG5cdFx0dmFyIHRyYW5zaXRpb25OYW1lID0gJ3ZpZXctdHJhbnNpdGlvbi1pbnN0YW50Jztcblx0XHR2YXIgdHJhbnNpdGlvbkR1cmF0aW9uRW50ZXIgPSAxMDtcblx0XHR2YXIgdHJhbnNpdGlvbkR1cmF0aW9uTGVhdmUgPSA2MDtcblx0XHRpZiAodGhpcy5zdGF0ZS5vcHRpb25zLnRyYW5zaXRpb24pIHtcblx0XHRcdC8vIGNvbnNvbGUubG9nKCdhcHBseWluZyB2aWV3IHRyYW5zaXRpb246ICcgKyB0aGlzLnN0YXRlLm9wdGlvbnMudHJhbnNpdGlvbiArICcgdG8gdmlldyAnICsgdGhpcy5zdGF0ZS5jdXJyZW50Vmlldyk7XG5cdFx0XHR0cmFuc2l0aW9uTmFtZSA9ICd2aWV3LXRyYW5zaXRpb24tJyArIHRoaXMuc3RhdGUub3B0aW9ucy50cmFuc2l0aW9uO1xuXHRcdFx0aWYgKHRoaXMuc3RhdGUub3B0aW9ucy50cmFuc2l0aW9uID09PSAnZmFkZScpIHtcblx0XHRcdFx0dmFyIHRyYW5zaXRpb25EdXJhdGlvbkVudGVyID0gMTA7XG5cdFx0XHRcdHZhciB0cmFuc2l0aW9uRHVyYXRpb25MZWF2ZSA9IDM0MDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhciB0cmFuc2l0aW9uRHVyYXRpb25FbnRlciA9IDUwMDtcblx0XHRcdFx0dmFyIHRyYW5zaXRpb25EdXJhdGlvbkxlYXZlID0gNTAwO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRfcmVhY3RBZGRvbnNDc3NUcmFuc2l0aW9uR3JvdXAyWydkZWZhdWx0J10sXG5cdFx0XHR7IHRyYW5zaXRpb25OYW1lOiB0cmFuc2l0aW9uTmFtZSwgdHJhbnNpdGlvbkVudGVyVGltZW91dDogdHJhbnNpdGlvbkR1cmF0aW9uRW50ZXIsIHRyYW5zaXRpb25MZWF2ZVRpbWVvdXQ6IHRyYW5zaXRpb25EdXJhdGlvbkxlYXZlLCBjbGFzc05hbWU6IGNsYXNzTmFtZSwgY29tcG9uZW50OiAnZGl2JyB9LFxuXHRcdFx0dmlld0NvbnRhaW5lclxuXHRcdCk7XG5cdH1cbn0pO1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBWaWV3TWFuYWdlcjtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIGFuaW1hdGlvbiA9IHJlcXVpcmUoJ3R3ZWVuLmpzJyk7XG5cbmZ1bmN0aW9uIHVwZGF0ZSgpIHtcblx0YW5pbWF0aW9uLnVwZGF0ZSgpO1xuXHRpZiAoYW5pbWF0aW9uLmdldEFsbCgpLmxlbmd0aCkge1xuXHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlKTtcblx0fVxufVxuXG5mdW5jdGlvbiBzY3JvbGxUb1RvcChlbCwgb3B0aW9ucykge1xuXHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0dmFyIGZyb20gPSBlbC5zY3JvbGxUb3A7XG5cdHZhciBkdXJhdGlvbiA9IE1hdGgubWluKE1hdGgubWF4KDIwMCwgZnJvbSAvIDIpLCAzNTApO1xuXHRpZiAoZnJvbSA+IDIwMCkgZHVyYXRpb24gPSAzMDA7XG5cdGVsLnN0eWxlLndlYmtpdE92ZXJmbG93U2Nyb2xsaW5nID0gJ2F1dG8nO1xuXHRlbC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuXHR2YXIgdHdlZW4gPSBuZXcgYW5pbWF0aW9uLlR3ZWVuKHsgcG9zOiBmcm9tIH0pLnRvKHsgcG9zOiAwIH0sIGR1cmF0aW9uKS5lYXNpbmcoYW5pbWF0aW9uLkVhc2luZy5RdWFkcmF0aWMuT3V0KS5vblVwZGF0ZShmdW5jdGlvbiAoKSB7XG5cdFx0ZWwuc2Nyb2xsVG9wID0gdGhpcy5wb3M7XG5cdFx0aWYgKG9wdGlvbnMub25VcGRhdGUpIHtcblx0XHRcdG9wdGlvbnMub25VcGRhdGUoKTtcblx0XHR9XG5cdH0pLm9uQ29tcGxldGUoZnVuY3Rpb24gKCkge1xuXHRcdGVsLnN0eWxlLndlYmtpdE92ZXJmbG93U2Nyb2xsaW5nID0gJ3RvdWNoJztcblx0XHRlbC5zdHlsZS5vdmVyZmxvdyA9ICdzY3JvbGwnO1xuXHRcdGlmIChvcHRpb25zLm9uQ29tcGxldGUpIG9wdGlvbnMub25Db21wbGV0ZSgpO1xuXHR9KS5zdGFydCgpO1xuXHR1cGRhdGUoKTtcblx0cmV0dXJuIHR3ZWVuO1xufVxuXG5leHBvcnRzLnNjcm9sbFRvVG9wID0gc2Nyb2xsVG9Ub3A7XG5cbnZhciBNaXhpbnMgPSBleHBvcnRzLk1peGlucyA9IHt9O1xuXG5NaXhpbnMuU2Nyb2xsQ29udGFpbmVyVG9Ub3AgPSB7XG5cdGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiBjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignc3RhdHVzVGFwJywgdGhpcy5zY3JvbGxDb250YWluZXJUb1RvcCk7XG5cdH0sXG5cdGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiBjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignc3RhdHVzVGFwJywgdGhpcy5zY3JvbGxDb250YWluZXJUb1RvcCk7XG5cdFx0aWYgKHRoaXMuX3Njcm9sbENvbnRhaW5lckFuaW1hdGlvbikge1xuXHRcdFx0dGhpcy5fc2Nyb2xsQ29udGFpbmVyQW5pbWF0aW9uLnN0b3AoKTtcblx0XHR9XG5cdH0sXG5cdHNjcm9sbENvbnRhaW5lclRvVG9wOiBmdW5jdGlvbiBzY3JvbGxDb250YWluZXJUb1RvcCgpIHtcblx0XHR2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdFx0aWYgKCF0aGlzLmlzTW91bnRlZCgpIHx8ICF0aGlzLnJlZnMuc2Nyb2xsQ29udGFpbmVyKSByZXR1cm47XG5cdFx0dGhpcy5fc2Nyb2xsQ29udGFpbmVyQW5pbWF0aW9uID0gc2Nyb2xsVG9Ub3AodGhpcy5yZWZzLnNjcm9sbENvbnRhaW5lciwge1xuXHRcdFx0b25Db21wbGV0ZTogZnVuY3Rpb24gb25Db21wbGV0ZSgpIHtcblx0XHRcdFx0ZGVsZXRlIF90aGlzLl9zY3JvbGxDb250YWluZXJBbmltYXRpb247XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7XG5cdHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuY3JlYXRlQXBwID0gY3JlYXRlQXBwO1xudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcblxudmFyIGFuaW1hdGlvbiA9IHJlcXVpcmUoJy4vY29yZS9hbmltYXRpb24nKTtcbmV4cG9ydHMuYW5pbWF0aW9uID0gYW5pbWF0aW9uO1xudmFyIExpbmsgPSByZXF1aXJlKCcuL2NvcmUvTGluaycpO1xuZXhwb3J0cy5MaW5rID0gTGluaztcbnZhciBWaWV3ID0gcmVxdWlyZSgnLi9jb3JlL1ZpZXcnKTtcbmV4cG9ydHMuVmlldyA9IFZpZXc7XG52YXIgVmlld01hbmFnZXIgPSByZXF1aXJlKCcuL2NvcmUvVmlld01hbmFnZXInKTtcblxuZXhwb3J0cy5WaWV3TWFuYWdlciA9IFZpZXdNYW5hZ2VyO1xudmFyIENvbnRhaW5lciA9IHJlcXVpcmUoJ3JlYWN0LWNvbnRhaW5lcicpO1xuZXhwb3J0cy5Db250YWluZXIgPSBDb250YWluZXI7XG52YXIgTWl4aW5zID0gcmVxdWlyZSgnLi9taXhpbnMnKTtcbmV4cG9ydHMuTWl4aW5zID0gTWl4aW5zO1xudmFyIFVJID0gcmVxdWlyZSgnLi91aScpO1xuXG5leHBvcnRzLlVJID0gVUk7XG5cbmZ1bmN0aW9uIGNyZWF0ZUFwcCgpIHtcblx0dmFyIGFwcCA9IHtcblx0XHRuYXZpZ2F0aW9uQmFyczoge30sXG5cdFx0dmlld01hbmFnZXJzOiB7fSxcblx0XHR0cmFuc2l0aW9uVG86IGZ1bmN0aW9uIHRyYW5zaXRpb25Ubyh2aWV3LCBvcHRzKSB7XG5cdFx0XHR2YXIgdm0gPSAnX19kZWZhdWx0Jztcblx0XHRcdHZpZXcgPSB2aWV3LnNwbGl0KCc6Jyk7XG5cdFx0XHRpZiAodmlldy5sZW5ndGggPiAxKSB7XG5cdFx0XHRcdHZtID0gdmlldy5zaGlmdCgpO1xuXHRcdFx0fVxuXHRcdFx0dmlldyA9IHZpZXdbMF07XG5cdFx0XHRhcHAudmlld01hbmFnZXJzW3ZtXS50cmFuc2l0aW9uVG8odmlldywgb3B0cyk7XG5cdFx0fVxuXHR9O1xuXHRyZXR1cm4ge1xuXHRcdGNoaWxkQ29udGV4dFR5cGVzOiB7XG5cdFx0XHRhcHA6IFJlYWN0LlByb3BUeXBlcy5vYmplY3Rcblx0XHR9LFxuXHRcdGdldENoaWxkQ29udGV4dDogZnVuY3Rpb24gZ2V0Q2hpbGRDb250ZXh0KCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0YXBwOiBhcHBcblx0XHRcdH07XG5cdFx0fVxuXHR9O1xufSIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywge1xuXHR2YWx1ZTogdHJ1ZVxufSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH1cblxudmFyIF9yZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG5cbnZhciBfcmVhY3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcmVhY3QpO1xuXG52YXIgVHJhbnNpdGlvbnMgPSB7XG5cdGNvbnRleHRUeXBlczoge1xuXHRcdGFwcDogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5vYmplY3Rcblx0fSxcblx0dHJhbnNpdGlvblRvOiBmdW5jdGlvbiB0cmFuc2l0aW9uVG8odmlldywgb3B0cykge1xuXHRcdHRoaXMuY29udGV4dC5hcHAudHJhbnNpdGlvblRvKHZpZXcsIG9wdHMpO1xuXHR9XG59O1xuXG5leHBvcnRzWydkZWZhdWx0J10gPSBUcmFuc2l0aW9ucztcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG52YXIgVHJhbnNpdGlvbnMgPSByZXF1aXJlKCcuL1RyYW5zaXRpb25zJyk7XG5leHBvcnRzLlRyYW5zaXRpb25zID0gVHJhbnNpdGlvbnM7IiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9XG5cbnZhciBfY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcblxudmFyIF9jbGFzc25hbWVzMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2NsYXNzbmFtZXMpO1xuXG52YXIgX3JlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcblxudmFyIF9yZWFjdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9yZWFjdCk7XG5cbnZhciBfcmVhY3RBZGRvbnNDc3NUcmFuc2l0aW9uR3JvdXAgPSByZXF1aXJlKCdyZWFjdC1hZGRvbnMtY3NzLXRyYW5zaXRpb24tZ3JvdXAnKTtcblxudmFyIF9yZWFjdEFkZG9uc0Nzc1RyYW5zaXRpb25Hcm91cDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9yZWFjdEFkZG9uc0Nzc1RyYW5zaXRpb25Hcm91cCk7XG5cbm1vZHVsZS5leHBvcnRzID0gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdBbGVydGJhcicsXG5cdHByb3BUeXBlczoge1xuXHRcdGFuaW1hdGVkOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLmJvb2wsXG5cdFx0Y2hpbGRyZW46IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMubm9kZS5pc1JlcXVpcmVkLFxuXHRcdGNsYXNzTmFtZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0cHVsc2U6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuYm9vbCxcblx0XHR0eXBlOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLm9uZU9mKFsnZGVmYXVsdCcsICdwcmltYXJ5JywgJ3N1Y2Nlc3MnLCAnd2FybmluZycsICdkYW5nZXInXSksXG5cdFx0dmlzaWJsZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5ib29sXG5cdH0sXG5cblx0Z2V0RGVmYXVsdFByb3BzOiBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHR5cGU6ICdkZWZhdWx0J1xuXHRcdH07XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9ICgwLCBfY2xhc3NuYW1lczJbJ2RlZmF1bHQnXSkoJ0FsZXJ0YmFyJywgJ0FsZXJ0YmFyLS0nICsgdGhpcy5wcm9wcy50eXBlLCB7XG5cdFx0XHQnQWxlcnRiYXItLWFuaW1hdGVkJzogdGhpcy5wcm9wcy5hbmltYXRlZCxcblx0XHRcdCdBbGVydGJhci0tcHVsc2UnOiB0aGlzLnByb3BzLnB1bHNlXG5cdFx0fSwgdGhpcy5wcm9wcy5jbGFzc05hbWUpO1xuXG5cdFx0dmFyIHB1bHNlV3JhcCA9IHRoaXMucHJvcHMucHVsc2UgPyBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6ICdBbGVydGJhcl9faW5uZXInIH0sXG5cdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0KSA6IHRoaXMucHJvcHMuY2hpbGRyZW47XG5cdFx0dmFyIGFuaW1hdGVkQmFyID0gdGhpcy5wcm9wcy52aXNpYmxlID8gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSxcblx0XHRcdHB1bHNlV3JhcFxuXHRcdCkgOiBudWxsO1xuXG5cdFx0dmFyIGNvbXBvbmVudCA9IHRoaXMucHJvcHMuYW5pbWF0ZWQgPyBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdF9yZWFjdEFkZG9uc0Nzc1RyYW5zaXRpb25Hcm91cDJbJ2RlZmF1bHQnXSxcblx0XHRcdHsgdHJhbnNpdGlvbk5hbWU6ICdBbGVydGJhcicsIHRyYW5zaXRpb25FbnRlclRpbWVvdXQ6IDMwMCwgdHJhbnNpdGlvbkxlYXZlVGltZW91dDogMzAwLCBjb21wb25lbnQ6ICdkaXYnIH0sXG5cdFx0XHRhbmltYXRlZEJhclxuXHRcdCkgOiBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9LFxuXHRcdFx0cHVsc2VXcmFwXG5cdFx0KTtcblxuXHRcdHJldHVybiBjb21wb25lbnQ7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfVxuXG52YXIgX2JsYWNrbGlzdCA9IHJlcXVpcmUoJ2JsYWNrbGlzdCcpO1xuXG52YXIgX2JsYWNrbGlzdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9ibGFja2xpc3QpO1xuXG52YXIgX2NsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbnZhciBfY2xhc3NuYW1lczIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9jbGFzc25hbWVzKTtcblxudmFyIF9yZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG5cbnZhciBfcmVhY3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcmVhY3QpO1xuXG52YXIgX3JlYWN0VGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpO1xuXG52YXIgX3JlYWN0VGFwcGFibGUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcmVhY3RUYXBwYWJsZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdCdXR0b24nLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRjaGlsZHJlbjogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5ub2RlLmlzUmVxdWlyZWQsXG5cdFx0Y2xhc3NOYW1lOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZyxcblx0XHR0eXBlOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLm9uZU9mKFsnZGVmYXVsdCcsICdpbmZvJywgJ3ByaW1hcnknLCAnc3VjY2VzcycsICd3YXJuaW5nJywgJ2RhbmdlciddKVxuXHR9LFxuXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0eXBlOiAnZGVmYXVsdCdcblx0XHR9O1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBjbGFzc05hbWUgPSAoMCwgX2NsYXNzbmFtZXMyWydkZWZhdWx0J10pKCdCdXR0b24nLCAnQnV0dG9uLS0nICsgdGhpcy5wcm9wcy50eXBlLCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cdFx0dmFyIHByb3BzID0gKDAsIF9ibGFja2xpc3QyWydkZWZhdWx0J10pKHRoaXMucHJvcHMsICd0eXBlJyk7XG5cblx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoX3JlYWN0VGFwcGFibGUyWydkZWZhdWx0J10sIF9leHRlbmRzKHt9LCBwcm9wcywgeyBjbGFzc05hbWU6IGNsYXNzTmFtZSwgY29tcG9uZW50OiAnYnV0dG9uJyB9KSk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfVxuXG52YXIgX2JsYWNrbGlzdCA9IHJlcXVpcmUoJ2JsYWNrbGlzdCcpO1xuXG52YXIgX2JsYWNrbGlzdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9ibGFja2xpc3QpO1xuXG52YXIgX2NsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbnZhciBfY2xhc3NuYW1lczIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9jbGFzc25hbWVzKTtcblxudmFyIF9yZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG5cbnZhciBfcmVhY3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcmVhY3QpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnQnV0dG9uR3JvdXAnLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRjaGlsZHJlbjogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5ub2RlLmlzUmVxdWlyZWQsXG5cdFx0Y2xhc3NOYW1lOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gKDAsIF9jbGFzc25hbWVzMlsnZGVmYXVsdCddKSgnQnV0dG9uR3JvdXAnLCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cdFx0dmFyIHByb3BzID0gKDAsIF9ibGFja2xpc3QyWydkZWZhdWx0J10pKHRoaXMucHJvcHMsICdjbGFzc05hbWUnKTtcblxuXHRcdHJldHVybiBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudCgnZGl2JywgX2V4dGVuZHMoeyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9LCBwcm9wcykpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH1cblxudmFyIF9jbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG52YXIgX2NsYXNzbmFtZXMyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfY2xhc3NuYW1lcyk7XG5cbnZhciBfcmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG52YXIgX3JlYWN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0KTtcblxudmFyIF9yZWFjdFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKTtcblxudmFyIF9yZWFjdFRhcHBhYmxlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0VGFwcGFibGUpO1xuXG52YXIgaTE4biA9IHtcblx0Ly8gVE9ETzogdXNlIHJlYWwgaTE4biBzdHJpbmdzLlxuXHR3ZWVrZGF5c01pbjogWydTJywgJ00nLCAnVCcsICdXJywgJ1QnLCAnRicsICdTJ10sXG5cdG1vbnRoczogWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsICdPY3QnLCAnTm92JywgJ0RlYyddLFxuXHRsb25nTW9udGhzOiBbJ0phbnVhcnknLCAnRmVicnVhcnknLCAnTWFyY2gnLCAnQXByaWwnLCAnTWF5JywgJ0p1bmUnLCAnSnVseScsICdBdWd1c3QnLCAnU2VwdGVtYmVyJywgJ09jdG9iZXInLCAnTm92ZW1iZXInLCAnRGVjZW1iZXInXSxcblx0Zm9ybWF0WWVhck1vbnRoOiBmdW5jdGlvbiBmb3JtYXRZZWFyTW9udGgoeWVhciwgbW9udGgpIHtcblx0XHRyZXR1cm4geWVhciArICcgLSAnICsgKG1vbnRoICsgMSk7XG5cdH1cbn07XG5cbmZ1bmN0aW9uIG5ld1N0YXRlKHByb3BzKSB7XG5cdHZhciBkYXRlID0gcHJvcHMuZGF0ZSB8fCBuZXcgRGF0ZSgpO1xuXHR2YXIgeWVhciA9IGRhdGUuZ2V0RnVsbFllYXIoKTtcblx0dmFyIG1vbnRoID0gZGF0ZS5nZXRNb250aCgpO1xuXHR2YXIgbnMgPSB7XG5cdFx0bW9kZTogJ2RheScsXG5cdFx0eWVhcjogeWVhcixcblx0XHRtb250aDogbW9udGgsXG5cdFx0ZGF5OiBkYXRlLmdldERhdGUoKSxcblx0XHRkaXNwbGF5WWVhcjogeWVhcixcblx0XHRkaXNwbGF5TW9udGg6IG1vbnRoLFxuXHRcdGRpc3BsYXlZZWFyUmFuZ2VTdGFydDogTWF0aC5mbG9vcih5ZWFyIC8gMTApICogMTBcblx0fTtcblx0cmV0dXJuIG5zO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnRGF0ZVBpY2tlcicsXG5cdHByb3BUeXBlczoge1xuXHRcdGRhdGU6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMub2JqZWN0LFxuXHRcdG1vZGU6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMub25lT2YoWydkYXknLCAnbW9udGgnXSksXG5cdFx0b25DaGFuZ2U6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuZnVuY1xuXHR9LFxuXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRkYXRlOiBuZXcgRGF0ZSgpXG5cdFx0fTtcblx0fSxcblxuXHRnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uIGdldEluaXRpYWxTdGF0ZSgpIHtcblx0XHRyZXR1cm4gbmV3U3RhdGUodGhpcy5wcm9wcyk7XG5cdH0sXG5cblx0Y29tcG9uZW50V2lsbFJlY2VpdmVQcm9wczogZnVuY3Rpb24gY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcyhuZXh0UHJvcHMpIHtcblx0XHR0aGlzLnNldFN0YXRlKG5ld1N0YXRlKG5leHRQcm9wcykpO1xuXHR9LFxuXG5cdHNlbGVjdERheTogZnVuY3Rpb24gc2VsZWN0RGF5KHllYXIsIG1vbnRoLCBkYXkpIHtcblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdHllYXI6IHllYXIsXG5cdFx0XHRtb250aDogbW9udGgsXG5cdFx0XHRkYXk6IGRheVxuXHRcdH0pO1xuXG5cdFx0aWYgKHRoaXMucHJvcHMub25DaGFuZ2UpIHtcblx0XHRcdHRoaXMucHJvcHMub25DaGFuZ2UobmV3IERhdGUoeWVhciwgbW9udGgsIGRheSkpO1xuXHRcdH1cblx0fSxcblxuXHRzZWxlY3RNb250aDogZnVuY3Rpb24gc2VsZWN0TW9udGgobW9udGgpIHtcblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdGRpc3BsYXlNb250aDogbW9udGgsXG5cdFx0XHRtb2RlOiAnZGF5J1xuXHRcdH0pO1xuXHR9LFxuXG5cdHNlbGVjdFllYXI6IGZ1bmN0aW9uIHNlbGVjdFllYXIoeWVhcikge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0ZGlzcGxheVllYXI6IHllYXIsXG5cdFx0XHRkaXNwbGF5WWVhclJhbmdlU3RhcnQ6IE1hdGguZmxvb3IoeWVhciAvIDEwKSAqIDEwLFxuXHRcdFx0bW9kZTogJ21vbnRoJ1xuXHRcdH0pO1xuXHR9LFxuXG5cdGhhbmRsZXJUb3BCYXJUaXRsZUNsaWNrOiBmdW5jdGlvbiBoYW5kbGVyVG9wQmFyVGl0bGVDbGljaygpIHtcblx0XHRpZiAodGhpcy5zdGF0ZS5tb2RlID09PSAnZGF5Jykge1xuXHRcdFx0dGhpcy5zZXRTdGF0ZSh7IG1vZGU6ICdtb250aCcgfSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuc2V0U3RhdGUoeyBtb2RlOiAnZGF5JyB9KTtcblx0XHR9XG5cdH0sXG5cblx0aGFuZGxlTGVmdEFycm93Q2xpY2s6IGZ1bmN0aW9uIGhhbmRsZUxlZnRBcnJvd0NsaWNrKCkge1xuXHRcdHN3aXRjaCAodGhpcy5zdGF0ZS5tb2RlKSB7XG5cdFx0XHRjYXNlICdkYXknOlxuXHRcdFx0XHR0aGlzLmdvUHJldmlvdXNNb250aCgpO1xuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSAnbW9udGgnOlxuXHRcdFx0XHR0aGlzLmdvUHJldmlvdXNZZWFyUmFuZ2UoKTtcblx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdGNhc2UgJ3llYXInOlxuXHRcdFx0XHR0aGlzLmdvUHJldmlvdXNZZWFyUmFuZ2UoKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9LFxuXG5cdGhhbmRsZVJpZ2h0QXJyb3dDbGljazogZnVuY3Rpb24gaGFuZGxlUmlnaHRBcnJvd0NsaWNrKCkge1xuXHRcdHN3aXRjaCAodGhpcy5zdGF0ZS5tb2RlKSB7XG5cdFx0XHRjYXNlICdkYXknOlxuXHRcdFx0XHR0aGlzLmdvTmV4dE1vbnRoKCk7XG5cdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRjYXNlICdtb250aCc6XG5cdFx0XHRcdHRoaXMuZ29OZXh0WWVhclJhbmdlKCk7XG5cdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRjYXNlICd5ZWFyJzpcblx0XHRcdFx0dGhpcy5nb05leHRZZWFyUmFuZ2UoKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9LFxuXG5cdGdvUHJldmlvdXNNb250aDogZnVuY3Rpb24gZ29QcmV2aW91c01vbnRoKCkge1xuXHRcdGlmICh0aGlzLnN0YXRlLmRpc3BsYXlNb250aCA9PT0gMCkge1xuXHRcdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRcdGRpc3BsYXlNb250aDogMTEsXG5cdFx0XHRcdGRpc3BsYXlZZWFyOiB0aGlzLnN0YXRlLmRpc3BsYXlZZWFyIC0gMVxuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0XHRkaXNwbGF5TW9udGg6IHRoaXMuc3RhdGUuZGlzcGxheU1vbnRoIC0gMVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9LFxuXG5cdGdvTmV4dE1vbnRoOiBmdW5jdGlvbiBnb05leHRNb250aCgpIHtcblx0XHRpZiAodGhpcy5zdGF0ZS5kaXNwbGF5TW9udGggPT09IDExKSB7XG5cdFx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdFx0ZGlzcGxheU1vbnRoOiAwLFxuXHRcdFx0XHRkaXNwbGF5WWVhcjogdGhpcy5zdGF0ZS5kaXNwbGF5WWVhciArIDFcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdFx0ZGlzcGxheU1vbnRoOiB0aGlzLnN0YXRlLmRpc3BsYXlNb250aCArIDFcblx0XHRcdH0pO1xuXHRcdH1cblx0fSxcblxuXHRnb1ByZXZpb3VzWWVhcjogZnVuY3Rpb24gZ29QcmV2aW91c1llYXIoKSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRkaXNwbGF5WWVhcjogdGhpcy5zdGF0ZS5kaXNwbGF5WWVhciAtIDFcblx0XHR9KTtcblx0fSxcblxuXHRnb05leHRZZWFyOiBmdW5jdGlvbiBnb05leHRZZWFyKCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0ZGlzcGxheVllYXI6IHRoaXMuc3RhdGUuZGlzcGxheVllYXIgKyAxXG5cdFx0fSk7XG5cdH0sXG5cblx0Z29QcmV2aW91c1llYXJSYW5nZTogZnVuY3Rpb24gZ29QcmV2aW91c1llYXJSYW5nZSgpIHtcblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdGRpc3BsYXlZZWFyUmFuZ2VTdGFydDogdGhpcy5zdGF0ZS5kaXNwbGF5WWVhclJhbmdlU3RhcnQgLSAxMFxuXHRcdH0pO1xuXHR9LFxuXG5cdGdvTmV4dFllYXJSYW5nZTogZnVuY3Rpb24gZ29OZXh0WWVhclJhbmdlKCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0ZGlzcGxheVllYXJSYW5nZVN0YXJ0OiB0aGlzLnN0YXRlLmRpc3BsYXlZZWFyUmFuZ2VTdGFydCArIDEwXG5cdFx0fSk7XG5cdH0sXG5cblx0cmVuZGVyV2Vla25hbWVzOiBmdW5jdGlvbiByZW5kZXJXZWVrbmFtZXMoKSB7XG5cdFx0cmV0dXJuIGkxOG4ud2Vla2RheXNNaW4ubWFwKGZ1bmN0aW9uIChuYW1lLCBpKSB7XG5cdFx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdCdzcGFuJyxcblx0XHRcdFx0eyBrZXk6IG5hbWUgKyBpLCBjbGFzc05hbWU6ICd3ZWVrLW5hbWUnIH0sXG5cdFx0XHRcdG5hbWVcblx0XHRcdCk7XG5cdFx0fSk7XG5cdH0sXG5cblx0cmVuZGVyRGF5czogZnVuY3Rpb24gcmVuZGVyRGF5cygpIHtcblx0XHR2YXIgZGlzcGxheVllYXIgPSB0aGlzLnN0YXRlLmRpc3BsYXlZZWFyO1xuXHRcdHZhciBkaXNwbGF5TW9udGggPSB0aGlzLnN0YXRlLmRpc3BsYXlNb250aDtcblx0XHR2YXIgdG9kYXkgPSBuZXcgRGF0ZSgpO1xuXHRcdHZhciBsYXN0RGF5SW5Nb250aCA9IG5ldyBEYXRlKGRpc3BsYXlZZWFyLCBkaXNwbGF5TW9udGggKyAxLCAwKTtcblx0XHR2YXIgZGF5c0luTW9udGggPSBsYXN0RGF5SW5Nb250aC5nZXREYXRlKCk7XG5cdFx0dmFyIGRheXNJblByZXZpb3VzTW9udGggPSBuZXcgRGF0ZShkaXNwbGF5WWVhciwgZGlzcGxheU1vbnRoLCAwKS5nZXREYXRlKCk7XG5cdFx0dmFyIHN0YXJ0V2Vla0RheSA9IG5ldyBEYXRlKGRpc3BsYXlZZWFyLCBkaXNwbGF5TW9udGgsIDEpLmdldERheSgpO1xuXHRcdHZhciBkYXlzID0gW107XG5cdFx0dmFyIGksIGRtLCBkeTtcblxuXHRcdGZvciAoaSA9IDA7IGkgPCBzdGFydFdlZWtEYXk7IGkrKykge1xuXHRcdFx0dmFyIGQgPSBkYXlzSW5QcmV2aW91c01vbnRoIC0gKHN0YXJ0V2Vla0RheSAtIDEgLSBpKTtcblx0XHRcdGRtID0gZGlzcGxheU1vbnRoIC0gMTtcblx0XHRcdGR5ID0gZGlzcGxheVllYXI7XG5cdFx0XHRpZiAoZG0gPT09IC0xKSB7XG5cdFx0XHRcdGRtID0gMTE7XG5cdFx0XHRcdGR5IC09IDE7XG5cdFx0XHR9XG5cdFx0XHRkYXlzLnB1c2goX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdF9yZWFjdFRhcHBhYmxlMlsnZGVmYXVsdCddLFxuXHRcdFx0XHR7IGtleTogJ3AnICsgaSwgb25UYXA6IHRoaXMuc2VsZWN0RGF5LmJpbmQodGhpcywgZHksIGRtLCBkKSwgY2xhc3NOYW1lOiAnZGF5IGluLXByZXZpb3VzLW1vbnRoJyB9LFxuXHRcdFx0XHRkXG5cdFx0XHQpKTtcblx0XHR9XG5cblx0XHR2YXIgaW5UaGlzTW9udGggPSBkaXNwbGF5WWVhciA9PT0gdG9kYXkuZ2V0RnVsbFllYXIoKSAmJiBkaXNwbGF5TW9udGggPT09IHRvZGF5LmdldE1vbnRoKCk7XG5cdFx0dmFyIGluU2VsZWN0ZWRNb250aCA9IGRpc3BsYXlZZWFyID09PSB0aGlzLnN0YXRlLnllYXIgJiYgZGlzcGxheU1vbnRoID09PSB0aGlzLnN0YXRlLm1vbnRoO1xuXHRcdGZvciAoaSA9IDE7IGkgPD0gZGF5c0luTW9udGg7IGkrKykge1xuXHRcdFx0dmFyIGNzc0NsYXNzID0gKDAsIF9jbGFzc25hbWVzMlsnZGVmYXVsdCddKSh7XG5cdFx0XHRcdCdkYXknOiB0cnVlLFxuXHRcdFx0XHQnaXMtdG9kYXknOiBpblRoaXNNb250aCAmJiBpID09PSB0b2RheS5nZXREYXRlKCksXG5cdFx0XHRcdCdpcy1jdXJyZW50JzogaW5TZWxlY3RlZE1vbnRoICYmIGkgPT09IHRoaXMuc3RhdGUuZGF5XG5cdFx0XHR9KTtcblx0XHRcdGRheXMucHVzaChfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdFx0X3JlYWN0VGFwcGFibGUyWydkZWZhdWx0J10sXG5cdFx0XHRcdHsga2V5OiBpLCBvblRhcDogdGhpcy5zZWxlY3REYXkuYmluZCh0aGlzLCBkaXNwbGF5WWVhciwgZGlzcGxheU1vbnRoLCBpKSwgY2xhc3NOYW1lOiBjc3NDbGFzcyB9LFxuXHRcdFx0XHRpXG5cdFx0XHQpKTtcblx0XHR9XG5cblx0XHR2YXIgYyA9IHN0YXJ0V2Vla0RheSArIGRheXNJbk1vbnRoO1xuXHRcdGZvciAoaSA9IDE7IGkgPD0gNDIgLSBjOyBpKyspIHtcblx0XHRcdGRtID0gZGlzcGxheU1vbnRoICsgMTtcblx0XHRcdGR5ID0gZGlzcGxheVllYXI7XG5cdFx0XHRpZiAoZG0gPT09IDEyKSB7XG5cdFx0XHRcdGRtID0gMDtcblx0XHRcdFx0ZHkgKz0gMTtcblx0XHRcdH1cblx0XHRcdGRheXMucHVzaChfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdFx0X3JlYWN0VGFwcGFibGUyWydkZWZhdWx0J10sXG5cdFx0XHRcdHsga2V5OiAnbicgKyBpLCBvblRhcDogdGhpcy5zZWxlY3REYXkuYmluZCh0aGlzLCBkeSwgZG0sIGkpLCBjbGFzc05hbWU6ICdkYXkgaW4tbmV4dC1tb250aCcgfSxcblx0XHRcdFx0aVxuXHRcdFx0KSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGRheXM7XG5cdH0sXG5cblx0cmVuZGVyTW9udGhzOiBmdW5jdGlvbiByZW5kZXJNb250aHMoKSB7XG5cdFx0dmFyIF90aGlzID0gdGhpcztcblxuXHRcdHJldHVybiBpMThuLm1vbnRocy5tYXAoZnVuY3Rpb24gKG5hbWUsIG0pIHtcblx0XHRcdHJldHVybiBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdFx0X3JlYWN0VGFwcGFibGUyWydkZWZhdWx0J10sXG5cdFx0XHRcdHsga2V5OiBuYW1lICsgbSwgY2xhc3NOYW1lOiAoMCwgX2NsYXNzbmFtZXMyWydkZWZhdWx0J10pKCdtb250aC1uYW1lJywgeyAnaXMtY3VycmVudCc6IG0gPT09IF90aGlzLnN0YXRlLmRpc3BsYXlNb250aCB9KSxcblx0XHRcdFx0XHRvblRhcDogX3RoaXMuc2VsZWN0TW9udGguYmluZChfdGhpcywgbSkgfSxcblx0XHRcdFx0bmFtZVxuXHRcdFx0KTtcblx0XHR9KTtcblx0fSxcblxuXHRyZW5kZXJZZWFyczogZnVuY3Rpb24gcmVuZGVyWWVhcnMoKSB7XG5cdFx0dmFyIHllYXJzID0gW107XG5cdFx0Zm9yICh2YXIgaSA9IHRoaXMuc3RhdGUuZGlzcGxheVllYXJSYW5nZVN0YXJ0IC0gMTsgaSA8IHRoaXMuc3RhdGUuZGlzcGxheVllYXJSYW5nZVN0YXJ0ICsgMTE7IGkrKykge1xuXHRcdFx0eWVhcnMucHVzaChfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdFx0X3JlYWN0VGFwcGFibGUyWydkZWZhdWx0J10sXG5cdFx0XHRcdHsga2V5OiBpLCBjbGFzc05hbWU6ICgwLCBfY2xhc3NuYW1lczJbJ2RlZmF1bHQnXSkoJ3llYXInLCB7ICdpcy1jdXJyZW50JzogaSA9PT0gdGhpcy5zdGF0ZS5kaXNwbGF5WWVhciB9KSxcblx0XHRcdFx0XHRvblRhcDogdGhpcy5zZWxlY3RZZWFyLmJpbmQodGhpcywgaSkgfSxcblx0XHRcdFx0aVxuXHRcdFx0KSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHllYXJzO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciB0b3BCYXJUaXRsZSA9ICcnO1xuXHRcdHN3aXRjaCAodGhpcy5zdGF0ZS5tb2RlKSB7XG5cdFx0XHRjYXNlICdkYXknOlxuXHRcdFx0XHR0b3BCYXJUaXRsZSA9IGkxOG4uZm9ybWF0WWVhck1vbnRoKHRoaXMuc3RhdGUuZGlzcGxheVllYXIsIHRoaXMuc3RhdGUuZGlzcGxheU1vbnRoKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdtb250aCc6XG5cdFx0XHRcdHRvcEJhclRpdGxlID0gdGhpcy5zdGF0ZS5kaXNwbGF5WWVhclJhbmdlU3RhcnQgKyAnIC0gJyArICh0aGlzLnN0YXRlLmRpc3BsYXlZZWFyUmFuZ2VTdGFydCArIDkpO1xuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cblx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiAoMCwgX2NsYXNzbmFtZXMyWydkZWZhdWx0J10pKCdkYXRlLXBpY2tlcicsICdtb2RlLScgKyB0aGlzLnN0YXRlLm1vZGUpIH0sXG5cdFx0XHRfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdHsgY2xhc3NOYW1lOiAndG9wLWJhcicgfSxcblx0XHRcdFx0X3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoX3JlYWN0VGFwcGFibGUyWydkZWZhdWx0J10sIHsgY2xhc3NOYW1lOiAnbGVmdC1hcnJvdycsIG9uVGFwOiB0aGlzLmhhbmRsZUxlZnRBcnJvd0NsaWNrIH0pLFxuXHRcdFx0XHRfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChfcmVhY3RUYXBwYWJsZTJbJ2RlZmF1bHQnXSwgeyBjbGFzc05hbWU6ICdyaWdodC1hcnJvdycsIG9uVGFwOiB0aGlzLmhhbmRsZVJpZ2h0QXJyb3dDbGljayB9KSxcblx0XHRcdFx0X3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0X3JlYWN0VGFwcGFibGUyWydkZWZhdWx0J10sXG5cdFx0XHRcdFx0eyBjbGFzc05hbWU6ICd0b3AtYmFyLXRpdGxlJywgb25UYXA6IHRoaXMuaGFuZGxlclRvcEJhclRpdGxlQ2xpY2sgfSxcblx0XHRcdFx0XHR0b3BCYXJUaXRsZVxuXHRcdFx0XHQpXG5cdFx0XHQpLFxuXHRcdFx0dGhpcy5zdGF0ZS5tb2RlID09PSAnZGF5JyAmJiBbX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHR7IGtleTogJ3dlZWtuYW1lcycsIGNsYXNzTmFtZTogJ3dlZWstbmFtZXMtY29udGFpbmVyJyB9LFxuXHRcdFx0XHR0aGlzLnJlbmRlcldlZWtuYW1lcygpXG5cdFx0XHQpLCBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdHsga2V5OiAnZGF5cycsIGNsYXNzTmFtZTogJ2RheXMtY29udGFpbmVyJyB9LFxuXHRcdFx0XHR0aGlzLnJlbmRlckRheXMoKVxuXHRcdFx0KV0sXG5cdFx0XHR0aGlzLnN0YXRlLm1vZGUgPT09ICdtb250aCcgJiYgW19yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0eyBrZXk6ICd5ZWFycycsIGNsYXNzTmFtZTogJ3llYXJzLWNvbnRhaW5lcicgfSxcblx0XHRcdFx0dGhpcy5yZW5kZXJZZWFycygpXG5cdFx0XHQpLCBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdHsga2V5OiAnbW9udGhzJywgY2xhc3NOYW1lOiAnbW9udGgtbmFtZXMtY29udGFpbmVyJyB9LFxuXHRcdFx0XHR0aGlzLnJlbmRlck1vbnRocygpXG5cdFx0XHQpXVxuXHRcdCk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfVxuXG52YXIgX2JsYWNrbGlzdCA9IHJlcXVpcmUoJ2JsYWNrbGlzdCcpO1xuXG52YXIgX2JsYWNrbGlzdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9ibGFja2xpc3QpO1xuXG52YXIgX2NsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbnZhciBfY2xhc3NuYW1lczIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9jbGFzc25hbWVzKTtcblxudmFyIF9EYXRlUGlja2VyID0gcmVxdWlyZSgnLi9EYXRlUGlja2VyJyk7XG5cbnZhciBfRGF0ZVBpY2tlcjIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9EYXRlUGlja2VyKTtcblxudmFyIF9Qb3B1cCA9IHJlcXVpcmUoJy4vUG9wdXAnKTtcblxudmFyIF9Qb3B1cDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9Qb3B1cCk7XG5cbnZhciBfcmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG52YXIgX3JlYWN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ0RhdGVQaWNrZXJQb3B1cCcsXG5cblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2xhc3NOYW1lOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZyxcblx0XHR2aXNpYmxlOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLmJvb2xcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gKDAsIF9jbGFzc25hbWVzMlsnZGVmYXVsdCddKSgnRGF0ZVBpY2tlcicsIHRoaXMucHJvcHMuY2xhc3NOYW1lKTtcblx0XHR2YXIgcHJvcHMgPSAoMCwgX2JsYWNrbGlzdDJbJ2RlZmF1bHQnXSkodGhpcy5wcm9wcywgJ2NsYXNzTmFtZScsICd2aXNpYmxlJyk7XG5cdFx0cmV0dXJuIF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0X1BvcHVwMlsnZGVmYXVsdCddLFxuXHRcdFx0eyBjbGFzc05hbWU6IGNsYXNzTmFtZSwgdmlzaWJsZTogdGhpcy5wcm9wcy52aXNpYmxlIH0sXG5cdFx0XHRfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChfRGF0ZVBpY2tlcjJbJ2RlZmF1bHQnXSwgcHJvcHMpXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9XG5cbnZhciBfYmxhY2tsaXN0ID0gcmVxdWlyZSgnYmxhY2tsaXN0Jyk7XG5cbnZhciBfYmxhY2tsaXN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2JsYWNrbGlzdCk7XG5cbnZhciBfY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcblxudmFyIF9jbGFzc25hbWVzMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2NsYXNzbmFtZXMpO1xuXG52YXIgX3JlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcblxudmFyIF9yZWFjdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9yZWFjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdGaWVsZENvbnRyb2wnLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRjaGlsZHJlbjogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5ub2RlLmlzUmVxdWlyZWQsXG5cdFx0Y2xhc3NOYW1lOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gKDAsIF9jbGFzc25hbWVzMlsnZGVmYXVsdCddKSgnRmllbGRDb250cm9sJywgdGhpcy5wcm9wcy5jbGFzc05hbWUpO1xuXHRcdHZhciBwcm9wcyA9ICgwLCBfYmxhY2tsaXN0MlsnZGVmYXVsdCddKSh0aGlzLnByb3BzLCAnY2xhc3NOYW1lJyk7XG5cblx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoJ2RpdicsIF9leHRlbmRzKHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSwgcHJvcHMpKTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9XG5cbnZhciBfYmxhY2tsaXN0ID0gcmVxdWlyZSgnYmxhY2tsaXN0Jyk7XG5cbnZhciBfYmxhY2tsaXN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2JsYWNrbGlzdCk7XG5cbnZhciBfY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcblxudmFyIF9jbGFzc25hbWVzMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2NsYXNzbmFtZXMpO1xuXG52YXIgX3JlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcblxudmFyIF9yZWFjdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9yZWFjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdGaWVsZExhYmVsJyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2hpbGRyZW46IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMubm9kZS5pc1JlcXVpcmVkLFxuXHRcdGNsYXNzTmFtZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9ICgwLCBfY2xhc3NuYW1lczJbJ2RlZmF1bHQnXSkoJ0ZpZWxkTGFiZWwnLCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cdFx0dmFyIHByb3BzID0gKDAsIF9ibGFja2xpc3QyWydkZWZhdWx0J10pKHRoaXMucHJvcHMsICdjbGFzc05hbWUnKTtcblxuXHRcdHJldHVybiBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudCgnZGl2JywgX2V4dGVuZHMoeyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9LCBwcm9wcykpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH1cblxudmFyIF9ibGFja2xpc3QgPSByZXF1aXJlKCdibGFja2xpc3QnKTtcblxudmFyIF9ibGFja2xpc3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfYmxhY2tsaXN0KTtcblxudmFyIF9jbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG52YXIgX2NsYXNzbmFtZXMyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfY2xhc3NuYW1lcyk7XG5cbnZhciBfcmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG52YXIgX3JlYWN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ0dyb3VwJyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2hpbGRyZW46IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMubm9kZS5pc1JlcXVpcmVkLFxuXHRcdGNsYXNzTmFtZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0aGFzVG9wR3V0dGVyOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLmJvb2xcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9ICgwLCBfY2xhc3NuYW1lczJbJ2RlZmF1bHQnXSkoJ0dyb3VwJywge1xuXHRcdFx0J0dyb3VwLS1oYXMtZ3V0dGVyLXRvcCc6IHRoaXMucHJvcHMuaGFzVG9wR3V0dGVyXG5cdFx0fSwgdGhpcy5wcm9wcy5jbGFzc05hbWUpO1xuXHRcdHZhciBwcm9wcyA9ICgwLCBfYmxhY2tsaXN0MlsnZGVmYXVsdCddKSh0aGlzLnByb3BzLCAnY2xhc3NOYW1lJyk7XG5cblx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoJ2RpdicsIF9leHRlbmRzKHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSwgcHJvcHMpKTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9XG5cbnZhciBfYmxhY2tsaXN0ID0gcmVxdWlyZSgnYmxhY2tsaXN0Jyk7XG5cbnZhciBfYmxhY2tsaXN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2JsYWNrbGlzdCk7XG5cbnZhciBfY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcblxudmFyIF9jbGFzc25hbWVzMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2NsYXNzbmFtZXMpO1xuXG52YXIgX3JlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcblxudmFyIF9yZWFjdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9yZWFjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdHcm91cEJvZHknLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRjaGlsZHJlbjogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5ub2RlLmlzUmVxdWlyZWQsXG5cdFx0Y2xhc3NOYW1lOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gKDAsIF9jbGFzc25hbWVzMlsnZGVmYXVsdCddKSgnR3JvdXBfX2JvZHknLCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cdFx0dmFyIHByb3BzID0gKDAsIF9ibGFja2xpc3QyWydkZWZhdWx0J10pKHRoaXMucHJvcHMsICdjbGFzc05hbWUnKTtcblxuXHRcdHJldHVybiBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudCgnZGl2JywgX2V4dGVuZHMoeyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9LCBwcm9wcykpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH1cblxudmFyIF9ibGFja2xpc3QgPSByZXF1aXJlKCdibGFja2xpc3QnKTtcblxudmFyIF9ibGFja2xpc3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfYmxhY2tsaXN0KTtcblxudmFyIF9jbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG52YXIgX2NsYXNzbmFtZXMyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfY2xhc3NuYW1lcyk7XG5cbnZhciBfcmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG52YXIgX3JlYWN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ0dyb3VwRm9vdGVyJyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2hpbGRyZW46IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMubm9kZS5pc1JlcXVpcmVkLFxuXHRcdGNsYXNzTmFtZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9ICgwLCBfY2xhc3NuYW1lczJbJ2RlZmF1bHQnXSkoJ0dyb3VwX19mb290ZXInLCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cdFx0dmFyIHByb3BzID0gKDAsIF9ibGFja2xpc3QyWydkZWZhdWx0J10pKHRoaXMucHJvcHMsICdjbGFzc05hbWUnKTtcblxuXHRcdHJldHVybiBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudCgnZGl2JywgX2V4dGVuZHMoeyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9LCBwcm9wcykpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH1cblxudmFyIF9ibGFja2xpc3QgPSByZXF1aXJlKCdibGFja2xpc3QnKTtcblxudmFyIF9ibGFja2xpc3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfYmxhY2tsaXN0KTtcblxudmFyIF9jbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG52YXIgX2NsYXNzbmFtZXMyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfY2xhc3NuYW1lcyk7XG5cbnZhciBfcmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG52YXIgX3JlYWN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ0dyb3VwSGVhZGVyJyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2hpbGRyZW46IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMubm9kZS5pc1JlcXVpcmVkLFxuXHRcdGNsYXNzTmFtZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9ICgwLCBfY2xhc3NuYW1lczJbJ2RlZmF1bHQnXSkoJ0dyb3VwX19oZWFkZXInLCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cdFx0dmFyIHByb3BzID0gKDAsIF9ibGFja2xpc3QyWydkZWZhdWx0J10pKHRoaXMucHJvcHMsICdjbGFzc05hbWUnKTtcblxuXHRcdHJldHVybiBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudCgnZGl2JywgX2V4dGVuZHMoeyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9LCBwcm9wcykpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH1cblxudmFyIF9ibGFja2xpc3QgPSByZXF1aXJlKCdibGFja2xpc3QnKTtcblxudmFyIF9ibGFja2xpc3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfYmxhY2tsaXN0KTtcblxudmFyIF9jbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG52YXIgX2NsYXNzbmFtZXMyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfY2xhc3NuYW1lcyk7XG5cbnZhciBfcmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG52YXIgX3JlYWN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ0dyb3VwSW5uZXInLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRjaGlsZHJlbjogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5ub2RlLmlzUmVxdWlyZWQsXG5cdFx0Y2xhc3NOYW1lOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gKDAsIF9jbGFzc25hbWVzMlsnZGVmYXVsdCddKSgnR3JvdXBfX2lubmVyJywgdGhpcy5wcm9wcy5jbGFzc05hbWUpO1xuXHRcdHZhciBwcm9wcyA9ICgwLCBfYmxhY2tsaXN0MlsnZGVmYXVsdCddKSh0aGlzLnByb3BzLCAnY2xhc3NOYW1lJyk7XG5cblx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoJ2RpdicsIF9leHRlbmRzKHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSwgcHJvcHMpKTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9XG5cbnZhciBfYmxhY2tsaXN0ID0gcmVxdWlyZSgnYmxhY2tsaXN0Jyk7XG5cbnZhciBfYmxhY2tsaXN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2JsYWNrbGlzdCk7XG5cbnZhciBfSXRlbSA9IHJlcXVpcmUoJy4vSXRlbScpO1xuXG52YXIgX0l0ZW0yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfSXRlbSk7XG5cbnZhciBfSXRlbUNvbnRlbnQgPSByZXF1aXJlKCcuL0l0ZW1Db250ZW50Jyk7XG5cbnZhciBfSXRlbUNvbnRlbnQyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfSXRlbUNvbnRlbnQpO1xuXG52YXIgX0l0ZW1Jbm5lciA9IHJlcXVpcmUoJy4vSXRlbUlubmVyJyk7XG5cbnZhciBfSXRlbUlubmVyMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0l0ZW1Jbm5lcik7XG5cbnZhciBfcmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG52YXIgX3JlYWN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0KTtcblxuLy8gTWFueSBpbnB1dCB0eXBlcyBETyBOT1Qgc3VwcG9ydCBzZXRTZWxlY3Rpb25SYW5nZS5cbi8vIEVtYWlsIHdpbGwgc2hvdyBhbiBlcnJvciBvbiBtb3N0IGRlc2t0b3AgYnJvd3NlcnMgYnV0IHdvcmtzIG9uXG4vLyBtb2JpbGUgc2FmYXJpICsgV0tXZWJWaWV3LCB3aGljaCBpcyByZWFsbHkgd2hhdCB3ZSBjYXJlIGFib3V0XG52YXIgU0VMRUNUQUJMRV9JTlBVVF9UWVBFUyA9IHtcblx0J2VtYWlsJzogdHJ1ZSxcblx0J3Bhc3N3b3JkJzogdHJ1ZSxcblx0J3NlYXJjaCc6IHRydWUsXG5cdCd0ZWwnOiB0cnVlLFxuXHQndGV4dCc6IHRydWUsXG5cdCd1cmwnOiB0cnVlXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnSW5wdXQnLFxuXG5cdHByb3BUeXBlczoge1xuXHRcdGF1dG9Gb2N1czogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5ib29sLFxuXHRcdGNsYXNzTmFtZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0Y2hpbGRyZW46IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMubm9kZSxcblx0XHRkaXNhYmxlZDogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5ib29sXG5cdH0sXG5cblx0Y29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uIGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdGlmICh0aGlzLnByb3BzLmF1dG9Gb2N1cykge1xuXHRcdFx0dGhpcy5tb3ZlQ3Vyc29yVG9FbmQoKTtcblx0XHR9XG5cdH0sXG5cblx0bW92ZUN1cnNvclRvRW5kOiBmdW5jdGlvbiBtb3ZlQ3Vyc29yVG9FbmQoKSB7XG5cdFx0dmFyIHRhcmdldCA9IHRoaXMucmVmcy5mb2N1c1RhcmdldC5nZXRET01Ob2RlKCk7XG5cdFx0dmFyIGVuZE9mU3RyaW5nID0gdGFyZ2V0LnZhbHVlLmxlbmd0aDtcblxuXHRcdGlmIChTRUxFQ1RBQkxFX0lOUFVUX1RZUEVTLmhhc093blByb3BlcnR5KHRhcmdldC50eXBlKSkge1xuXHRcdFx0dGFyZ2V0LmZvY3VzKCk7XG5cdFx0XHR0YXJnZXQuc2V0U2VsZWN0aW9uUmFuZ2UoZW5kT2ZTdHJpbmcsIGVuZE9mU3RyaW5nKTtcblx0XHR9XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGlucHV0UHJvcHMgPSAoMCwgX2JsYWNrbGlzdDJbJ2RlZmF1bHQnXSkodGhpcy5wcm9wcywgJ2NoaWxkcmVuJywgJ2NsYXNzTmFtZScpO1xuXG5cdFx0cmV0dXJuIF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0X0l0ZW0yWydkZWZhdWx0J10sXG5cdFx0XHR7IGNsYXNzTmFtZTogdGhpcy5wcm9wcy5jbGFzc05hbWUsIHNlbGVjdGFibGU6IHRoaXMucHJvcHMuZGlzYWJsZWQsIGNvbXBvbmVudDogJ2xhYmVsJyB9LFxuXHRcdFx0X3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdF9JdGVtSW5uZXIyWydkZWZhdWx0J10sXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdF9JdGVtQ29udGVudDJbJ2RlZmF1bHQnXSxcblx0XHRcdFx0XHR7IGNvbXBvbmVudDogJ2xhYmVsJyB9LFxuXHRcdFx0XHRcdF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KCdpbnB1dCcsIF9leHRlbmRzKHsgcmVmOiAnZm9jdXNUYXJnZXQnLCBjbGFzc05hbWU6ICdmaWVsZCcsIHR5cGU6ICd0ZXh0JyB9LCBpbnB1dFByb3BzKSlcblx0XHRcdFx0KSxcblx0XHRcdFx0dGhpcy5wcm9wcy5jaGlsZHJlblxuXHRcdFx0KVxuXHRcdCk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfVxuXG52YXIgX2JsYWNrbGlzdCA9IHJlcXVpcmUoJ2JsYWNrbGlzdCcpO1xuXG52YXIgX2JsYWNrbGlzdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9ibGFja2xpc3QpO1xuXG52YXIgX2NsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbnZhciBfY2xhc3NuYW1lczIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9jbGFzc25hbWVzKTtcblxudmFyIF9yZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG5cbnZhciBfcmVhY3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcmVhY3QpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnSXRlbScsXG5cblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2hpbGRyZW46IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMubm9kZS5pc1JlcXVpcmVkLFxuXHRcdGNvbXBvbmVudDogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5hbnksXG5cdFx0Y2xhc3NOYW1lOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZyxcblx0XHRzaG93RGlzY2xvc3VyZUFycm93OiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLmJvb2xcblx0fSxcblxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0Y29tcG9uZW50OiAnZGl2J1xuXHRcdH07XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNvbXBvbmVudENsYXNzID0gKDAsIF9jbGFzc25hbWVzMlsnZGVmYXVsdCddKSgnSXRlbScsIHtcblx0XHRcdCdJdGVtLS1oYXMtZGlzY2xvc3VyZS1hcnJvdyc6IHRoaXMucHJvcHMuc2hvd0Rpc2Nsb3N1cmVBcnJvd1xuXHRcdH0sIHRoaXMucHJvcHMuY2xhc3NOYW1lKTtcblxuXHRcdHZhciBwcm9wcyA9ICgwLCBfYmxhY2tsaXN0MlsnZGVmYXVsdCddKSh0aGlzLnByb3BzLCAnY2hpbGRyZW4nLCAnY2xhc3NOYW1lJywgJ3Nob3dEaXNjbG9zdXJlQXJyb3cnKTtcblx0XHRwcm9wcy5jbGFzc05hbWUgPSBjb21wb25lbnRDbGFzcztcblxuXHRcdHJldHVybiBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudCh0aGlzLnByb3BzLmNvbXBvbmVudCwgcHJvcHMsIHRoaXMucHJvcHMuY2hpbGRyZW4pO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH1cblxudmFyIF9ibGFja2xpc3QgPSByZXF1aXJlKCdibGFja2xpc3QnKTtcblxudmFyIF9ibGFja2xpc3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfYmxhY2tsaXN0KTtcblxudmFyIF9jbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG52YXIgX2NsYXNzbmFtZXMyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfY2xhc3NuYW1lcyk7XG5cbnZhciBfcmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG52YXIgX3JlYWN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ0l0ZW1Db250ZW50Jyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2hpbGRyZW46IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMubm9kZS5pc1JlcXVpcmVkLFxuXHRcdGNsYXNzTmFtZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9ICgwLCBfY2xhc3NuYW1lczJbJ2RlZmF1bHQnXSkoJ0l0ZW1fX2NvbnRlbnQnLCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cdFx0dmFyIHByb3BzID0gKDAsIF9ibGFja2xpc3QyWydkZWZhdWx0J10pKHRoaXMucHJvcHMsICdjbGFzc05hbWUnKTtcblxuXHRcdHJldHVybiBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudCgnZGl2JywgX2V4dGVuZHMoeyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9LCBwcm9wcykpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH1cblxudmFyIF9jbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG52YXIgX2NsYXNzbmFtZXMyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfY2xhc3NuYW1lcyk7XG5cbnZhciBfcmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG52YXIgX3JlYWN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ0l0ZW1Jbm5lcicsXG5cblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2hpbGRyZW46IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMubm9kZS5pc1JlcXVpcmVkLFxuXHRcdGNsYXNzTmFtZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gKDAsIF9jbGFzc25hbWVzMlsnZGVmYXVsdCddKSgnSXRlbV9faW5uZXInLCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cblx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoJ2RpdicsIF9leHRlbmRzKHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSwgdGhpcy5wcm9wcykpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH1cblxudmFyIF9jbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG52YXIgX2NsYXNzbmFtZXMyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfY2xhc3NuYW1lcyk7XG5cbnZhciBfcmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG52YXIgX3JlYWN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ0l0ZW1NZWRpYScsXG5cdHByb3BUeXBlczoge1xuXHRcdGF2YXRhcjogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0YXZhdGFySW5pdGlhbHM6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGNsYXNzTmFtZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0aWNvbjogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0dGh1bWJuYWlsOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBjbGFzc05hbWUgPSAoMCwgX2NsYXNzbmFtZXMyWydkZWZhdWx0J10pKHtcblx0XHRcdCdJdGVtX19tZWRpYSc6IHRydWUsXG5cdFx0XHQnSXRlbV9fbWVkaWEtLWljb24nOiB0aGlzLnByb3BzLmljb24sXG5cdFx0XHQnSXRlbV9fbWVkaWEtLWF2YXRhcic6IHRoaXMucHJvcHMuYXZhdGFyIHx8IHRoaXMucHJvcHMuYXZhdGFySW5pdGlhbHMsXG5cdFx0XHQnSXRlbV9fbWVkaWEtLXRodW1ibmFpbCc6IHRoaXMucHJvcHMudGh1bWJuYWlsXG5cdFx0fSwgdGhpcy5wcm9wcy5jbGFzc05hbWUpO1xuXG5cdFx0Ly8gbWVkaWEgdHlwZXNcblx0XHR2YXIgaWNvbiA9IHRoaXMucHJvcHMuaWNvbiA/IF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KCdkaXYnLCB7IGNsYXNzTmFtZTogJ0l0ZW1fX21lZGlhX19pY29uICcgKyB0aGlzLnByb3BzLmljb24gfSkgOiBudWxsO1xuXHRcdHZhciBhdmF0YXIgPSB0aGlzLnByb3BzLmF2YXRhciB8fCB0aGlzLnByb3BzLmF2YXRhckluaXRpYWxzID8gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiAnSXRlbV9fbWVkaWFfX2F2YXRhcicgfSxcblx0XHRcdHRoaXMucHJvcHMuYXZhdGFyID8gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoJ2ltZycsIHsgc3JjOiB0aGlzLnByb3BzLmF2YXRhciB9KSA6IHRoaXMucHJvcHMuYXZhdGFySW5pdGlhbHNcblx0XHQpIDogbnVsbDtcblx0XHR2YXIgdGh1bWJuYWlsID0gdGhpcy5wcm9wcy50aHVtYm5haWwgPyBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6ICdJdGVtX19tZWRpYV9fdGh1bWJuYWlsJyB9LFxuXHRcdFx0X3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoJ2ltZycsIHsgc3JjOiB0aGlzLnByb3BzLnRodW1ibmFpbCB9KVxuXHRcdCkgOiBudWxsO1xuXG5cdFx0cmV0dXJuIF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sXG5cdFx0XHRpY29uLFxuXHRcdFx0YXZhdGFyLFxuXHRcdFx0dGh1bWJuYWlsXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9XG5cbnZhciBfY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcblxudmFyIF9jbGFzc25hbWVzMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2NsYXNzbmFtZXMpO1xuXG52YXIgX3JlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcblxudmFyIF9yZWFjdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9yZWFjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdJdGVtTm90ZScsXG5cdHByb3BUeXBlczoge1xuXHRcdGNsYXNzTmFtZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0aWNvbjogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0bGFiZWw6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHR5cGU6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuc3RyaW5nXG5cdH0sXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0eXBlOiAnZGVmYXVsdCdcblx0XHR9O1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gKDAsIF9jbGFzc25hbWVzMlsnZGVmYXVsdCddKSgnSXRlbV9fbm90ZScsICdJdGVtX19ub3RlLS0nICsgdGhpcy5wcm9wcy50eXBlLCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cblx0XHQvLyBlbGVtZW50c1xuXHRcdHZhciBsYWJlbCA9IHRoaXMucHJvcHMubGFiZWwgPyBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6ICdJdGVtX19ub3RlX19sYWJlbCcgfSxcblx0XHRcdHRoaXMucHJvcHMubGFiZWxcblx0XHQpIDogbnVsbDtcblx0XHR2YXIgaWNvbiA9IHRoaXMucHJvcHMuaWNvbiA/IF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KCdkaXYnLCB7IGNsYXNzTmFtZTogJ0l0ZW1fX25vdGVfX2ljb24gJyArIHRoaXMucHJvcHMuaWNvbiB9KSA6IG51bGw7XG5cblx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSxcblx0XHRcdGxhYmVsLFxuXHRcdFx0aWNvblxuXHRcdCk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfVxuXG52YXIgX2JsYWNrbGlzdCA9IHJlcXVpcmUoJ2JsYWNrbGlzdCcpO1xuXG52YXIgX2JsYWNrbGlzdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9ibGFja2xpc3QpO1xuXG52YXIgX2NsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbnZhciBfY2xhc3NuYW1lczIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9jbGFzc25hbWVzKTtcblxudmFyIF9yZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG5cbnZhciBfcmVhY3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcmVhY3QpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnSXRlbVN1YlRpdGxlJyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2hpbGRyZW46IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMubm9kZS5pc1JlcXVpcmVkLFxuXHRcdGNsYXNzTmFtZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9ICgwLCBfY2xhc3NuYW1lczJbJ2RlZmF1bHQnXSkoJ0l0ZW1fX3N1YnRpdGxlJywgdGhpcy5wcm9wcy5jbGFzc05hbWUpO1xuXHRcdHZhciBwcm9wcyA9ICgwLCBfYmxhY2tsaXN0MlsnZGVmYXVsdCddKSh0aGlzLnByb3BzLCAnY2xhc3NOYW1lJyk7XG5cblx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoJ2RpdicsIF9leHRlbmRzKHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSwgcHJvcHMpKTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9XG5cbnZhciBfYmxhY2tsaXN0ID0gcmVxdWlyZSgnYmxhY2tsaXN0Jyk7XG5cbnZhciBfYmxhY2tsaXN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2JsYWNrbGlzdCk7XG5cbnZhciBfY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcblxudmFyIF9jbGFzc25hbWVzMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2NsYXNzbmFtZXMpO1xuXG52YXIgX3JlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcblxudmFyIF9yZWFjdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9yZWFjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdJdGVtVGl0bGUnLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRjaGlsZHJlbjogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5ub2RlLmlzUmVxdWlyZWQsXG5cdFx0Y2xhc3NOYW1lOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gKDAsIF9jbGFzc25hbWVzMlsnZGVmYXVsdCddKSgnSXRlbV9fdGl0bGUnLCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cdFx0dmFyIHByb3BzID0gKDAsIF9ibGFja2xpc3QyWydkZWZhdWx0J10pKHRoaXMucHJvcHMsICdjbGFzc05hbWUnKTtcblxuXHRcdHJldHVybiBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudCgnZGl2JywgX2V4dGVuZHMoeyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9LCBwcm9wcykpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH1cblxudmFyIF9ibGFja2xpc3QgPSByZXF1aXJlKCdibGFja2xpc3QnKTtcblxudmFyIF9ibGFja2xpc3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfYmxhY2tsaXN0KTtcblxudmFyIF9GaWVsZENvbnRyb2wgPSByZXF1aXJlKCcuL0ZpZWxkQ29udHJvbCcpO1xuXG52YXIgX0ZpZWxkQ29udHJvbDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9GaWVsZENvbnRyb2wpO1xuXG52YXIgX0l0ZW0gPSByZXF1aXJlKCcuL0l0ZW0nKTtcblxudmFyIF9JdGVtMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0l0ZW0pO1xuXG52YXIgX0l0ZW1Jbm5lciA9IHJlcXVpcmUoJy4vSXRlbUlubmVyJyk7XG5cbnZhciBfSXRlbUlubmVyMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0l0ZW1Jbm5lcik7XG5cbnZhciBfcmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG52YXIgX3JlYWN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0KTtcblxudmFyIF9yZWFjdFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKTtcblxudmFyIF9yZWFjdFRhcHBhYmxlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0VGFwcGFibGUpO1xuXG4vLyBNYW55IGlucHV0IHR5cGVzIERPIE5PVCBzdXBwb3J0IHNldFNlbGVjdGlvblJhbmdlLlxuLy8gRW1haWwgd2lsbCBzaG93IGFuIGVycm9yIG9uIG1vc3QgZGVza3RvcCBicm93c2VycyBidXQgd29ya3Mgb25cbi8vIG1vYmlsZSBzYWZhcmkgKyBXS1dlYlZpZXcsIHdoaWNoIGlzIHJlYWxseSB3aGF0IHdlIGNhcmUgYWJvdXRcbnZhciBTRUxFQ1RBQkxFX0lOUFVUX1RZUEVTID0ge1xuXHQnZW1haWwnOiB0cnVlLFxuXHQncGFzc3dvcmQnOiB0cnVlLFxuXHQnc2VhcmNoJzogdHJ1ZSxcblx0J3RlbCc6IHRydWUsXG5cdCd0ZXh0JzogdHJ1ZSxcblx0J3VybCc6IHRydWVcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdMYWJlbElucHV0JyxcblxuXHRwcm9wVHlwZXM6IHtcblx0XHRhbGlnblRvcDogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5ib29sLFxuXHRcdGF1dG9Gb2N1czogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5ib29sLFxuXHRcdGNoaWxkcmVuOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLm5vZGUsXG5cdFx0Y2xhc3NOYW1lOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZyxcblx0XHRkaXNhYmxlZDogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5ib29sLFxuXHRcdGxhYmVsOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZyxcblx0XHRyZWFkT25seTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5ib29sLFxuXHRcdHZhbHVlOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXG5cdGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiBjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRpZiAodGhpcy5wcm9wcy5hdXRvRm9jdXMpIHtcblx0XHRcdHRoaXMubW92ZUN1cnNvclRvRW5kKCk7XG5cdFx0fVxuXHR9LFxuXG5cdG1vdmVDdXJzb3JUb0VuZDogZnVuY3Rpb24gbW92ZUN1cnNvclRvRW5kKCkge1xuXHRcdHZhciB0YXJnZXQgPSB0aGlzLnJlZnMuZm9jdXNUYXJnZXQuZ2V0RE9NTm9kZSgpO1xuXHRcdHZhciBlbmRPZlN0cmluZyA9IHRhcmdldC52YWx1ZS5sZW5ndGg7XG5cblx0XHRpZiAoU0VMRUNUQUJMRV9JTlBVVF9UWVBFUy5oYXNPd25Qcm9wZXJ0eSh0YXJnZXQudHlwZSkpIHtcblx0XHRcdHRhcmdldC5mb2N1cygpO1xuXHRcdFx0dGFyZ2V0LnNldFNlbGVjdGlvblJhbmdlKGVuZE9mU3RyaW5nLCBlbmRPZlN0cmluZyk7XG5cdFx0fVxuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBpbnB1dFByb3BzID0gKDAsIF9ibGFja2xpc3QyWydkZWZhdWx0J10pKHRoaXMucHJvcHMsICdhbGlnblRvcCcsICdjaGlsZHJlbicsICdmaXJzdCcsICdyZWFkT25seScpO1xuXHRcdHZhciByZW5kZXJJbnB1dCA9IHRoaXMucHJvcHMucmVhZE9ubHkgPyBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6ICdmaWVsZCB1LXNlbGVjdGFibGUnIH0sXG5cdFx0XHR0aGlzLnByb3BzLnZhbHVlXG5cdFx0KSA6IF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KCdpbnB1dCcsIF9leHRlbmRzKHsgcmVmOiAnZm9jdXNUYXJnZXQnLCBjbGFzc05hbWU6ICdmaWVsZCcsIHR5cGU6ICd0ZXh0JyB9LCBpbnB1dFByb3BzKSk7XG5cblx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRfSXRlbTJbJ2RlZmF1bHQnXSxcblx0XHRcdHsgYWxpZ25Ub3A6IHRoaXMucHJvcHMuYWxpZ25Ub3AsIHNlbGVjdGFibGU6IHRoaXMucHJvcHMuZGlzYWJsZWQsIGNsYXNzTmFtZTogdGhpcy5wcm9wcy5jbGFzc05hbWUsIGNvbXBvbmVudDogJ2xhYmVsJyB9LFxuXHRcdFx0X3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdF9JdGVtSW5uZXIyWydkZWZhdWx0J10sXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdF9yZWFjdFRhcHBhYmxlMlsnZGVmYXVsdCddLFxuXHRcdFx0XHRcdHsgb25UYXA6IHRoaXMubW92ZUN1cnNvclRvRW5kLCBjbGFzc05hbWU6ICdGaWVsZExhYmVsJyB9LFxuXHRcdFx0XHRcdHRoaXMucHJvcHMubGFiZWxcblx0XHRcdFx0KSxcblx0XHRcdFx0X3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0X0ZpZWxkQ29udHJvbDJbJ2RlZmF1bHQnXSxcblx0XHRcdFx0XHRudWxsLFxuXHRcdFx0XHRcdHJlbmRlcklucHV0LFxuXHRcdFx0XHRcdHRoaXMucHJvcHMuY2hpbGRyZW5cblx0XHRcdFx0KVxuXHRcdFx0KVxuXHRcdCk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfVxuXG52YXIgX0ZpZWxkQ29udHJvbCA9IHJlcXVpcmUoJy4vRmllbGRDb250cm9sJyk7XG5cbnZhciBfRmllbGRDb250cm9sMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0ZpZWxkQ29udHJvbCk7XG5cbnZhciBfRmllbGRMYWJlbCA9IHJlcXVpcmUoJy4vRmllbGRMYWJlbCcpO1xuXG52YXIgX0ZpZWxkTGFiZWwyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfRmllbGRMYWJlbCk7XG5cbnZhciBfSXRlbSA9IHJlcXVpcmUoJy4vSXRlbScpO1xuXG52YXIgX0l0ZW0yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfSXRlbSk7XG5cbnZhciBfSXRlbUlubmVyID0gcmVxdWlyZSgnLi9JdGVtSW5uZXInKTtcblxudmFyIF9JdGVtSW5uZXIyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfSXRlbUlubmVyKTtcblxudmFyIF9yZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG5cbnZhciBfcmVhY3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcmVhY3QpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnTGFiZWxTZWxlY3QnLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRjbGFzc05hbWU6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGRpc2FibGVkOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLmJvb2wsXG5cdFx0bGFiZWw6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdG9uQ2hhbmdlOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLmZ1bmMuaXNSZXF1aXJlZCxcblx0XHRvcHRpb25zOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLmFycmF5LmlzUmVxdWlyZWQsXG5cdFx0dmFsdWU6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMub25lT2ZUeXBlKFtfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLm51bWJlciwgX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmddKVxuXHR9LFxuXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRjbGFzc05hbWU6ICcnXG5cdFx0fTtcblx0fSxcblxuXHRyZW5kZXJPcHRpb25zOiBmdW5jdGlvbiByZW5kZXJPcHRpb25zKCkge1xuXHRcdHJldHVybiB0aGlzLnByb3BzLm9wdGlvbnMubWFwKGZ1bmN0aW9uIChvcCkge1xuXHRcdFx0cmV0dXJuIF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHQnb3B0aW9uJyxcblx0XHRcdFx0eyBrZXk6ICdvcHRpb24tJyArIG9wLnZhbHVlLCB2YWx1ZTogb3AudmFsdWUgfSxcblx0XHRcdFx0b3AubGFiZWxcblx0XHRcdCk7XG5cdFx0fSk7XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0cmV0dXJuIF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0X0l0ZW0yWydkZWZhdWx0J10sXG5cdFx0XHR7IGNsYXNzTmFtZTogdGhpcy5wcm9wcy5jbGFzc05hbWUsIGNvbXBvbmVudDogJ2xhYmVsJyB9LFxuXHRcdFx0X3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdF9JdGVtSW5uZXIyWydkZWZhdWx0J10sXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdF9GaWVsZExhYmVsMlsnZGVmYXVsdCddLFxuXHRcdFx0XHRcdG51bGwsXG5cdFx0XHRcdFx0dGhpcy5wcm9wcy5sYWJlbFxuXHRcdFx0XHQpLFxuXHRcdFx0XHRfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHRfRmllbGRDb250cm9sMlsnZGVmYXVsdCddLFxuXHRcdFx0XHRcdG51bGwsXG5cdFx0XHRcdFx0X3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0XHQnc2VsZWN0Jyxcblx0XHRcdFx0XHRcdHsgZGlzYWJsZWQ6IHRoaXMucHJvcHMuZGlzYWJsZWQsIHZhbHVlOiB0aGlzLnByb3BzLnZhbHVlLCBvbkNoYW5nZTogdGhpcy5wcm9wcy5vbkNoYW5nZSwgY2xhc3NOYW1lOiAnc2VsZWN0LWZpZWxkJyB9LFxuXHRcdFx0XHRcdFx0dGhpcy5yZW5kZXJPcHRpb25zKClcblx0XHRcdFx0XHQpLFxuXHRcdFx0XHRcdF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdFx0XHR7IGNsYXNzTmFtZTogJ3NlbGVjdC1maWVsZC1pbmRpY2F0b3InIH0sXG5cdFx0XHRcdFx0XHRfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudCgnZGl2JywgeyBjbGFzc05hbWU6ICdzZWxlY3QtZmllbGQtaW5kaWNhdG9yLWFycm93JyB9KVxuXHRcdFx0XHRcdClcblx0XHRcdFx0KVxuXHRcdFx0KVxuXHRcdCk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfVxuXG52YXIgX2JsYWNrbGlzdCA9IHJlcXVpcmUoJ2JsYWNrbGlzdCcpO1xuXG52YXIgX2JsYWNrbGlzdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9ibGFja2xpc3QpO1xuXG52YXIgX2NsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbnZhciBfY2xhc3NuYW1lczIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9jbGFzc25hbWVzKTtcblxudmFyIF9yZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG5cbnZhciBfcmVhY3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcmVhY3QpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnTGFiZWxUZXh0YXJlYScsXG5cblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2hpbGRyZW46IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMubm9kZSxcblx0XHRjbGFzc05hbWU6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdGRpc2FibGVkOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLmJvb2wsXG5cdFx0Zmlyc3Q6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuYm9vbCxcblx0XHRsYWJlbDogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0cmVhZE9ubHk6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuYm9vbCxcblx0XHR2YWx1ZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cm93czogM1xuXHRcdH07XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9ICgwLCBfY2xhc3NuYW1lczJbJ2RlZmF1bHQnXSkodGhpcy5wcm9wcy5jbGFzc05hbWUsICdsaXN0LWl0ZW0nLCAnZmllbGQtaXRlbScsICdhbGlnbi10b3AnLCB7XG5cdFx0XHQnaXMtZmlyc3QnOiB0aGlzLnByb3BzLmZpcnN0LFxuXHRcdFx0J3Utc2VsZWN0YWJsZSc6IHRoaXMucHJvcHMuZGlzYWJsZWRcblx0XHR9KTtcblxuXHRcdHZhciBwcm9wcyA9ICgwLCBfYmxhY2tsaXN0MlsnZGVmYXVsdCddKSh0aGlzLnByb3BzLCAnY2hpbGRyZW4nLCAnY2xhc3NOYW1lJywgJ2Rpc2FibGVkJywgJ2ZpcnN0JywgJ2xhYmVsJywgJ3JlYWRPbmx5Jyk7XG5cblx0XHR2YXIgcmVuZGVySW5wdXQgPSB0aGlzLnByb3BzLnJlYWRPbmx5ID8gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiAnZmllbGQgdS1zZWxlY3RhYmxlJyB9LFxuXHRcdFx0dGhpcy5wcm9wcy52YWx1ZVxuXHRcdCkgOiBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudCgndGV4dGFyZWEnLCBfZXh0ZW5kcyh7fSwgcHJvcHMsIHsgY2xhc3NOYW1lOiAnZmllbGQnIH0pKTtcblxuXHRcdHJldHVybiBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdCdkaXYnLFxuXHRcdFx0eyBjbGFzc05hbWU6IGNsYXNzTmFtZSB9LFxuXHRcdFx0X3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdCdsYWJlbCcsXG5cdFx0XHRcdHsgY2xhc3NOYW1lOiAnaXRlbS1pbm5lcicgfSxcblx0XHRcdFx0X3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0J2RpdicsXG5cdFx0XHRcdFx0eyBjbGFzc05hbWU6ICdmaWVsZC1sYWJlbCcgfSxcblx0XHRcdFx0XHR0aGlzLnByb3BzLmxhYmVsXG5cdFx0XHRcdCksXG5cdFx0XHRcdF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHRcdHsgY2xhc3NOYW1lOiAnZmllbGQtY29udHJvbCcgfSxcblx0XHRcdFx0XHRyZW5kZXJJbnB1dCxcblx0XHRcdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0XHRcdClcblx0XHRcdClcblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH1cblxudmFyIF9jbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG52YXIgX2NsYXNzbmFtZXMyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfY2xhc3NuYW1lcyk7XG5cbnZhciBfRmllbGRDb250cm9sID0gcmVxdWlyZSgnLi9GaWVsZENvbnRyb2wnKTtcblxudmFyIF9GaWVsZENvbnRyb2wyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfRmllbGRDb250cm9sKTtcblxudmFyIF9JdGVtID0gcmVxdWlyZSgnLi9JdGVtJyk7XG5cbnZhciBfSXRlbTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9JdGVtKTtcblxudmFyIF9JdGVtSW5uZXIgPSByZXF1aXJlKCcuL0l0ZW1Jbm5lcicpO1xuXG52YXIgX0l0ZW1Jbm5lcjIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9JdGVtSW5uZXIpO1xuXG52YXIgX3JlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcblxudmFyIF9yZWFjdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9yZWFjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdMYWJlbFZhbHVlJyxcblxuXHRwcm9wVHlwZXM6IHtcblx0XHRhbGlnblRvcDogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5ib29sLFxuXHRcdGNsYXNzTmFtZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0bGFiZWw6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHBsYWNlaG9sZGVyOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZyxcblx0XHR2YWx1ZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRfSXRlbTJbJ2RlZmF1bHQnXSxcblx0XHRcdHsgYWxpZ25Ub3A6IHRoaXMucHJvcHMuYWxpZ25Ub3AsIGNsYXNzTmFtZTogdGhpcy5wcm9wcy5jbGFzc05hbWUsIGNvbXBvbmVudDogJ2xhYmVsJyB9LFxuXHRcdFx0X3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdF9JdGVtSW5uZXIyWydkZWZhdWx0J10sXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHRcdHsgY2xhc3NOYW1lOiAnRmllbGRMYWJlbCcgfSxcblx0XHRcdFx0XHR0aGlzLnByb3BzLmxhYmVsXG5cdFx0XHRcdCksXG5cdFx0XHRcdF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdF9GaWVsZENvbnRyb2wyWydkZWZhdWx0J10sXG5cdFx0XHRcdFx0bnVsbCxcblx0XHRcdFx0XHRfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHRcdFx0eyBjbGFzc05hbWU6ICgwLCBfY2xhc3NuYW1lczJbJ2RlZmF1bHQnXSkoJ2ZpZWxkJywgdGhpcy5wcm9wcy52YWx1ZSA/ICd1LXNlbGVjdGFibGUnIDogJ2ZpZWxkLXBsYWNlaG9sZGVyJykgfSxcblx0XHRcdFx0XHRcdHRoaXMucHJvcHMudmFsdWUgfHwgdGhpcy5wcm9wcy5wbGFjZWhvbGRlclxuXHRcdFx0XHRcdClcblx0XHRcdFx0KVxuXHRcdFx0KVxuXHRcdCk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfVxuXG52YXIgX2JsYWNrbGlzdCA9IHJlcXVpcmUoJ2JsYWNrbGlzdCcpO1xuXG52YXIgX2JsYWNrbGlzdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9ibGFja2xpc3QpO1xuXG52YXIgX2NsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbnZhciBfY2xhc3NuYW1lczIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9jbGFzc25hbWVzKTtcblxudmFyIF9yZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG5cbnZhciBfcmVhY3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcmVhY3QpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnTGlzdEhlYWRlcicsXG5cblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2xhc3NOYW1lOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZyxcblx0XHRzdGlja3k6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuYm9vbFxuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBjbGFzc05hbWUgPSAoMCwgX2NsYXNzbmFtZXMyWydkZWZhdWx0J10pKCdsaXN0LWhlYWRlcicsIHtcblx0XHRcdCdzdGlja3knOiB0aGlzLnByb3BzLnN0aWNreVxuXHRcdH0sIHRoaXMucHJvcHMuY2xhc3NOYW1lKTtcblxuXHRcdHZhciBwcm9wcyA9ICgwLCBfYmxhY2tsaXN0MlsnZGVmYXVsdCddKSh0aGlzLnByb3BzLCAnc3RpY2t5Jyk7XG5cblx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoJ2RpdicsIF9leHRlbmRzKHsgY2xhc3NOYW1lOiBjbGFzc05hbWUgfSwgcHJvcHMpKTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7XG5cdHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfVxuXG52YXIgX2NsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbnZhciBfY2xhc3NuYW1lczIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9jbGFzc25hbWVzKTtcblxudmFyIF9yZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG5cbnZhciBfcmVhY3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcmVhY3QpO1xuXG52YXIgX3JlYWN0QWRkb25zQ3NzVHJhbnNpdGlvbkdyb3VwID0gcmVxdWlyZSgncmVhY3QtYWRkb25zLWNzcy10cmFuc2l0aW9uLWdyb3VwJyk7XG5cbnZhciBfcmVhY3RBZGRvbnNDc3NUcmFuc2l0aW9uR3JvdXAyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcmVhY3RBZGRvbnNDc3NUcmFuc2l0aW9uR3JvdXApO1xuXG52YXIgX3JlYWN0VGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpO1xuXG52YXIgX3JlYWN0VGFwcGFibGUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcmVhY3RUYXBwYWJsZSk7XG5cbnZhciBESVJFQ1RJT05TID0ge1xuXHQncmV2ZWFsLWZyb20tcmlnaHQnOiAtMSxcblx0J3Nob3ctZnJvbS1sZWZ0JzogLTEsXG5cdCdzaG93LWZyb20tcmlnaHQnOiAxLFxuXHQncmV2ZWFsLWZyb20tbGVmdCc6IDFcbn07XG5cbnZhciBkZWZhdWx0Q29udHJvbGxlclN0YXRlID0ge1xuXHRkaXJlY3Rpb246IDAsXG5cdGZhZGU6IGZhbHNlLFxuXHRsZWZ0QXJyb3c6IGZhbHNlLFxuXHRsZWZ0QnV0dG9uRGlzYWJsZWQ6IGZhbHNlLFxuXHRsZWZ0SWNvbjogJycsXG5cdGxlZnRMYWJlbDogJycsXG5cdGxlZnRBY3Rpb246IG51bGwsXG5cdHJpZ2h0QXJyb3c6IGZhbHNlLFxuXHRyaWdodEJ1dHRvbkRpc2FibGVkOiBmYWxzZSxcblx0cmlnaHRJY29uOiAnJyxcblx0cmlnaHRMYWJlbDogJycsXG5cdHJpZ2h0QWN0aW9uOiBudWxsLFxuXHR0aXRsZTogJydcbn07XG5cbmZ1bmN0aW9uIG5ld1N0YXRlKGZyb20pIHtcblx0dmFyIG5zID0gX2V4dGVuZHMoe30sIGRlZmF1bHRDb250cm9sbGVyU3RhdGUpO1xuXHRpZiAoZnJvbSkgX2V4dGVuZHMobnMsIGZyb20pO1xuXHRkZWxldGUgbnMubmFtZTsgLy8gbWF5IGxlYWsgZnJvbSBwcm9wc1xuXHRyZXR1cm4gbnM7XG59XG5cbnZhciBOYXZpZ2F0aW9uQmFyID0gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdOYXZpZ2F0aW9uQmFyJyxcblxuXHRjb250ZXh0VHlwZXM6IHtcblx0XHRhcHA6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMub2JqZWN0XG5cdH0sXG5cblx0cHJvcFR5cGVzOiB7XG5cdFx0bmFtZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0Y2xhc3NOYW1lOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXG5cdGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gZ2V0SW5pdGlhbFN0YXRlKCkge1xuXHRcdHJldHVybiBuZXdTdGF0ZSh0aGlzLnByb3BzKTtcblx0fSxcblxuXHRjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gY29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0aWYgKHRoaXMucHJvcHMubmFtZSkge1xuXHRcdFx0dGhpcy5jb250ZXh0LmFwcC5uYXZpZ2F0aW9uQmFyc1t0aGlzLnByb3BzLm5hbWVdID0gdGhpcztcblx0XHR9XG5cdH0sXG5cblx0Y29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uIGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdGlmICh0aGlzLnByb3BzLm5hbWUpIHtcblx0XHRcdGRlbGV0ZSB0aGlzLmNvbnRleHQuYXBwLm5hdmlnYXRpb25CYXJzW3RoaXMucHJvcHMubmFtZV07XG5cdFx0fVxuXHR9LFxuXG5cdGNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHM6IGZ1bmN0aW9uIGNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMobmV4dFByb3BzKSB7XG5cdFx0dGhpcy5zZXRTdGF0ZShuZXdTdGF0ZShuZXh0UHJvcHMpKTtcblx0XHRpZiAobmV4dFByb3BzLm5hbWUgIT09IHRoaXMucHJvcHMubmFtZSkge1xuXHRcdFx0aWYgKG5leHRQcm9wcy5uYW1lKSB7XG5cdFx0XHRcdHRoaXMuY29udGV4dC5hcHAubmF2aWdhdGlvbkJhcnNbbmV4dFByb3BzLm5hbWVdID0gdGhpcztcblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLnByb3BzLm5hbWUpIHtcblx0XHRcdFx0ZGVsZXRlIHRoaXMuY29udGV4dC5hcHAubmF2aWdhdGlvbkJhcnNbdGhpcy5wcm9wcy5uYW1lXTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0dXBkYXRlOiBmdW5jdGlvbiB1cGRhdGUoc3RhdGUpIHtcblx0XHQvLyBGSVhNRTogd2hhdCBpcyBoYXBwZW5pbmcgaGVyZVxuXHRcdHN0YXRlID0gbmV3U3RhdGUoc3RhdGUpO1xuXHRcdHRoaXMuc2V0U3RhdGUobmV3U3RhdGUoc3RhdGUpKTtcblx0fSxcblxuXHR1cGRhdGVXaXRoVHJhbnNpdGlvbjogZnVuY3Rpb24gdXBkYXRlV2l0aFRyYW5zaXRpb24oc3RhdGUsIHRyYW5zaXRpb24pIHtcblx0XHRzdGF0ZSA9IG5ld1N0YXRlKHN0YXRlKTtcblx0XHRzdGF0ZS5kaXJlY3Rpb24gPSBESVJFQ1RJT05TW3RyYW5zaXRpb25dIHx8IDA7XG5cblx0XHRpZiAodHJhbnNpdGlvbiA9PT0gJ2ZhZGUnIHx8IHRyYW5zaXRpb24gPT09ICdmYWRlLWNvbnRyYWN0JyB8fCB0cmFuc2l0aW9uID09PSAnZmFkZS1leHBhbmQnKSB7XG5cdFx0XHRzdGF0ZS5mYWRlID0gdHJ1ZTtcblx0XHR9XG5cblx0XHR0aGlzLnNldFN0YXRlKHN0YXRlKTtcblx0fSxcblxuXHRyZW5kZXJMZWZ0QnV0dG9uOiBmdW5jdGlvbiByZW5kZXJMZWZ0QnV0dG9uKCkge1xuXHRcdHZhciBjbGFzc05hbWUgPSAoMCwgX2NsYXNzbmFtZXMyWydkZWZhdWx0J10pKCdOYXZpZ2F0aW9uQmFyTGVmdEJ1dHRvbicsIHtcblx0XHRcdCdoYXMtYXJyb3cnOiB0aGlzLnN0YXRlLmxlZnRBcnJvd1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0X3JlYWN0VGFwcGFibGUyWydkZWZhdWx0J10sXG5cdFx0XHR7IG9uVGFwOiB0aGlzLnN0YXRlLmxlZnRBY3Rpb24sIGNsYXNzTmFtZTogY2xhc3NOYW1lLCBkaXNhYmxlZDogdGhpcy5zdGF0ZS5sZWZ0QnV0dG9uRGlzYWJsZWQsIGNvbXBvbmVudDogJ2J1dHRvbicgfSxcblx0XHRcdHRoaXMucmVuZGVyTGVmdEFycm93KCksXG5cdFx0XHR0aGlzLnJlbmRlckxlZnRMYWJlbCgpXG5cdFx0KTtcblx0fSxcblxuXHRyZW5kZXJMZWZ0QXJyb3c6IGZ1bmN0aW9uIHJlbmRlckxlZnRBcnJvdygpIHtcblx0XHR2YXIgdHJhbnNpdGlvbk5hbWUgPSAnTmF2aWdhdGlvbkJhclRyYW5zaXRpb24tSW5zdGFudCc7XG5cdFx0aWYgKHRoaXMuc3RhdGUuZmFkZSB8fCB0aGlzLnN0YXRlLmRpcmVjdGlvbikge1xuXHRcdFx0dHJhbnNpdGlvbk5hbWUgPSAnTmF2aWdhdGlvbkJhclRyYW5zaXRpb24tRmFkZSc7XG5cdFx0fVxuXHRcdHZhciB0cmFuc2l0aW9uRHVyYXRpb24gPSB0cmFuc2l0aW9uTmFtZSA9PT0gJ05hdmlnYXRpb25CYXJUcmFuc2l0aW9uLUluc3RhbnQnID8gNTAgOiA1MDA7XG5cblx0XHR2YXIgYXJyb3cgPSB0aGlzLnN0YXRlLmxlZnRBcnJvdyA/IF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KCdzcGFuJywgeyBjbGFzc05hbWU6ICdOYXZpZ2F0aW9uQmFyTGVmdEFycm93JyB9KSA6IG51bGw7XG5cblx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRfcmVhY3RBZGRvbnNDc3NUcmFuc2l0aW9uR3JvdXAyWydkZWZhdWx0J10sXG5cdFx0XHR7IHRyYW5zaXRpb25OYW1lOiB0cmFuc2l0aW9uTmFtZSwgdHJhbnNpdGlvbkVudGVyVGltZW91dDogdHJhbnNpdGlvbkR1cmF0aW9uLCB0cmFuc2l0aW9uTGVhdmVUaW1lb3V0OiB0cmFuc2l0aW9uRHVyYXRpb24gfSxcblx0XHRcdGFycm93XG5cdFx0KTtcblx0fSxcblxuXHRyZW5kZXJMZWZ0TGFiZWw6IGZ1bmN0aW9uIHJlbmRlckxlZnRMYWJlbCgpIHtcblx0XHR2YXIgdHJhbnNpdGlvbk5hbWUgPSAnTmF2aWdhdGlvbkJhclRyYW5zaXRpb24tSW5zdGFudCc7XG5cdFx0aWYgKHRoaXMuc3RhdGUuZmFkZSkge1xuXHRcdFx0dHJhbnNpdGlvbk5hbWUgPSAnTmF2aWdhdGlvbkJhclRyYW5zaXRpb24tRmFkZSc7XG5cdFx0fSBlbHNlIGlmICh0aGlzLnN0YXRlLmRpcmVjdGlvbiA+IDApIHtcblx0XHRcdHRyYW5zaXRpb25OYW1lID0gJ05hdmlnYXRpb25CYXJUcmFuc2l0aW9uLUZvcndhcmRzJztcblx0XHR9IGVsc2UgaWYgKHRoaXMuc3RhdGUuZGlyZWN0aW9uIDwgMCkge1xuXHRcdFx0dHJhbnNpdGlvbk5hbWUgPSAnTmF2aWdhdGlvbkJhclRyYW5zaXRpb24tQmFja3dhcmRzJztcblx0XHR9XG5cdFx0dmFyIHRyYW5zaXRpb25EdXJhdGlvbiA9IHRyYW5zaXRpb25OYW1lID09PSAnTmF2aWdhdGlvbkJhclRyYW5zaXRpb24tSW5zdGFudCcgPyA1MCA6IDUwMDtcblxuXHRcdHJldHVybiBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdF9yZWFjdEFkZG9uc0Nzc1RyYW5zaXRpb25Hcm91cDJbJ2RlZmF1bHQnXSxcblx0XHRcdHsgdHJhbnNpdGlvbk5hbWU6IHRyYW5zaXRpb25OYW1lLCB0cmFuc2l0aW9uRW50ZXJUaW1lb3V0OiB0cmFuc2l0aW9uRHVyYXRpb24sIHRyYW5zaXRpb25MZWF2ZVRpbWVvdXQ6IHRyYW5zaXRpb25EdXJhdGlvbiB9LFxuXHRcdFx0X3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdCdzcGFuJyxcblx0XHRcdFx0eyBrZXk6IERhdGUubm93KCksIGNsYXNzTmFtZTogJ05hdmlnYXRpb25CYXJMZWZ0TGFiZWwnIH0sXG5cdFx0XHRcdHRoaXMuc3RhdGUubGVmdExhYmVsXG5cdFx0XHQpXG5cdFx0KTtcblx0fSxcblxuXHRyZW5kZXJUaXRsZTogZnVuY3Rpb24gcmVuZGVyVGl0bGUoKSB7XG5cdFx0dmFyIHRpdGxlID0gdGhpcy5zdGF0ZS50aXRsZSA/IF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J3NwYW4nLFxuXHRcdFx0eyBrZXk6IERhdGUubm93KCksIGNsYXNzTmFtZTogJ05hdmlnYXRpb25CYXJUaXRsZScgfSxcblx0XHRcdHRoaXMuc3RhdGUudGl0bGVcblx0XHQpIDogbnVsbDtcblx0XHR2YXIgdHJhbnNpdGlvbk5hbWUgPSAnTmF2aWdhdGlvbkJhclRyYW5zaXRpb24tSW5zdGFudCc7XG5cdFx0aWYgKHRoaXMuc3RhdGUuZmFkZSkge1xuXHRcdFx0dHJhbnNpdGlvbk5hbWUgPSAnTmF2aWdhdGlvbkJhclRyYW5zaXRpb24tRmFkZSc7XG5cdFx0fSBlbHNlIGlmICh0aGlzLnN0YXRlLmRpcmVjdGlvbiA+IDApIHtcblx0XHRcdHRyYW5zaXRpb25OYW1lID0gJ05hdmlnYXRpb25CYXJUcmFuc2l0aW9uLUZvcndhcmRzJztcblx0XHR9IGVsc2UgaWYgKHRoaXMuc3RhdGUuZGlyZWN0aW9uIDwgMCkge1xuXHRcdFx0dHJhbnNpdGlvbk5hbWUgPSAnTmF2aWdhdGlvbkJhclRyYW5zaXRpb24tQmFja3dhcmRzJztcblx0XHR9XG5cdFx0dmFyIHRyYW5zaXRpb25EdXJhdGlvbiA9IHRyYW5zaXRpb25OYW1lID09PSAnTmF2aWdhdGlvbkJhclRyYW5zaXRpb24tSW5zdGFudCcgPyA1MCA6IDUwMDtcblxuXHRcdHJldHVybiBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdF9yZWFjdEFkZG9uc0Nzc1RyYW5zaXRpb25Hcm91cDJbJ2RlZmF1bHQnXSxcblx0XHRcdHsgdHJhbnNpdGlvbk5hbWU6IHRyYW5zaXRpb25OYW1lLCB0cmFuc2l0aW9uRW50ZXJUaW1lb3V0OiB0cmFuc2l0aW9uRHVyYXRpb24sIHRyYW5zaXRpb25MZWF2ZVRpbWVvdXQ6IHRyYW5zaXRpb25EdXJhdGlvbiB9LFxuXHRcdFx0dGl0bGVcblx0XHQpO1xuXHR9LFxuXG5cdHJlbmRlclJpZ2h0QnV0dG9uOiBmdW5jdGlvbiByZW5kZXJSaWdodEJ1dHRvbigpIHtcblx0XHR2YXIgdHJhbnNpdGlvbk5hbWUgPSAnTmF2aWdhdGlvbkJhclRyYW5zaXRpb24tSW5zdGFudCc7XG5cdFx0aWYgKHRoaXMuc3RhdGUuZmFkZSB8fCB0aGlzLnN0YXRlLmRpcmVjdGlvbikge1xuXHRcdFx0dHJhbnNpdGlvbk5hbWUgPSAnTmF2aWdhdGlvbkJhclRyYW5zaXRpb24tRmFkZSc7XG5cdFx0fVxuXHRcdHZhciB0cmFuc2l0aW9uRHVyYXRpb24gPSB0cmFuc2l0aW9uTmFtZSA9PT0gJ05hdmlnYXRpb25CYXJUcmFuc2l0aW9uLUluc3RhbnQnID8gNTAgOiA1MDA7XG5cblx0XHR2YXIgYnV0dG9uID0gdGhpcy5zdGF0ZS5yaWdodEljb24gfHwgdGhpcy5zdGF0ZS5yaWdodExhYmVsID8gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRfcmVhY3RUYXBwYWJsZTJbJ2RlZmF1bHQnXSxcblx0XHRcdHsga2V5OiBEYXRlLm5vdygpLCBvblRhcDogdGhpcy5zdGF0ZS5yaWdodEFjdGlvbiwgY2xhc3NOYW1lOiAnTmF2aWdhdGlvbkJhclJpZ2h0QnV0dG9uJywgZGlzYWJsZWQ6IHRoaXMuc3RhdGUucmlnaHRCdXR0b25EaXNhYmxlZCwgY29tcG9uZW50OiAnYnV0dG9uJyB9LFxuXHRcdFx0dGhpcy5yZW5kZXJSaWdodExhYmVsKCksXG5cdFx0XHR0aGlzLnJlbmRlclJpZ2h0SWNvbigpXG5cdFx0KSA6IG51bGw7XG5cdFx0cmV0dXJuIF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0X3JlYWN0QWRkb25zQ3NzVHJhbnNpdGlvbkdyb3VwMlsnZGVmYXVsdCddLFxuXHRcdFx0eyB0cmFuc2l0aW9uTmFtZTogdHJhbnNpdGlvbk5hbWUsIHRyYW5zaXRpb25FbnRlclRpbWVvdXQ6IHRyYW5zaXRpb25EdXJhdGlvbiwgdHJhbnNpdGlvbkxlYXZlVGltZW91dDogdHJhbnNpdGlvbkR1cmF0aW9uIH0sXG5cdFx0XHRidXR0b25cblx0XHQpO1xuXHR9LFxuXG5cdHJlbmRlclJpZ2h0SWNvbjogZnVuY3Rpb24gcmVuZGVyUmlnaHRJY29uKCkge1xuXHRcdGlmICghdGhpcy5zdGF0ZS5yaWdodEljb24pIHJldHVybiBudWxsO1xuXG5cdFx0dmFyIGNsYXNzTmFtZSA9ICgwLCBfY2xhc3NuYW1lczJbJ2RlZmF1bHQnXSkoJ05hdmlnYXRpb25CYXJSaWdodEljb24nLCB0aGlzLnN0YXRlLnJpZ2h0SWNvbik7XG5cblx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoJ3NwYW4nLCB7IGNsYXNzTmFtZTogY2xhc3NOYW1lIH0pO1xuXHR9LFxuXG5cdHJlbmRlclJpZ2h0TGFiZWw6IGZ1bmN0aW9uIHJlbmRlclJpZ2h0TGFiZWwoKSB7XG5cdFx0cmV0dXJuIHRoaXMuc3RhdGUucmlnaHRMYWJlbCA/IF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J3NwYW4nLFxuXHRcdFx0eyBrZXk6IERhdGUubm93KCksIGNsYXNzTmFtZTogJ05hdmlnYXRpb25CYXJSaWdodExhYmVsJyB9LFxuXHRcdFx0dGhpcy5zdGF0ZS5yaWdodExhYmVsXG5cdFx0KSA6IG51bGw7XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0cmV0dXJuIF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogKDAsIF9jbGFzc25hbWVzMlsnZGVmYXVsdCddKSgnTmF2aWdhdGlvbkJhcicsIHRoaXMucHJvcHMuY2xhc3NOYW1lKSB9LFxuXHRcdFx0dGhpcy5yZW5kZXJMZWZ0QnV0dG9uKCksXG5cdFx0XHR0aGlzLnJlbmRlclRpdGxlKCksXG5cdFx0XHR0aGlzLnJlbmRlclJpZ2h0QnV0dG9uKClcblx0XHQpO1xuXHR9XG59KTtcblxuZXhwb3J0c1snZGVmYXVsdCddID0gTmF2aWdhdGlvbkJhcjtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1snZGVmYXVsdCddOyIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfVxuXG52YXIgX2NsYXNzbmFtZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG5cbnZhciBfY2xhc3NuYW1lczIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9jbGFzc25hbWVzKTtcblxudmFyIF9yZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG5cbnZhciBfcmVhY3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcmVhY3QpO1xuXG52YXIgX3JlYWN0QWRkb25zQ3NzVHJhbnNpdGlvbkdyb3VwID0gcmVxdWlyZSgncmVhY3QtYWRkb25zLWNzcy10cmFuc2l0aW9uLWdyb3VwJyk7XG5cbnZhciBfcmVhY3RBZGRvbnNDc3NUcmFuc2l0aW9uR3JvdXAyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcmVhY3RBZGRvbnNDc3NUcmFuc2l0aW9uR3JvdXApO1xuXG5tb2R1bGUuZXhwb3J0cyA9IF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnUG9wdXAnLFxuXG5cdHByb3BUeXBlczoge1xuXHRcdGNoaWxkcmVuOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLm5vZGUsXG5cdFx0Y2xhc3NOYW1lOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZyxcblx0XHR2aXNpYmxlOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLmJvb2xcblx0fSxcblxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dHJhbnNpdGlvbjogJ25vbmUnXG5cdFx0fTtcblx0fSxcblxuXHRyZW5kZXJCYWNrZHJvcDogZnVuY3Rpb24gcmVuZGVyQmFja2Ryb3AoKSB7XG5cdFx0aWYgKCF0aGlzLnByb3BzLnZpc2libGUpIHJldHVybiBudWxsO1xuXHRcdHJldHVybiBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudCgnZGl2JywgeyBjbGFzc05hbWU6ICdQb3B1cC1iYWNrZHJvcCcgfSk7XG5cdH0sXG5cblx0cmVuZGVyRGlhbG9nOiBmdW5jdGlvbiByZW5kZXJEaWFsb2coKSB7XG5cdFx0aWYgKCF0aGlzLnByb3BzLnZpc2libGUpIHJldHVybiBudWxsO1xuXG5cdFx0Ly8gU2V0IGNsYXNzbmFtZXNcblx0XHR2YXIgZGlhbG9nQ2xhc3NOYW1lID0gKDAsIF9jbGFzc25hbWVzMlsnZGVmYXVsdCddKSgnUG9wdXAtZGlhbG9nJywgdGhpcy5wcm9wcy5jbGFzc05hbWUpO1xuXG5cdFx0cmV0dXJuIF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogZGlhbG9nQ2xhc3NOYW1lIH0sXG5cdFx0XHR0aGlzLnByb3BzLmNoaWxkcmVuXG5cdFx0KTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdHsgY2xhc3NOYW1lOiAnUG9wdXAnIH0sXG5cdFx0XHRfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdFx0X3JlYWN0QWRkb25zQ3NzVHJhbnNpdGlvbkdyb3VwMlsnZGVmYXVsdCddLFxuXHRcdFx0XHR7IHRyYW5zaXRpb25OYW1lOiAnUG9wdXAtZGlhbG9nJywgdHJhbnNpdGlvbkVudGVyVGltZW91dDogMzAwLCB0cmFuc2l0aW9uTGVhdmVUaW1lb3V0OiAzMDAsIGNvbXBvbmVudDogJ2RpdicgfSxcblx0XHRcdFx0dGhpcy5yZW5kZXJEaWFsb2coKVxuXHRcdFx0KSxcblx0XHRcdF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRfcmVhY3RBZGRvbnNDc3NUcmFuc2l0aW9uR3JvdXAyWydkZWZhdWx0J10sXG5cdFx0XHRcdHsgdHJhbnNpdGlvbk5hbWU6ICdQb3B1cC1iYWNrZ3JvdW5kJywgdHJhbnNpdGlvbkVudGVyVGltZW91dDogMzAwLCB0cmFuc2l0aW9uTGVhdmVUaW1lb3V0OiAzMDAsIGNvbXBvbmVudDogJ2RpdicgfSxcblx0XHRcdFx0dGhpcy5yZW5kZXJCYWNrZHJvcCgpXG5cdFx0XHQpXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9XG5cbnZhciBfY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcblxudmFyIF9jbGFzc25hbWVzMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2NsYXNzbmFtZXMpO1xuXG52YXIgX3JlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcblxudmFyIF9yZWFjdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9yZWFjdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdQb3B1cEljb24nLFxuXHRwcm9wVHlwZXM6IHtcblx0XHRuYW1lOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZyxcblx0XHR0eXBlOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLm9uZU9mKFsnZGVmYXVsdCcsICdtdXRlZCcsICdwcmltYXJ5JywgJ3N1Y2Nlc3MnLCAnd2FybmluZycsICdkYW5nZXInXSksXG5cdFx0c3Bpbm5pbmc6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuYm9vbFxuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBjbGFzc05hbWUgPSAoMCwgX2NsYXNzbmFtZXMyWydkZWZhdWx0J10pKCdQb3B1cEljb24nLCB7XG5cdFx0XHQnaXMtc3Bpbm5pbmcnOiB0aGlzLnByb3BzLnNwaW5uaW5nXG5cdFx0fSwgdGhpcy5wcm9wcy5uYW1lLCB0aGlzLnByb3BzLnR5cGUpO1xuXG5cdFx0cmV0dXJuIF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KCdkaXYnLCB7IGNsYXNzTmFtZTogY2xhc3NOYW1lIH0pO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH1cblxudmFyIF9jbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG52YXIgX2NsYXNzbmFtZXMyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfY2xhc3NuYW1lcyk7XG5cbnZhciBfSXRlbSA9IHJlcXVpcmUoJy4vSXRlbScpO1xuXG52YXIgX0l0ZW0yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfSXRlbSk7XG5cbnZhciBfSXRlbUlubmVyID0gcmVxdWlyZSgnLi9JdGVtSW5uZXInKTtcblxudmFyIF9JdGVtSW5uZXIyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfSXRlbUlubmVyKTtcblxudmFyIF9JdGVtTm90ZSA9IHJlcXVpcmUoJy4vSXRlbU5vdGUnKTtcblxudmFyIF9JdGVtTm90ZTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9JdGVtTm90ZSk7XG5cbnZhciBfSXRlbVRpdGxlID0gcmVxdWlyZSgnLi9JdGVtVGl0bGUnKTtcblxudmFyIF9JdGVtVGl0bGUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfSXRlbVRpdGxlKTtcblxudmFyIF9yZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG5cbnZhciBfcmVhY3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcmVhY3QpO1xuXG52YXIgX3JlYWN0VGFwcGFibGUgPSByZXF1aXJlKCdyZWFjdC10YXBwYWJsZScpO1xuXG52YXIgX3JlYWN0VGFwcGFibGUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcmVhY3RUYXBwYWJsZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdSYWRpb0xpc3QnLFxuXG5cdHByb3BUeXBlczoge1xuXHRcdG9wdGlvbnM6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuYXJyYXkuaXNSZXF1aXJlZCxcblx0XHR2YWx1ZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5vbmVPZlR5cGUoW19yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuc3RyaW5nLCBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLm51bWJlcl0pLFxuXHRcdGljb246IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdG9uQ2hhbmdlOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLmZ1bmNcblx0fSxcblxuXHRvbkNoYW5nZTogZnVuY3Rpb24gb25DaGFuZ2UodmFsdWUpIHtcblx0XHR0aGlzLnByb3BzLm9uQ2hhbmdlKHZhbHVlKTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dmFyIG9wdGlvbnMgPSB0aGlzLnByb3BzLm9wdGlvbnMubWFwKGZ1bmN0aW9uIChvcCwgaSkge1xuXHRcdFx0dmFyIGljb25DbGFzc25hbWUgPSAoMCwgX2NsYXNzbmFtZXMyWydkZWZhdWx0J10pKCdpdGVtLWljb24gcHJpbWFyeScsIG9wLmljb24pO1xuXHRcdFx0dmFyIGNoZWNrTWFyayA9IG9wLnZhbHVlID09PSBzZWxmLnByb3BzLnZhbHVlID8gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoX0l0ZW1Ob3RlMlsnZGVmYXVsdCddLCB7IHR5cGU6ICdwcmltYXJ5JywgaWNvbjogJ2lvbi1jaGVja21hcmsnIH0pIDogbnVsbDtcblx0XHRcdHZhciBpY29uID0gb3AuaWNvbiA/IF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHQnZGl2Jyxcblx0XHRcdFx0eyBjbGFzc05hbWU6ICdpdGVtLW1lZGlhJyB9LFxuXHRcdFx0XHRfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudCgnc3BhbicsIHsgY2xhc3NOYW1lOiBpY29uQ2xhc3NuYW1lIH0pXG5cdFx0XHQpIDogbnVsbDtcblxuXHRcdFx0ZnVuY3Rpb24gb25DaGFuZ2UoKSB7XG5cdFx0XHRcdHNlbGYub25DaGFuZ2Uob3AudmFsdWUpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdF9yZWFjdFRhcHBhYmxlMlsnZGVmYXVsdCddLFxuXHRcdFx0XHR7IGtleTogJ29wdGlvbi0nICsgaSwgb25UYXA6IG9uQ2hhbmdlIH0sXG5cdFx0XHRcdF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdF9JdGVtMlsnZGVmYXVsdCddLFxuXHRcdFx0XHRcdHsga2V5OiAnb3B0aW9uLScgKyBpLCBvblRhcDogb25DaGFuZ2UgfSxcblx0XHRcdFx0XHRpY29uLFxuXHRcdFx0XHRcdF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdFx0X0l0ZW1Jbm5lcjJbJ2RlZmF1bHQnXSxcblx0XHRcdFx0XHRcdG51bGwsXG5cdFx0XHRcdFx0XHRfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdFx0XHRcdFx0X0l0ZW1UaXRsZTJbJ2RlZmF1bHQnXSxcblx0XHRcdFx0XHRcdFx0bnVsbCxcblx0XHRcdFx0XHRcdFx0b3AubGFiZWxcblx0XHRcdFx0XHRcdCksXG5cdFx0XHRcdFx0XHRjaGVja01hcmtcblx0XHRcdFx0XHQpXG5cdFx0XHRcdClcblx0XHRcdCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHQnZGl2Jyxcblx0XHRcdG51bGwsXG5cdFx0XHRvcHRpb25zXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9XG5cbnZhciBfY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcblxudmFyIF9jbGFzc25hbWVzMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2NsYXNzbmFtZXMpO1xuXG52YXIgX3JlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcblxudmFyIF9yZWFjdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9yZWFjdCk7XG5cbnZhciBfcmVhY3RUYXBwYWJsZSA9IHJlcXVpcmUoJ3JlYWN0LXRhcHBhYmxlJyk7XG5cbnZhciBfcmVhY3RUYXBwYWJsZTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9yZWFjdFRhcHBhYmxlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ1NlYXJjaEZpZWxkJyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2xhc3NOYW1lOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZyxcblx0XHRvbkNhbmNlbDogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5mdW5jLFxuXHRcdG9uQ2hhbmdlOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLmZ1bmMsXG5cdFx0b25DbGVhcjogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5mdW5jLFxuXHRcdG9uU3VibWl0OiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLmZ1bmMsXG5cdFx0cGxhY2Vob2xkZXI6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHR5cGU6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMub25lT2YoWydkZWZhdWx0JywgJ2RhcmsnXSksXG5cdFx0dmFsdWU6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuc3RyaW5nXG5cdH0sXG5cblx0Z2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiBnZXRJbml0aWFsU3RhdGUoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGlzRm9jdXNlZDogZmFsc2Vcblx0XHR9O1xuXHR9LFxuXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0eXBlOiAnZGVmYXVsdCcsXG5cdFx0XHR2YWx1ZTogJydcblx0XHR9O1xuXHR9LFxuXG5cdGhhbmRsZUNsZWFyOiBmdW5jdGlvbiBoYW5kbGVDbGVhcigpIHtcblx0XHR0aGlzLnJlZnMuaW5wdXQuZ2V0RE9NTm9kZSgpLmZvY3VzKCk7XG5cdFx0dGhpcy5wcm9wcy5vbkNsZWFyKCk7XG5cdH0sXG5cblx0aGFuZGxlQ2FuY2VsOiBmdW5jdGlvbiBoYW5kbGVDYW5jZWwoKSB7XG5cdFx0dGhpcy5yZWZzLmlucHV0LmdldERPTU5vZGUoKS5ibHVyKCk7XG5cdFx0dGhpcy5wcm9wcy5vbkNhbmNlbCgpO1xuXHR9LFxuXG5cdGhhbmRsZUNoYW5nZTogZnVuY3Rpb24gaGFuZGxlQ2hhbmdlKGUpIHtcblx0XHR0aGlzLnByb3BzLm9uQ2hhbmdlKGUudGFyZ2V0LnZhbHVlKTtcblx0fSxcblxuXHRoYW5kbGVCbHVyOiBmdW5jdGlvbiBoYW5kbGVCbHVyKGUpIHtcblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdGlzRm9jdXNlZDogZmFsc2Vcblx0XHR9KTtcblx0fSxcblxuXHRoYW5kbGVGb2N1czogZnVuY3Rpb24gaGFuZGxlRm9jdXMoZSkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0aXNGb2N1c2VkOiB0cnVlXG5cdFx0fSk7XG5cdH0sXG5cblx0aGFuZGxlU3VibWl0OiBmdW5jdGlvbiBoYW5kbGVTdWJtaXQoZSkge1xuXHRcdGUucHJldmVudERlZmF1bHQoKTtcblxuXHRcdHZhciBpbnB1dCA9IHRoaXMucmVmcy5pbnB1dC5nZXRET01Ob2RlKCk7XG5cblx0XHRpbnB1dC5ibHVyKCk7XG5cdFx0dGhpcy5wcm9wcy5vblN1Ym1pdChpbnB1dC52YWx1ZSk7XG5cdH0sXG5cblx0cmVuZGVyQ2xlYXI6IGZ1bmN0aW9uIHJlbmRlckNsZWFyKCkge1xuXHRcdGlmICghdGhpcy5wcm9wcy52YWx1ZS5sZW5ndGgpIHJldHVybjtcblx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoX3JlYWN0VGFwcGFibGUyWydkZWZhdWx0J10sIHsgY2xhc3NOYW1lOiAnU2VhcmNoRmllbGRfX2ljb24gU2VhcmNoRmllbGRfX2ljb24tLWNsZWFyJywgb25UYXA6IHRoaXMuaGFuZGxlQ2xlYXIgfSk7XG5cdH0sXG5cblx0cmVuZGVyQ2FuY2VsOiBmdW5jdGlvbiByZW5kZXJDYW5jZWwoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9ICgwLCBfY2xhc3NuYW1lczJbJ2RlZmF1bHQnXSkoJ1NlYXJjaEZpZWxkX19jYW5jZWwnLCB7XG5cdFx0XHQnaXMtdmlzaWJsZSc6IHRoaXMuc3RhdGUuaXNGb2N1c2VkIHx8IHRoaXMucHJvcHMudmFsdWVcblx0XHR9KTtcblx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRfcmVhY3RUYXBwYWJsZTJbJ2RlZmF1bHQnXSxcblx0XHRcdHsgY2xhc3NOYW1lOiBjbGFzc05hbWUsIG9uVGFwOiB0aGlzLmhhbmRsZUNhbmNlbCB9LFxuXHRcdFx0J0NhbmNlbCdcblx0XHQpO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBjbGFzc05hbWUgPSAoMCwgX2NsYXNzbmFtZXMyWydkZWZhdWx0J10pKCdTZWFyY2hGaWVsZCcsICdTZWFyY2hGaWVsZC0tJyArIHRoaXMucHJvcHMudHlwZSwge1xuXHRcdFx0J2lzLWZvY3VzZWQnOiB0aGlzLnN0YXRlLmlzRm9jdXNlZCxcblx0XHRcdCdoYXMtdmFsdWUnOiB0aGlzLnByb3BzLnZhbHVlXG5cdFx0fSwgdGhpcy5wcm9wcy5jbGFzc05hbWUpO1xuXG5cdFx0cmV0dXJuIF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2Zvcm0nLFxuXHRcdFx0eyBvblN1Ym1pdDogdGhpcy5oYW5kbGVTdWJtaXQsIGFjdGlvbjogJ2phdmFzY3JpcHQ6OycsIGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sXG5cdFx0XHRfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdFx0J2xhYmVsJyxcblx0XHRcdFx0eyBjbGFzc05hbWU6ICdTZWFyY2hGaWVsZF9fZmllbGQnIH0sXG5cdFx0XHRcdF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHRcdHsgY2xhc3NOYW1lOiAnU2VhcmNoRmllbGRfX3BsYWNlaG9sZGVyJyB9LFxuXHRcdFx0XHRcdF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KCdzcGFuJywgeyBjbGFzc05hbWU6ICdTZWFyY2hGaWVsZF9faWNvbiBTZWFyY2hGaWVsZF9faWNvbi0tc2VhcmNoJyB9KSxcblx0XHRcdFx0XHQhdGhpcy5wcm9wcy52YWx1ZS5sZW5ndGggPyB0aGlzLnByb3BzLnBsYWNlaG9sZGVyIDogbnVsbFxuXHRcdFx0XHQpLFxuXHRcdFx0XHRfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudCgnaW5wdXQnLCB7IHR5cGU6ICdzZWFyY2gnLCByZWY6ICdpbnB1dCcsIHZhbHVlOiB0aGlzLnByb3BzLnZhbHVlLCBvbkNoYW5nZTogdGhpcy5oYW5kbGVDaGFuZ2UsIG9uRm9jdXM6IHRoaXMuaGFuZGxlRm9jdXMsIG9uQmx1cjogdGhpcy5oYW5kbGVCbHVyLCBjbGFzc05hbWU6ICdTZWFyY2hGaWVsZF9faW5wdXQnIH0pLFxuXHRcdFx0XHR0aGlzLnJlbmRlckNsZWFyKClcblx0XHRcdCksXG5cdFx0XHR0aGlzLnJlbmRlckNhbmNlbCgpXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9XG5cbnZhciBfY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcblxudmFyIF9jbGFzc25hbWVzMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2NsYXNzbmFtZXMpO1xuXG52YXIgX3JlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcblxudmFyIF9yZWFjdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9yZWFjdCk7XG5cbnZhciBfcmVhY3RUYXBwYWJsZSA9IHJlcXVpcmUoJ3JlYWN0LXRhcHBhYmxlJyk7XG5cbnZhciBfcmVhY3RUYXBwYWJsZTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9yZWFjdFRhcHBhYmxlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ1NlZ21lbnRlZENvbnRyb2wnLFxuXG5cdHByb3BUeXBlczoge1xuXHRcdGNsYXNzTmFtZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0ZXF1YWxXaWR0aFNlZ21lbnRzOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLmJvb2wsXG5cdFx0aXNJbmxpbmU6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuYm9vbCxcblx0XHRoYXNHdXR0ZXI6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuYm9vbCxcblx0XHRvbkNoYW5nZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5mdW5jLmlzUmVxdWlyZWQsXG5cdFx0b3B0aW9uczogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5hcnJheS5pc1JlcXVpcmVkLFxuXHRcdHR5cGU6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdHZhbHVlOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZ1xuXHR9LFxuXG5cdGdldERlZmF1bHRQcm9wczogZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0eXBlOiAncHJpbWFyeSdcblx0XHR9O1xuXHR9LFxuXG5cdG9uQ2hhbmdlOiBmdW5jdGlvbiBvbkNoYW5nZSh2YWx1ZSkge1xuXHRcdHRoaXMucHJvcHMub25DaGFuZ2UodmFsdWUpO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRcdHZhciBjb21wb25lbnRDbGFzc05hbWUgPSAoMCwgX2NsYXNzbmFtZXMyWydkZWZhdWx0J10pKCdTZWdtZW50ZWRDb250cm9sJywgJ1NlZ21lbnRlZENvbnRyb2wtLScgKyB0aGlzLnByb3BzLnR5cGUsIHtcblx0XHRcdCdTZWdtZW50ZWRDb250cm9sLS1pbmxpbmUnOiB0aGlzLnByb3BzLmlzSW5saW5lLFxuXHRcdFx0J1NlZ21lbnRlZENvbnRyb2wtLWhhcy1ndXR0ZXInOiB0aGlzLnByb3BzLmhhc0d1dHRlcixcblx0XHRcdCdTZWdtZW50ZWRDb250cm9sLS1lcXVhbC13aWR0aHMnOiB0aGlzLnByb3BzLmVxdWFsV2lkdGhTZWdtZW50c1xuXHRcdH0sIHRoaXMucHJvcHMuY2xhc3NOYW1lKTtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHR2YXIgb3B0aW9ucyA9IHRoaXMucHJvcHMub3B0aW9ucy5tYXAoZnVuY3Rpb24gKG9wKSB7XG5cdFx0XHRmdW5jdGlvbiBvbkNoYW5nZSgpIHtcblx0XHRcdFx0c2VsZi5vbkNoYW5nZShvcC52YWx1ZSk7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBpdGVtQ2xhc3NOYW1lID0gKDAsIF9jbGFzc25hbWVzMlsnZGVmYXVsdCddKSgnU2VnbWVudGVkQ29udHJvbF9faXRlbScsIHtcblx0XHRcdFx0J2lzLXNlbGVjdGVkJzogb3AudmFsdWUgPT09IHNlbGYucHJvcHMudmFsdWVcblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdF9yZWFjdFRhcHBhYmxlMlsnZGVmYXVsdCddLFxuXHRcdFx0XHR7IGtleTogJ29wdGlvbi0nICsgb3AudmFsdWUsIG9uVGFwOiBvbkNoYW5nZSwgY2xhc3NOYW1lOiBpdGVtQ2xhc3NOYW1lIH0sXG5cdFx0XHRcdG9wLmxhYmVsXG5cdFx0XHQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KFxuXHRcdFx0J2RpdicsXG5cdFx0XHR7IGNsYXNzTmFtZTogY29tcG9uZW50Q2xhc3NOYW1lIH0sXG5cdFx0XHRvcHRpb25zXG5cdFx0KTtcblx0fVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9XG5cbnZhciBfY2xhc3NuYW1lcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcblxudmFyIF9jbGFzc25hbWVzMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2NsYXNzbmFtZXMpO1xuXG52YXIgX3JlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcblxudmFyIF9yZWFjdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9yZWFjdCk7XG5cbnZhciBfcmVhY3RUYXBwYWJsZSA9IHJlcXVpcmUoJ3JlYWN0LXRhcHBhYmxlJyk7XG5cbnZhciBfcmVhY3RUYXBwYWJsZTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9yZWFjdFRhcHBhYmxlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ1N3aXRjaCcsXG5cblx0cHJvcFR5cGVzOiB7XG5cdFx0ZGlzYWJsZWQ6IF9yZWFjdDJbJ2RlZmF1bHQnXS5Qcm9wVHlwZXMuYm9vbCxcblx0XHRvbjogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5ib29sLFxuXHRcdG9uVGFwOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLmZ1bmMsXG5cdFx0dHlwZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wcygpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dHlwZTogJ2RlZmF1bHQnXG5cdFx0fTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gKDAsIF9jbGFzc25hbWVzMlsnZGVmYXVsdCddKSgnU3dpdGNoJywgJ1N3aXRjaC0tJyArIHRoaXMucHJvcHMudHlwZSwge1xuXHRcdFx0J2lzLWRpc2FibGVkJzogdGhpcy5wcm9wcy5kaXNhYmxlZCxcblx0XHRcdCdpcy1vbic6IHRoaXMucHJvcHMub25cblx0XHR9KTtcblxuXHRcdHJldHVybiBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdF9yZWFjdFRhcHBhYmxlMlsnZGVmYXVsdCddLFxuXHRcdFx0eyBvblRhcDogdGhpcy5wcm9wcy5vblRhcCwgY2xhc3NOYW1lOiBjbGFzc05hbWUsIGNvbXBvbmVudDogJ2xhYmVsJyB9LFxuXHRcdFx0X3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdCdkaXYnLFxuXHRcdFx0XHR7IGNsYXNzTmFtZTogJ1N3aXRjaF9fdHJhY2snIH0sXG5cdFx0XHRcdF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KCdkaXYnLCB7IGNsYXNzTmFtZTogJ1N3aXRjaF9faGFuZGxlJyB9KVxuXHRcdFx0KVxuXHRcdCk7XG5cdH1cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywge1xuXHR2YWx1ZTogdHJ1ZVxufSk7XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7ICdkZWZhdWx0Jzogb2JqIH07IH1cblxudmFyIF9ibGFja2xpc3QgPSByZXF1aXJlKCdibGFja2xpc3QnKTtcblxudmFyIF9ibGFja2xpc3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfYmxhY2tsaXN0KTtcblxudmFyIF9jbGFzc25hbWVzID0gcmVxdWlyZSgnY2xhc3NuYW1lcycpO1xuXG52YXIgX2NsYXNzbmFtZXMyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfY2xhc3NuYW1lcyk7XG5cbnZhciBfcmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG52YXIgX3JlYWN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0KTtcblxudmFyIF9yZWFjdFRhcHBhYmxlID0gcmVxdWlyZSgncmVhY3QtdGFwcGFibGUnKTtcblxudmFyIF9yZWFjdFRhcHBhYmxlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0VGFwcGFibGUpO1xuXG52YXIgTmF2aWdhdG9yID0gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdOYXZpZ2F0b3InLFxuXG5cdHByb3BUeXBlczoge1xuXHRcdGNsYXNzTmFtZTogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5zdHJpbmdcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgY2xhc3NOYW1lID0gKDAsIF9jbGFzc25hbWVzMlsnZGVmYXVsdCddKSgnVGFicy1OYXZpZ2F0b3InLCB0aGlzLnByb3BzLmNsYXNzTmFtZSk7XG5cdFx0dmFyIG90aGVyUHJvcHMgPSAoMCwgX2JsYWNrbGlzdDJbJ2RlZmF1bHQnXSkodGhpcy5wcm9wcywgJ2NsYXNzTmFtZScpO1xuXG5cdFx0cmV0dXJuIF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KCdkaXYnLCBfZXh0ZW5kcyh7IGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sIG90aGVyUHJvcHMpKTtcblx0fVxufSk7XG5cbmV4cG9ydHMuTmF2aWdhdG9yID0gTmF2aWdhdG9yO1xudmFyIFRhYiA9IF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVDbGFzcyh7XG5cdGRpc3BsYXlOYW1lOiAnVGFiJyxcblxuXHRwcm9wVHlwZXM6IHtcblx0XHRzZWxlY3RlZDogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5ib29sXG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9ICgwLCBfY2xhc3NuYW1lczJbJ2RlZmF1bHQnXSkoJ1RhYnMtVGFiJywgeyAnaXMtc2VsZWN0ZWQnOiB0aGlzLnByb3BzLnNlbGVjdGVkIH0pO1xuXHRcdHZhciBvdGhlclByb3BzID0gKDAsIF9ibGFja2xpc3QyWydkZWZhdWx0J10pKHRoaXMucHJvcHMsICdzZWxlY3RlZCcpO1xuXG5cdFx0cmV0dXJuIF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KF9yZWFjdFRhcHBhYmxlMlsnZGVmYXVsdCddLCBfZXh0ZW5kcyh7IGNsYXNzTmFtZTogY2xhc3NOYW1lIH0sIG90aGVyUHJvcHMpKTtcblx0fVxufSk7XG5cbmV4cG9ydHMuVGFiID0gVGFiO1xudmFyIExhYmVsID0gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUNsYXNzKHtcblx0ZGlzcGxheU5hbWU6ICdMYWJlbCcsXG5cblx0cmVuZGVyOiBmdW5jdGlvbiByZW5kZXIoKSB7XG5cdFx0cmV0dXJuIF9yZWFjdDJbJ2RlZmF1bHQnXS5jcmVhdGVFbGVtZW50KCdkaXYnLCBfZXh0ZW5kcyh7IGNsYXNzTmFtZTogJ1RhYnMtTGFiZWwnIH0sIHRoaXMucHJvcHMpKTtcblx0fVxufSk7XG5leHBvcnRzLkxhYmVsID0gTGFiZWw7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9O1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyAnZGVmYXVsdCc6IG9iaiB9OyB9XG5cbnZhciBfYmxhY2tsaXN0ID0gcmVxdWlyZSgnYmxhY2tsaXN0Jyk7XG5cbnZhciBfYmxhY2tsaXN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2JsYWNrbGlzdCk7XG5cbnZhciBfSXRlbSA9IHJlcXVpcmUoJy4vSXRlbScpO1xuXG52YXIgX0l0ZW0yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfSXRlbSk7XG5cbnZhciBfSXRlbUNvbnRlbnQgPSByZXF1aXJlKCcuL0l0ZW1Db250ZW50Jyk7XG5cbnZhciBfSXRlbUNvbnRlbnQyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfSXRlbUNvbnRlbnQpO1xuXG52YXIgX0l0ZW1Jbm5lciA9IHJlcXVpcmUoJy4vSXRlbUlubmVyJyk7XG5cbnZhciBfSXRlbUlubmVyMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0l0ZW1Jbm5lcik7XG5cbnZhciBfcmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG52YXIgX3JlYWN0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3JlYWN0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlQ2xhc3Moe1xuXHRkaXNwbGF5TmFtZTogJ0lucHV0Jyxcblx0cHJvcFR5cGVzOiB7XG5cdFx0Y2xhc3NOYW1lOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLnN0cmluZyxcblx0XHRjaGlsZHJlbjogX3JlYWN0MlsnZGVmYXVsdCddLlByb3BUeXBlcy5ub2RlLFxuXHRcdGRpc2FibGVkOiBfcmVhY3QyWydkZWZhdWx0J10uUHJvcFR5cGVzLmJvb2xcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uIHJlbmRlcigpIHtcblx0XHR2YXIgaW5wdXRQcm9wcyA9ICgwLCBfYmxhY2tsaXN0MlsnZGVmYXVsdCddKSh0aGlzLnByb3BzLCAnY2hpbGRyZW4nLCAnY2xhc3NOYW1lJyk7XG5cblx0XHRyZXR1cm4gX3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRfSXRlbTJbJ2RlZmF1bHQnXSxcblx0XHRcdHsgc2VsZWN0YWJsZTogdGhpcy5wcm9wcy5kaXNhYmxlZCwgY2xhc3NOYW1lOiB0aGlzLnByb3BzLmNsYXNzTmFtZSwgY29tcG9uZW50OiAnbGFiZWwnIH0sXG5cdFx0XHRfcmVhY3QyWydkZWZhdWx0J10uY3JlYXRlRWxlbWVudChcblx0XHRcdFx0X0l0ZW1Jbm5lcjJbJ2RlZmF1bHQnXSxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0X3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0X0l0ZW1Db250ZW50MlsnZGVmYXVsdCddLFxuXHRcdFx0XHRcdHsgY29tcG9uZW50OiAnbGFiZWwnIH0sXG5cdFx0XHRcdFx0X3JlYWN0MlsnZGVmYXVsdCddLmNyZWF0ZUVsZW1lbnQoJ3RleHRhcmVhJywgX2V4dGVuZHMoeyBjbGFzc05hbWU6ICdmaWVsZCcsIHJvd3M6IDMgfSwgaW5wdXRQcm9wcykpXG5cdFx0XHRcdCksXG5cdFx0XHRcdHRoaXMucHJvcHMuY2hpbGRyZW5cblx0XHRcdClcblx0XHQpO1xuXHR9XG59KTsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xudmFyIEFsZXJ0YmFyID0gcmVxdWlyZSgnLi9BbGVydGJhcicpO1xuZXhwb3J0cy5BbGVydGJhciA9IEFsZXJ0YmFyO1xudmFyIEJ1dHRvbiA9IHJlcXVpcmUoJy4vQnV0dG9uJyk7XG5leHBvcnRzLkJ1dHRvbiA9IEJ1dHRvbjtcbnZhciBCdXR0b25Hcm91cCA9IHJlcXVpcmUoJy4vQnV0dG9uR3JvdXAnKTtcbmV4cG9ydHMuQnV0dG9uR3JvdXAgPSBCdXR0b25Hcm91cDtcbnZhciBEYXRlUGlja2VyID0gcmVxdWlyZSgnLi9EYXRlUGlja2VyJyk7XG5leHBvcnRzLkRhdGVQaWNrZXIgPSBEYXRlUGlja2VyO1xudmFyIERhdGVQaWNrZXJQb3B1cCA9IHJlcXVpcmUoJy4vRGF0ZVBpY2tlclBvcHVwJyk7XG5leHBvcnRzLkRhdGVQaWNrZXJQb3B1cCA9IERhdGVQaWNrZXJQb3B1cDtcbnZhciBGaWVsZENvbnRyb2wgPSByZXF1aXJlKCcuL0ZpZWxkQ29udHJvbCcpO1xuZXhwb3J0cy5GaWVsZENvbnRyb2wgPSBGaWVsZENvbnRyb2w7XG52YXIgRmllbGRMYWJlbCA9IHJlcXVpcmUoJy4vRmllbGRMYWJlbCcpO1xuZXhwb3J0cy5GaWVsZExhYmVsID0gRmllbGRMYWJlbDtcbnZhciBHcm91cCA9IHJlcXVpcmUoJy4vR3JvdXAnKTtcbmV4cG9ydHMuR3JvdXAgPSBHcm91cDtcbnZhciBHcm91cEJvZHkgPSByZXF1aXJlKCcuL0dyb3VwQm9keScpO1xuZXhwb3J0cy5Hcm91cEJvZHkgPSBHcm91cEJvZHk7XG52YXIgR3JvdXBGb290ZXIgPSByZXF1aXJlKCcuL0dyb3VwRm9vdGVyJyk7XG5leHBvcnRzLkdyb3VwRm9vdGVyID0gR3JvdXBGb290ZXI7XG52YXIgR3JvdXBIZWFkZXIgPSByZXF1aXJlKCcuL0dyb3VwSGVhZGVyJyk7XG5leHBvcnRzLkdyb3VwSGVhZGVyID0gR3JvdXBIZWFkZXI7XG52YXIgR3JvdXBJbm5lciA9IHJlcXVpcmUoJy4vR3JvdXBJbm5lcicpO1xuZXhwb3J0cy5Hcm91cElubmVyID0gR3JvdXBJbm5lcjtcbnZhciBJdGVtID0gcmVxdWlyZSgnLi9JdGVtJyk7XG5leHBvcnRzLkl0ZW0gPSBJdGVtO1xudmFyIEl0ZW1Db250ZW50ID0gcmVxdWlyZSgnLi9JdGVtQ29udGVudCcpO1xuZXhwb3J0cy5JdGVtQ29udGVudCA9IEl0ZW1Db250ZW50O1xudmFyIEl0ZW1Jbm5lciA9IHJlcXVpcmUoJy4vSXRlbUlubmVyJyk7XG5leHBvcnRzLkl0ZW1Jbm5lciA9IEl0ZW1Jbm5lcjtcbnZhciBJdGVtTWVkaWEgPSByZXF1aXJlKCcuL0l0ZW1NZWRpYScpO1xuZXhwb3J0cy5JdGVtTWVkaWEgPSBJdGVtTWVkaWE7XG52YXIgSXRlbU5vdGUgPSByZXF1aXJlKCcuL0l0ZW1Ob3RlJyk7XG5leHBvcnRzLkl0ZW1Ob3RlID0gSXRlbU5vdGU7XG52YXIgSXRlbVN1YlRpdGxlID0gcmVxdWlyZSgnLi9JdGVtU3ViVGl0bGUnKTtcbmV4cG9ydHMuSXRlbVN1YlRpdGxlID0gSXRlbVN1YlRpdGxlO1xudmFyIEl0ZW1UaXRsZSA9IHJlcXVpcmUoJy4vSXRlbVRpdGxlJyk7XG5leHBvcnRzLkl0ZW1UaXRsZSA9IEl0ZW1UaXRsZTtcbnZhciBMYWJlbElucHV0ID0gcmVxdWlyZSgnLi9MYWJlbElucHV0Jyk7XG5leHBvcnRzLkxhYmVsSW5wdXQgPSBMYWJlbElucHV0O1xudmFyIExhYmVsU2VsZWN0ID0gcmVxdWlyZSgnLi9MYWJlbFNlbGVjdCcpO1xuZXhwb3J0cy5MYWJlbFNlbGVjdCA9IExhYmVsU2VsZWN0O1xudmFyIExhYmVsVGV4dGFyZWEgPSByZXF1aXJlKCcuL0xhYmVsVGV4dGFyZWEnKTtcbmV4cG9ydHMuTGFiZWxUZXh0YXJlYSA9IExhYmVsVGV4dGFyZWE7XG52YXIgTGFiZWxWYWx1ZSA9IHJlcXVpcmUoJy4vTGFiZWxWYWx1ZScpO1xuZXhwb3J0cy5MYWJlbFZhbHVlID0gTGFiZWxWYWx1ZTtcbnZhciBMaXN0SGVhZGVyID0gcmVxdWlyZSgnLi9MaXN0SGVhZGVyJyk7XG5leHBvcnRzLkxpc3RIZWFkZXIgPSBMaXN0SGVhZGVyO1xudmFyIE5hdmlnYXRpb25CYXIgPSByZXF1aXJlKCcuL05hdmlnYXRpb25CYXInKTtcbmV4cG9ydHMuTmF2aWdhdGlvbkJhciA9IE5hdmlnYXRpb25CYXI7XG52YXIgUG9wdXAgPSByZXF1aXJlKCcuL1BvcHVwJyk7XG5leHBvcnRzLlBvcHVwID0gUG9wdXA7XG52YXIgUG9wdXBJY29uID0gcmVxdWlyZSgnLi9Qb3B1cEljb24nKTtcbmV4cG9ydHMuUG9wdXBJY29uID0gUG9wdXBJY29uO1xudmFyIFJhZGlvTGlzdCA9IHJlcXVpcmUoJy4vUmFkaW9MaXN0Jyk7XG5leHBvcnRzLlJhZGlvTGlzdCA9IFJhZGlvTGlzdDtcbnZhciBTZWFyY2hGaWVsZCA9IHJlcXVpcmUoJy4vU2VhcmNoRmllbGQnKTtcbmV4cG9ydHMuU2VhcmNoRmllbGQgPSBTZWFyY2hGaWVsZDtcbnZhciBTZWdtZW50ZWRDb250cm9sID0gcmVxdWlyZSgnLi9TZWdtZW50ZWRDb250cm9sJyk7XG5leHBvcnRzLlNlZ21lbnRlZENvbnRyb2wgPSBTZWdtZW50ZWRDb250cm9sO1xudmFyIFN3aXRjaCA9IHJlcXVpcmUoJy4vU3dpdGNoJyk7XG5leHBvcnRzLlN3aXRjaCA9IFN3aXRjaDtcbnZhciBUYWJzID0gcmVxdWlyZSgnLi9UYWJzJyk7XG5leHBvcnRzLlRhYnMgPSBUYWJzO1xudmFyIFRleHRhcmVhID0gcmVxdWlyZSgnLi9UZXh0YXJlYScpO1xuXG5leHBvcnRzLlRleHRhcmVhID0gVGV4dGFyZWE7XG4vLyBkZXBlbmRzIG9uIGFib3ZlXG52YXIgSW5wdXQgPSByZXF1aXJlKCcuL0lucHV0Jyk7XG5leHBvcnRzLklucHV0ID0gSW5wdXQ7IiwiXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSB0cmltO1xuXG5mdW5jdGlvbiB0cmltKHN0cil7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyp8XFxzKiQvZywgJycpO1xufVxuXG5leHBvcnRzLmxlZnQgPSBmdW5jdGlvbihzdHIpe1xuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMqLywgJycpO1xufTtcblxuZXhwb3J0cy5yaWdodCA9IGZ1bmN0aW9uKHN0cil7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvXFxzKiQvLCAnJyk7XG59O1xuIiwiLyoqXG4gKiBUd2Vlbi5qcyAtIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZVxuICogaHR0cHM6Ly9naXRodWIuY29tL3R3ZWVuanMvdHdlZW4uanNcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqXG4gKiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL3R3ZWVuanMvdHdlZW4uanMvZ3JhcGhzL2NvbnRyaWJ1dG9ycyBmb3IgdGhlIGZ1bGwgbGlzdCBvZiBjb250cmlidXRvcnMuXG4gKiBUaGFuayB5b3UgYWxsLCB5b3UncmUgYXdlc29tZSFcbiAqL1xuXG52YXIgVFdFRU4gPSBUV0VFTiB8fCAoZnVuY3Rpb24gKCkge1xuXG5cdHZhciBfdHdlZW5zID0gW107XG5cblx0cmV0dXJuIHtcblxuXHRcdGdldEFsbDogZnVuY3Rpb24gKCkge1xuXG5cdFx0XHRyZXR1cm4gX3R3ZWVucztcblxuXHRcdH0sXG5cblx0XHRyZW1vdmVBbGw6IGZ1bmN0aW9uICgpIHtcblxuXHRcdFx0X3R3ZWVucyA9IFtdO1xuXG5cdFx0fSxcblxuXHRcdGFkZDogZnVuY3Rpb24gKHR3ZWVuKSB7XG5cblx0XHRcdF90d2VlbnMucHVzaCh0d2Vlbik7XG5cblx0XHR9LFxuXG5cdFx0cmVtb3ZlOiBmdW5jdGlvbiAodHdlZW4pIHtcblxuXHRcdFx0dmFyIGkgPSBfdHdlZW5zLmluZGV4T2YodHdlZW4pO1xuXG5cdFx0XHRpZiAoaSAhPT0gLTEpIHtcblx0XHRcdFx0X3R3ZWVucy5zcGxpY2UoaSwgMSk7XG5cdFx0XHR9XG5cblx0XHR9LFxuXG5cdFx0dXBkYXRlOiBmdW5jdGlvbiAodGltZSwgcHJlc2VydmUpIHtcblxuXHRcdFx0aWYgKF90d2VlbnMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIGkgPSAwO1xuXG5cdFx0XHR0aW1lID0gdGltZSAhPT0gdW5kZWZpbmVkID8gdGltZSA6IFRXRUVOLm5vdygpO1xuXG5cdFx0XHR3aGlsZSAoaSA8IF90d2VlbnMubGVuZ3RoKSB7XG5cblx0XHRcdFx0aWYgKF90d2VlbnNbaV0udXBkYXRlKHRpbWUpIHx8IHByZXNlcnZlKSB7XG5cdFx0XHRcdFx0aSsrO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdF90d2VlbnMuc3BsaWNlKGksIDEpO1xuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cblx0XHR9XG5cdH07XG5cbn0pKCk7XG5cblxuLy8gSW5jbHVkZSBhIHBlcmZvcm1hbmNlLm5vdyBwb2x5ZmlsbC5cbi8vIEluIG5vZGUuanMsIHVzZSBwcm9jZXNzLmhydGltZS5cbmlmICh0eXBlb2YgKHdpbmRvdykgPT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiAocHJvY2VzcykgIT09ICd1bmRlZmluZWQnKSB7XG5cdFRXRUVOLm5vdyA9IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgdGltZSA9IHByb2Nlc3MuaHJ0aW1lKCk7XG5cblx0XHQvLyBDb252ZXJ0IFtzZWNvbmRzLCBuYW5vc2Vjb25kc10gdG8gbWlsbGlzZWNvbmRzLlxuXHRcdHJldHVybiB0aW1lWzBdICogMTAwMCArIHRpbWVbMV0gLyAxMDAwMDAwO1xuXHR9O1xufVxuLy8gSW4gYSBicm93c2VyLCB1c2Ugd2luZG93LnBlcmZvcm1hbmNlLm5vdyBpZiBpdCBpcyBhdmFpbGFibGUuXG5lbHNlIGlmICh0eXBlb2YgKHdpbmRvdykgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICAgICB3aW5kb3cucGVyZm9ybWFuY2UgIT09IHVuZGVmaW5lZCAmJlxuXHRcdCB3aW5kb3cucGVyZm9ybWFuY2Uubm93ICE9PSB1bmRlZmluZWQpIHtcblx0Ly8gVGhpcyBtdXN0IGJlIGJvdW5kLCBiZWNhdXNlIGRpcmVjdGx5IGFzc2lnbmluZyB0aGlzIGZ1bmN0aW9uXG5cdC8vIGxlYWRzIHRvIGFuIGludm9jYXRpb24gZXhjZXB0aW9uIGluIENocm9tZS5cblx0VFdFRU4ubm93ID0gd2luZG93LnBlcmZvcm1hbmNlLm5vdy5iaW5kKHdpbmRvdy5wZXJmb3JtYW5jZSk7XG59XG4vLyBVc2UgRGF0ZS5ub3cgaWYgaXQgaXMgYXZhaWxhYmxlLlxuZWxzZSBpZiAoRGF0ZS5ub3cgIT09IHVuZGVmaW5lZCkge1xuXHRUV0VFTi5ub3cgPSBEYXRlLm5vdztcbn1cbi8vIE90aGVyd2lzZSwgdXNlICduZXcgRGF0ZSgpLmdldFRpbWUoKScuXG5lbHNlIHtcblx0VFdFRU4ubm93ID0gZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0fTtcbn1cblxuXG5UV0VFTi5Ud2VlbiA9IGZ1bmN0aW9uIChvYmplY3QpIHtcblxuXHR2YXIgX29iamVjdCA9IG9iamVjdDtcblx0dmFyIF92YWx1ZXNTdGFydCA9IHt9O1xuXHR2YXIgX3ZhbHVlc0VuZCA9IHt9O1xuXHR2YXIgX3ZhbHVlc1N0YXJ0UmVwZWF0ID0ge307XG5cdHZhciBfZHVyYXRpb24gPSAxMDAwO1xuXHR2YXIgX3JlcGVhdCA9IDA7XG5cdHZhciBfcmVwZWF0RGVsYXlUaW1lO1xuXHR2YXIgX3lveW8gPSBmYWxzZTtcblx0dmFyIF9pc1BsYXlpbmcgPSBmYWxzZTtcblx0dmFyIF9yZXZlcnNlZCA9IGZhbHNlO1xuXHR2YXIgX2RlbGF5VGltZSA9IDA7XG5cdHZhciBfc3RhcnRUaW1lID0gbnVsbDtcblx0dmFyIF9lYXNpbmdGdW5jdGlvbiA9IFRXRUVOLkVhc2luZy5MaW5lYXIuTm9uZTtcblx0dmFyIF9pbnRlcnBvbGF0aW9uRnVuY3Rpb24gPSBUV0VFTi5JbnRlcnBvbGF0aW9uLkxpbmVhcjtcblx0dmFyIF9jaGFpbmVkVHdlZW5zID0gW107XG5cdHZhciBfb25TdGFydENhbGxiYWNrID0gbnVsbDtcblx0dmFyIF9vblN0YXJ0Q2FsbGJhY2tGaXJlZCA9IGZhbHNlO1xuXHR2YXIgX29uVXBkYXRlQ2FsbGJhY2sgPSBudWxsO1xuXHR2YXIgX29uQ29tcGxldGVDYWxsYmFjayA9IG51bGw7XG5cdHZhciBfb25TdG9wQ2FsbGJhY2sgPSBudWxsO1xuXG5cdHRoaXMudG8gPSBmdW5jdGlvbiAocHJvcGVydGllcywgZHVyYXRpb24pIHtcblxuXHRcdF92YWx1ZXNFbmQgPSBwcm9wZXJ0aWVzO1xuXG5cdFx0aWYgKGR1cmF0aW9uICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdF9kdXJhdGlvbiA9IGR1cmF0aW9uO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5zdGFydCA9IGZ1bmN0aW9uICh0aW1lKSB7XG5cblx0XHRUV0VFTi5hZGQodGhpcyk7XG5cblx0XHRfaXNQbGF5aW5nID0gdHJ1ZTtcblxuXHRcdF9vblN0YXJ0Q2FsbGJhY2tGaXJlZCA9IGZhbHNlO1xuXG5cdFx0X3N0YXJ0VGltZSA9IHRpbWUgIT09IHVuZGVmaW5lZCA/IHRpbWUgOiBUV0VFTi5ub3coKTtcblx0XHRfc3RhcnRUaW1lICs9IF9kZWxheVRpbWU7XG5cblx0XHRmb3IgKHZhciBwcm9wZXJ0eSBpbiBfdmFsdWVzRW5kKSB7XG5cblx0XHRcdC8vIENoZWNrIGlmIGFuIEFycmF5IHdhcyBwcm92aWRlZCBhcyBwcm9wZXJ0eSB2YWx1ZVxuXHRcdFx0aWYgKF92YWx1ZXNFbmRbcHJvcGVydHldIGluc3RhbmNlb2YgQXJyYXkpIHtcblxuXHRcdFx0XHRpZiAoX3ZhbHVlc0VuZFtwcm9wZXJ0eV0ubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBDcmVhdGUgYSBsb2NhbCBjb3B5IG9mIHRoZSBBcnJheSB3aXRoIHRoZSBzdGFydCB2YWx1ZSBhdCB0aGUgZnJvbnRcblx0XHRcdFx0X3ZhbHVlc0VuZFtwcm9wZXJ0eV0gPSBbX29iamVjdFtwcm9wZXJ0eV1dLmNvbmNhdChfdmFsdWVzRW5kW3Byb3BlcnR5XSk7XG5cblx0XHRcdH1cblxuXHRcdFx0Ly8gSWYgYHRvKClgIHNwZWNpZmllcyBhIHByb3BlcnR5IHRoYXQgZG9lc24ndCBleGlzdCBpbiB0aGUgc291cmNlIG9iamVjdCxcblx0XHRcdC8vIHdlIHNob3VsZCBub3Qgc2V0IHRoYXQgcHJvcGVydHkgaW4gdGhlIG9iamVjdFxuXHRcdFx0aWYgKF9vYmplY3RbcHJvcGVydHldID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNhdmUgdGhlIHN0YXJ0aW5nIHZhbHVlLlxuXHRcdFx0X3ZhbHVlc1N0YXJ0W3Byb3BlcnR5XSA9IF9vYmplY3RbcHJvcGVydHldO1xuXG5cdFx0XHRpZiAoKF92YWx1ZXNTdGFydFtwcm9wZXJ0eV0gaW5zdGFuY2VvZiBBcnJheSkgPT09IGZhbHNlKSB7XG5cdFx0XHRcdF92YWx1ZXNTdGFydFtwcm9wZXJ0eV0gKj0gMS4wOyAvLyBFbnN1cmVzIHdlJ3JlIHVzaW5nIG51bWJlcnMsIG5vdCBzdHJpbmdzXG5cdFx0XHR9XG5cblx0XHRcdF92YWx1ZXNTdGFydFJlcGVhdFtwcm9wZXJ0eV0gPSBfdmFsdWVzU3RhcnRbcHJvcGVydHldIHx8IDA7XG5cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMuc3RvcCA9IGZ1bmN0aW9uICgpIHtcblxuXHRcdGlmICghX2lzUGxheWluZykge1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXG5cdFx0VFdFRU4ucmVtb3ZlKHRoaXMpO1xuXHRcdF9pc1BsYXlpbmcgPSBmYWxzZTtcblxuXHRcdGlmIChfb25TdG9wQ2FsbGJhY2sgIT09IG51bGwpIHtcblx0XHRcdF9vblN0b3BDYWxsYmFjay5jYWxsKF9vYmplY3QsIF9vYmplY3QpO1xuXHRcdH1cblxuXHRcdHRoaXMuc3RvcENoYWluZWRUd2VlbnMoKTtcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMuZW5kID0gZnVuY3Rpb24gKCkge1xuXG5cdFx0dGhpcy51cGRhdGUoX3N0YXJ0VGltZSArIF9kdXJhdGlvbik7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnN0b3BDaGFpbmVkVHdlZW5zID0gZnVuY3Rpb24gKCkge1xuXG5cdFx0Zm9yICh2YXIgaSA9IDAsIG51bUNoYWluZWRUd2VlbnMgPSBfY2hhaW5lZFR3ZWVucy5sZW5ndGg7IGkgPCBudW1DaGFpbmVkVHdlZW5zOyBpKyspIHtcblx0XHRcdF9jaGFpbmVkVHdlZW5zW2ldLnN0b3AoKTtcblx0XHR9XG5cblx0fTtcblxuXHR0aGlzLmRlbGF5ID0gZnVuY3Rpb24gKGFtb3VudCkge1xuXG5cdFx0X2RlbGF5VGltZSA9IGFtb3VudDtcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMucmVwZWF0ID0gZnVuY3Rpb24gKHRpbWVzKSB7XG5cblx0XHRfcmVwZWF0ID0gdGltZXM7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnJlcGVhdERlbGF5ID0gZnVuY3Rpb24gKGFtb3VudCkge1xuXG5cdFx0X3JlcGVhdERlbGF5VGltZSA9IGFtb3VudDtcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMueW95byA9IGZ1bmN0aW9uICh5b3lvKSB7XG5cblx0XHRfeW95byA9IHlveW87XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXG5cdHRoaXMuZWFzaW5nID0gZnVuY3Rpb24gKGVhc2luZykge1xuXG5cdFx0X2Vhc2luZ0Z1bmN0aW9uID0gZWFzaW5nO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5pbnRlcnBvbGF0aW9uID0gZnVuY3Rpb24gKGludGVycG9sYXRpb24pIHtcblxuXHRcdF9pbnRlcnBvbGF0aW9uRnVuY3Rpb24gPSBpbnRlcnBvbGF0aW9uO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5jaGFpbiA9IGZ1bmN0aW9uICgpIHtcblxuXHRcdF9jaGFpbmVkVHdlZW5zID0gYXJndW1lbnRzO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5vblN0YXJ0ID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG5cblx0XHRfb25TdGFydENhbGxiYWNrID0gY2FsbGJhY2s7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLm9uVXBkYXRlID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG5cblx0XHRfb25VcGRhdGVDYWxsYmFjayA9IGNhbGxiYWNrO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5vbkNvbXBsZXRlID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG5cblx0XHRfb25Db21wbGV0ZUNhbGxiYWNrID0gY2FsbGJhY2s7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLm9uU3RvcCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuXG5cdFx0X29uU3RvcENhbGxiYWNrID0gY2FsbGJhY2s7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uICh0aW1lKSB7XG5cblx0XHR2YXIgcHJvcGVydHk7XG5cdFx0dmFyIGVsYXBzZWQ7XG5cdFx0dmFyIHZhbHVlO1xuXG5cdFx0aWYgKHRpbWUgPCBfc3RhcnRUaW1lKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZiAoX29uU3RhcnRDYWxsYmFja0ZpcmVkID09PSBmYWxzZSkge1xuXG5cdFx0XHRpZiAoX29uU3RhcnRDYWxsYmFjayAhPT0gbnVsbCkge1xuXHRcdFx0XHRfb25TdGFydENhbGxiYWNrLmNhbGwoX29iamVjdCwgX29iamVjdCk7XG5cdFx0XHR9XG5cblx0XHRcdF9vblN0YXJ0Q2FsbGJhY2tGaXJlZCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0ZWxhcHNlZCA9ICh0aW1lIC0gX3N0YXJ0VGltZSkgLyBfZHVyYXRpb247XG5cdFx0ZWxhcHNlZCA9IGVsYXBzZWQgPiAxID8gMSA6IGVsYXBzZWQ7XG5cblx0XHR2YWx1ZSA9IF9lYXNpbmdGdW5jdGlvbihlbGFwc2VkKTtcblxuXHRcdGZvciAocHJvcGVydHkgaW4gX3ZhbHVlc0VuZCkge1xuXG5cdFx0XHQvLyBEb24ndCB1cGRhdGUgcHJvcGVydGllcyB0aGF0IGRvIG5vdCBleGlzdCBpbiB0aGUgc291cmNlIG9iamVjdFxuXHRcdFx0aWYgKF92YWx1ZXNTdGFydFtwcm9wZXJ0eV0gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIHN0YXJ0ID0gX3ZhbHVlc1N0YXJ0W3Byb3BlcnR5XSB8fCAwO1xuXHRcdFx0dmFyIGVuZCA9IF92YWx1ZXNFbmRbcHJvcGVydHldO1xuXG5cdFx0XHRpZiAoZW5kIGluc3RhbmNlb2YgQXJyYXkpIHtcblxuXHRcdFx0XHRfb2JqZWN0W3Byb3BlcnR5XSA9IF9pbnRlcnBvbGF0aW9uRnVuY3Rpb24oZW5kLCB2YWx1ZSk7XG5cblx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0Ly8gUGFyc2VzIHJlbGF0aXZlIGVuZCB2YWx1ZXMgd2l0aCBzdGFydCBhcyBiYXNlIChlLmcuOiArMTAsIC0zKVxuXHRcdFx0XHRpZiAodHlwZW9mIChlbmQpID09PSAnc3RyaW5nJykge1xuXG5cdFx0XHRcdFx0aWYgKGVuZC5jaGFyQXQoMCkgPT09ICcrJyB8fCBlbmQuY2hhckF0KDApID09PSAnLScpIHtcblx0XHRcdFx0XHRcdGVuZCA9IHN0YXJ0ICsgcGFyc2VGbG9hdChlbmQpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRlbmQgPSBwYXJzZUZsb2F0KGVuZCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gUHJvdGVjdCBhZ2FpbnN0IG5vbiBudW1lcmljIHByb3BlcnRpZXMuXG5cdFx0XHRcdGlmICh0eXBlb2YgKGVuZCkgPT09ICdudW1iZXInKSB7XG5cdFx0XHRcdFx0X29iamVjdFtwcm9wZXJ0eV0gPSBzdGFydCArIChlbmQgLSBzdGFydCkgKiB2YWx1ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cblx0XHR9XG5cblx0XHRpZiAoX29uVXBkYXRlQ2FsbGJhY2sgIT09IG51bGwpIHtcblx0XHRcdF9vblVwZGF0ZUNhbGxiYWNrLmNhbGwoX29iamVjdCwgdmFsdWUpO1xuXHRcdH1cblxuXHRcdGlmIChlbGFwc2VkID09PSAxKSB7XG5cblx0XHRcdGlmIChfcmVwZWF0ID4gMCkge1xuXG5cdFx0XHRcdGlmIChpc0Zpbml0ZShfcmVwZWF0KSkge1xuXHRcdFx0XHRcdF9yZXBlYXQtLTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFJlYXNzaWduIHN0YXJ0aW5nIHZhbHVlcywgcmVzdGFydCBieSBtYWtpbmcgc3RhcnRUaW1lID0gbm93XG5cdFx0XHRcdGZvciAocHJvcGVydHkgaW4gX3ZhbHVlc1N0YXJ0UmVwZWF0KSB7XG5cblx0XHRcdFx0XHRpZiAodHlwZW9mIChfdmFsdWVzRW5kW3Byb3BlcnR5XSkgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdFx0XHRfdmFsdWVzU3RhcnRSZXBlYXRbcHJvcGVydHldID0gX3ZhbHVlc1N0YXJ0UmVwZWF0W3Byb3BlcnR5XSArIHBhcnNlRmxvYXQoX3ZhbHVlc0VuZFtwcm9wZXJ0eV0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChfeW95bykge1xuXHRcdFx0XHRcdFx0dmFyIHRtcCA9IF92YWx1ZXNTdGFydFJlcGVhdFtwcm9wZXJ0eV07XG5cblx0XHRcdFx0XHRcdF92YWx1ZXNTdGFydFJlcGVhdFtwcm9wZXJ0eV0gPSBfdmFsdWVzRW5kW3Byb3BlcnR5XTtcblx0XHRcdFx0XHRcdF92YWx1ZXNFbmRbcHJvcGVydHldID0gdG1wO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdF92YWx1ZXNTdGFydFtwcm9wZXJ0eV0gPSBfdmFsdWVzU3RhcnRSZXBlYXRbcHJvcGVydHldO1xuXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoX3lveW8pIHtcblx0XHRcdFx0XHRfcmV2ZXJzZWQgPSAhX3JldmVyc2VkO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKF9yZXBlYXREZWxheVRpbWUgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdF9zdGFydFRpbWUgPSB0aW1lICsgX3JlcGVhdERlbGF5VGltZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRfc3RhcnRUaW1lID0gdGltZSArIF9kZWxheVRpbWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHRpZiAoX29uQ29tcGxldGVDYWxsYmFjayAhPT0gbnVsbCkge1xuXG5cdFx0XHRcdFx0X29uQ29tcGxldGVDYWxsYmFjay5jYWxsKF9vYmplY3QsIF9vYmplY3QpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Zm9yICh2YXIgaSA9IDAsIG51bUNoYWluZWRUd2VlbnMgPSBfY2hhaW5lZFR3ZWVucy5sZW5ndGg7IGkgPCBudW1DaGFpbmVkVHdlZW5zOyBpKyspIHtcblx0XHRcdFx0XHQvLyBNYWtlIHRoZSBjaGFpbmVkIHR3ZWVucyBzdGFydCBleGFjdGx5IGF0IHRoZSB0aW1lIHRoZXkgc2hvdWxkLFxuXHRcdFx0XHRcdC8vIGV2ZW4gaWYgdGhlIGB1cGRhdGUoKWAgbWV0aG9kIHdhcyBjYWxsZWQgd2F5IHBhc3QgdGhlIGR1cmF0aW9uIG9mIHRoZSB0d2VlblxuXHRcdFx0XHRcdF9jaGFpbmVkVHdlZW5zW2ldLnN0YXJ0KF9zdGFydFRpbWUgKyBfZHVyYXRpb24pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXG5cdFx0XHR9XG5cblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblxuXHR9O1xuXG59O1xuXG5cblRXRUVOLkVhc2luZyA9IHtcblxuXHRMaW5lYXI6IHtcblxuXHRcdE5vbmU6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiBrO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0UXVhZHJhdGljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIGsgKiBrO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIGsgKiAoMiAtIGspO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoKGsgKj0gMikgPCAxKSB7XG5cdFx0XHRcdHJldHVybiAwLjUgKiBrICogaztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIC0gMC41ICogKC0tayAqIChrIC0gMikgLSAxKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdEN1YmljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIGsgKiBrICogaztcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiAtLWsgKiBrICogayArIDE7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdGlmICgoayAqPSAyKSA8IDEpIHtcblx0XHRcdFx0cmV0dXJuIDAuNSAqIGsgKiBrICogaztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIDAuNSAqICgoayAtPSAyKSAqIGsgKiBrICsgMik7XG5cblx0XHR9XG5cblx0fSxcblxuXHRRdWFydGljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIGsgKiBrICogayAqIGs7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gMSAtICgtLWsgKiBrICogayAqIGspO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoKGsgKj0gMikgPCAxKSB7XG5cdFx0XHRcdHJldHVybiAwLjUgKiBrICogayAqIGsgKiBrO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gLSAwLjUgKiAoKGsgLT0gMikgKiBrICogayAqIGsgLSAyKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdFF1aW50aWM6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gayAqIGsgKiBrICogayAqIGs7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gLS1rICogayAqIGsgKiBrICogayArIDE7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdGlmICgoayAqPSAyKSA8IDEpIHtcblx0XHRcdFx0cmV0dXJuIDAuNSAqIGsgKiBrICogayAqIGsgKiBrO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gMC41ICogKChrIC09IDIpICogayAqIGsgKiBrICogayArIDIpO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0U2ludXNvaWRhbDoge1xuXG5cdFx0SW46IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiAxIC0gTWF0aC5jb3MoayAqIE1hdGguUEkgLyAyKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiBNYXRoLnNpbihrICogTWF0aC5QSSAvIDIpO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gMC41ICogKDEgLSBNYXRoLmNvcyhNYXRoLlBJICogaykpO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0RXhwb25lbnRpYWw6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gayA9PT0gMCA/IDAgOiBNYXRoLnBvdygxMDI0LCBrIC0gMSk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gayA9PT0gMSA/IDEgOiAxIC0gTWF0aC5wb3coMiwgLSAxMCAqIGspO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoayA9PT0gMCkge1xuXHRcdFx0XHRyZXR1cm4gMDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGsgPT09IDEpIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cblx0XHRcdGlmICgoayAqPSAyKSA8IDEpIHtcblx0XHRcdFx0cmV0dXJuIDAuNSAqIE1hdGgucG93KDEwMjQsIGsgLSAxKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIDAuNSAqICgtIE1hdGgucG93KDIsIC0gMTAgKiAoayAtIDEpKSArIDIpO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0Q2lyY3VsYXI6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gMSAtIE1hdGguc3FydCgxIC0gayAqIGspO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIE1hdGguc3FydCgxIC0gKC0tayAqIGspKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0aWYgKChrICo9IDIpIDwgMSkge1xuXHRcdFx0XHRyZXR1cm4gLSAwLjUgKiAoTWF0aC5zcXJ0KDEgLSBrICogaykgLSAxKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIDAuNSAqIChNYXRoLnNxcnQoMSAtIChrIC09IDIpICogaykgKyAxKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdEVsYXN0aWM6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoayA9PT0gMCkge1xuXHRcdFx0XHRyZXR1cm4gMDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGsgPT09IDEpIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAtTWF0aC5wb3coMiwgMTAgKiAoayAtIDEpKSAqIE1hdGguc2luKChrIC0gMS4xKSAqIDUgKiBNYXRoLlBJKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdGlmIChrID09PSAwKSB7XG5cdFx0XHRcdHJldHVybiAwO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoayA9PT0gMSkge1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIE1hdGgucG93KDIsIC0xMCAqIGspICogTWF0aC5zaW4oKGsgLSAwLjEpICogNSAqIE1hdGguUEkpICsgMTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0aWYgKGsgPT09IDApIHtcblx0XHRcdFx0cmV0dXJuIDA7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChrID09PSAxKSB7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fVxuXG5cdFx0XHRrICo9IDI7XG5cblx0XHRcdGlmIChrIDwgMSkge1xuXHRcdFx0XHRyZXR1cm4gLTAuNSAqIE1hdGgucG93KDIsIDEwICogKGsgLSAxKSkgKiBNYXRoLnNpbigoayAtIDEuMSkgKiA1ICogTWF0aC5QSSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAwLjUgKiBNYXRoLnBvdygyLCAtMTAgKiAoayAtIDEpKSAqIE1hdGguc2luKChrIC0gMS4xKSAqIDUgKiBNYXRoLlBJKSArIDE7XG5cblx0XHR9XG5cblx0fSxcblxuXHRCYWNrOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0dmFyIHMgPSAxLjcwMTU4O1xuXG5cdFx0XHRyZXR1cm4gayAqIGsgKiAoKHMgKyAxKSAqIGsgLSBzKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHZhciBzID0gMS43MDE1ODtcblxuXHRcdFx0cmV0dXJuIC0tayAqIGsgKiAoKHMgKyAxKSAqIGsgKyBzKSArIDE7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHZhciBzID0gMS43MDE1OCAqIDEuNTI1O1xuXG5cdFx0XHRpZiAoKGsgKj0gMikgPCAxKSB7XG5cdFx0XHRcdHJldHVybiAwLjUgKiAoayAqIGsgKiAoKHMgKyAxKSAqIGsgLSBzKSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAwLjUgKiAoKGsgLT0gMikgKiBrICogKChzICsgMSkgKiBrICsgcykgKyAyKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdEJvdW5jZToge1xuXG5cdFx0SW46IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiAxIC0gVFdFRU4uRWFzaW5nLkJvdW5jZS5PdXQoMSAtIGspO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0aWYgKGsgPCAoMSAvIDIuNzUpKSB7XG5cdFx0XHRcdHJldHVybiA3LjU2MjUgKiBrICogaztcblx0XHRcdH0gZWxzZSBpZiAoayA8ICgyIC8gMi43NSkpIHtcblx0XHRcdFx0cmV0dXJuIDcuNTYyNSAqIChrIC09ICgxLjUgLyAyLjc1KSkgKiBrICsgMC43NTtcblx0XHRcdH0gZWxzZSBpZiAoayA8ICgyLjUgLyAyLjc1KSkge1xuXHRcdFx0XHRyZXR1cm4gNy41NjI1ICogKGsgLT0gKDIuMjUgLyAyLjc1KSkgKiBrICsgMC45Mzc1O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIDcuNTYyNSAqIChrIC09ICgyLjYyNSAvIDIuNzUpKSAqIGsgKyAwLjk4NDM3NTtcblx0XHRcdH1cblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0aWYgKGsgPCAwLjUpIHtcblx0XHRcdFx0cmV0dXJuIFRXRUVOLkVhc2luZy5Cb3VuY2UuSW4oayAqIDIpICogMC41O1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gVFdFRU4uRWFzaW5nLkJvdW5jZS5PdXQoayAqIDIgLSAxKSAqIDAuNSArIDAuNTtcblxuXHRcdH1cblxuXHR9XG5cbn07XG5cblRXRUVOLkludGVycG9sYXRpb24gPSB7XG5cblx0TGluZWFyOiBmdW5jdGlvbiAodiwgaykge1xuXG5cdFx0dmFyIG0gPSB2Lmxlbmd0aCAtIDE7XG5cdFx0dmFyIGYgPSBtICogaztcblx0XHR2YXIgaSA9IE1hdGguZmxvb3IoZik7XG5cdFx0dmFyIGZuID0gVFdFRU4uSW50ZXJwb2xhdGlvbi5VdGlscy5MaW5lYXI7XG5cblx0XHRpZiAoayA8IDApIHtcblx0XHRcdHJldHVybiBmbih2WzBdLCB2WzFdLCBmKTtcblx0XHR9XG5cblx0XHRpZiAoayA+IDEpIHtcblx0XHRcdHJldHVybiBmbih2W21dLCB2W20gLSAxXSwgbSAtIGYpO1xuXHRcdH1cblxuXHRcdHJldHVybiBmbih2W2ldLCB2W2kgKyAxID4gbSA/IG0gOiBpICsgMV0sIGYgLSBpKTtcblxuXHR9LFxuXG5cdEJlemllcjogZnVuY3Rpb24gKHYsIGspIHtcblxuXHRcdHZhciBiID0gMDtcblx0XHR2YXIgbiA9IHYubGVuZ3RoIC0gMTtcblx0XHR2YXIgcHcgPSBNYXRoLnBvdztcblx0XHR2YXIgYm4gPSBUV0VFTi5JbnRlcnBvbGF0aW9uLlV0aWxzLkJlcm5zdGVpbjtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDw9IG47IGkrKykge1xuXHRcdFx0YiArPSBwdygxIC0gaywgbiAtIGkpICogcHcoaywgaSkgKiB2W2ldICogYm4obiwgaSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGI7XG5cblx0fSxcblxuXHRDYXRtdWxsUm9tOiBmdW5jdGlvbiAodiwgaykge1xuXG5cdFx0dmFyIG0gPSB2Lmxlbmd0aCAtIDE7XG5cdFx0dmFyIGYgPSBtICogaztcblx0XHR2YXIgaSA9IE1hdGguZmxvb3IoZik7XG5cdFx0dmFyIGZuID0gVFdFRU4uSW50ZXJwb2xhdGlvbi5VdGlscy5DYXRtdWxsUm9tO1xuXG5cdFx0aWYgKHZbMF0gPT09IHZbbV0pIHtcblxuXHRcdFx0aWYgKGsgPCAwKSB7XG5cdFx0XHRcdGkgPSBNYXRoLmZsb29yKGYgPSBtICogKDEgKyBrKSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBmbih2WyhpIC0gMSArIG0pICUgbV0sIHZbaV0sIHZbKGkgKyAxKSAlIG1dLCB2WyhpICsgMikgJSBtXSwgZiAtIGkpO1xuXG5cdFx0fSBlbHNlIHtcblxuXHRcdFx0aWYgKGsgPCAwKSB7XG5cdFx0XHRcdHJldHVybiB2WzBdIC0gKGZuKHZbMF0sIHZbMF0sIHZbMV0sIHZbMV0sIC1mKSAtIHZbMF0pO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoayA+IDEpIHtcblx0XHRcdFx0cmV0dXJuIHZbbV0gLSAoZm4odlttXSwgdlttXSwgdlttIC0gMV0sIHZbbSAtIDFdLCBmIC0gbSkgLSB2W21dKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGZuKHZbaSA/IGkgLSAxIDogMF0sIHZbaV0sIHZbbSA8IGkgKyAxID8gbSA6IGkgKyAxXSwgdlttIDwgaSArIDIgPyBtIDogaSArIDJdLCBmIC0gaSk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRVdGlsczoge1xuXG5cdFx0TGluZWFyOiBmdW5jdGlvbiAocDAsIHAxLCB0KSB7XG5cblx0XHRcdHJldHVybiAocDEgLSBwMCkgKiB0ICsgcDA7XG5cblx0XHR9LFxuXG5cdFx0QmVybnN0ZWluOiBmdW5jdGlvbiAobiwgaSkge1xuXG5cdFx0XHR2YXIgZmMgPSBUV0VFTi5JbnRlcnBvbGF0aW9uLlV0aWxzLkZhY3RvcmlhbDtcblxuXHRcdFx0cmV0dXJuIGZjKG4pIC8gZmMoaSkgLyBmYyhuIC0gaSk7XG5cblx0XHR9LFxuXG5cdFx0RmFjdG9yaWFsOiAoZnVuY3Rpb24gKCkge1xuXG5cdFx0XHR2YXIgYSA9IFsxXTtcblxuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uIChuKSB7XG5cblx0XHRcdFx0dmFyIHMgPSAxO1xuXG5cdFx0XHRcdGlmIChhW25dKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGFbbl07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmb3IgKHZhciBpID0gbjsgaSA+IDE7IGktLSkge1xuXHRcdFx0XHRcdHMgKj0gaTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGFbbl0gPSBzO1xuXHRcdFx0XHRyZXR1cm4gcztcblxuXHRcdFx0fTtcblxuXHRcdH0pKCksXG5cblx0XHRDYXRtdWxsUm9tOiBmdW5jdGlvbiAocDAsIHAxLCBwMiwgcDMsIHQpIHtcblxuXHRcdFx0dmFyIHYwID0gKHAyIC0gcDApICogMC41O1xuXHRcdFx0dmFyIHYxID0gKHAzIC0gcDEpICogMC41O1xuXHRcdFx0dmFyIHQyID0gdCAqIHQ7XG5cdFx0XHR2YXIgdDMgPSB0ICogdDI7XG5cblx0XHRcdHJldHVybiAoMiAqIHAxIC0gMiAqIHAyICsgdjAgKyB2MSkgKiB0MyArICgtIDMgKiBwMSArIDMgKiBwMiAtIDIgKiB2MCAtIHYxKSAqIHQyICsgdjAgKiB0ICsgcDE7XG5cblx0XHR9XG5cblx0fVxuXG59O1xuXG4vLyBVTUQgKFVuaXZlcnNhbCBNb2R1bGUgRGVmaW5pdGlvbilcbihmdW5jdGlvbiAocm9vdCkge1xuXG5cdGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcblxuXHRcdC8vIEFNRFxuXHRcdGRlZmluZShbXSwgZnVuY3Rpb24gKCkge1xuXHRcdFx0cmV0dXJuIFRXRUVOO1xuXHRcdH0pO1xuXG5cdH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG5cblx0XHQvLyBOb2RlLmpzXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBUV0VFTjtcblxuXHR9IGVsc2UgaWYgKHJvb3QgIT09IHVuZGVmaW5lZCkge1xuXG5cdFx0Ly8gR2xvYmFsIHZhcmlhYmxlXG5cdFx0cm9vdC5UV0VFTiA9IFRXRUVOO1xuXG5cdH1cblxufSkodGhpcyk7XG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciB3aW5kb3cgPSByZXF1aXJlKFwiZ2xvYmFsL3dpbmRvd1wiKVxudmFyIGlzRnVuY3Rpb24gPSByZXF1aXJlKFwiaXMtZnVuY3Rpb25cIilcbnZhciBwYXJzZUhlYWRlcnMgPSByZXF1aXJlKFwicGFyc2UtaGVhZGVyc1wiKVxudmFyIHh0ZW5kID0gcmVxdWlyZShcInh0ZW5kXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlWEhSXG5jcmVhdGVYSFIuWE1MSHR0cFJlcXVlc3QgPSB3aW5kb3cuWE1MSHR0cFJlcXVlc3QgfHwgbm9vcFxuY3JlYXRlWEhSLlhEb21haW5SZXF1ZXN0ID0gXCJ3aXRoQ3JlZGVudGlhbHNcIiBpbiAobmV3IGNyZWF0ZVhIUi5YTUxIdHRwUmVxdWVzdCgpKSA/IGNyZWF0ZVhIUi5YTUxIdHRwUmVxdWVzdCA6IHdpbmRvdy5YRG9tYWluUmVxdWVzdFxuXG5mb3JFYWNoQXJyYXkoW1wiZ2V0XCIsIFwicHV0XCIsIFwicG9zdFwiLCBcInBhdGNoXCIsIFwiaGVhZFwiLCBcImRlbGV0ZVwiXSwgZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgY3JlYXRlWEhSW21ldGhvZCA9PT0gXCJkZWxldGVcIiA/IFwiZGVsXCIgOiBtZXRob2RdID0gZnVuY3Rpb24odXJpLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgICAgICBvcHRpb25zID0gaW5pdFBhcmFtcyh1cmksIG9wdGlvbnMsIGNhbGxiYWNrKVxuICAgICAgICBvcHRpb25zLm1ldGhvZCA9IG1ldGhvZC50b1VwcGVyQ2FzZSgpXG4gICAgICAgIHJldHVybiBfY3JlYXRlWEhSKG9wdGlvbnMpXG4gICAgfVxufSlcblxuZnVuY3Rpb24gZm9yRWFjaEFycmF5KGFycmF5LCBpdGVyYXRvcikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaXRlcmF0b3IoYXJyYXlbaV0pXG4gICAgfVxufVxuXG5mdW5jdGlvbiBpc0VtcHR5KG9iail7XG4gICAgZm9yKHZhciBpIGluIG9iail7XG4gICAgICAgIGlmKG9iai5oYXNPd25Qcm9wZXJ0eShpKSkgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIHJldHVybiB0cnVlXG59XG5cbmZ1bmN0aW9uIGluaXRQYXJhbXModXJpLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIHZhciBwYXJhbXMgPSB1cmlcblxuICAgIGlmIChpc0Z1bmN0aW9uKG9wdGlvbnMpKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9uc1xuICAgICAgICBpZiAodHlwZW9mIHVyaSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgcGFyYW1zID0ge3VyaTp1cml9XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBwYXJhbXMgPSB4dGVuZChvcHRpb25zLCB7dXJpOiB1cml9KVxuICAgIH1cblxuICAgIHBhcmFtcy5jYWxsYmFjayA9IGNhbGxiYWNrXG4gICAgcmV0dXJuIHBhcmFtc1xufVxuXG5mdW5jdGlvbiBjcmVhdGVYSFIodXJpLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIG9wdGlvbnMgPSBpbml0UGFyYW1zKHVyaSwgb3B0aW9ucywgY2FsbGJhY2spXG4gICAgcmV0dXJuIF9jcmVhdGVYSFIob3B0aW9ucylcbn1cblxuZnVuY3Rpb24gX2NyZWF0ZVhIUihvcHRpb25zKSB7XG4gICAgaWYodHlwZW9mIG9wdGlvbnMuY2FsbGJhY2sgPT09IFwidW5kZWZpbmVkXCIpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJjYWxsYmFjayBhcmd1bWVudCBtaXNzaW5nXCIpXG4gICAgfVxuXG4gICAgdmFyIGNhbGxlZCA9IGZhbHNlXG4gICAgdmFyIGNhbGxiYWNrID0gZnVuY3Rpb24gY2JPbmNlKGVyciwgcmVzcG9uc2UsIGJvZHkpe1xuICAgICAgICBpZighY2FsbGVkKXtcbiAgICAgICAgICAgIGNhbGxlZCA9IHRydWVcbiAgICAgICAgICAgIG9wdGlvbnMuY2FsbGJhY2soZXJyLCByZXNwb25zZSwgYm9keSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlYWR5c3RhdGVjaGFuZ2UoKSB7XG4gICAgICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICAgICAgc2V0VGltZW91dChsb2FkRnVuYywgMClcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEJvZHkoKSB7XG4gICAgICAgIC8vIENocm9tZSB3aXRoIHJlcXVlc3RUeXBlPWJsb2IgdGhyb3dzIGVycm9ycyBhcnJvdW5kIHdoZW4gZXZlbiB0ZXN0aW5nIGFjY2VzcyB0byByZXNwb25zZVRleHRcbiAgICAgICAgdmFyIGJvZHkgPSB1bmRlZmluZWRcblxuICAgICAgICBpZiAoeGhyLnJlc3BvbnNlKSB7XG4gICAgICAgICAgICBib2R5ID0geGhyLnJlc3BvbnNlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBib2R5ID0geGhyLnJlc3BvbnNlVGV4dCB8fCBnZXRYbWwoeGhyKVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzSnNvbikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBib2R5ID0gSlNPTi5wYXJzZShib2R5KVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBib2R5XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXJyb3JGdW5jKGV2dCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dFRpbWVyKVxuICAgICAgICBpZighKGV2dCBpbnN0YW5jZW9mIEVycm9yKSl7XG4gICAgICAgICAgICBldnQgPSBuZXcgRXJyb3IoXCJcIiArIChldnQgfHwgXCJVbmtub3duIFhNTEh0dHBSZXF1ZXN0IEVycm9yXCIpIClcbiAgICAgICAgfVxuICAgICAgICBldnQuc3RhdHVzQ29kZSA9IDBcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGV2dCwgZmFpbHVyZVJlc3BvbnNlKVxuICAgIH1cblxuICAgIC8vIHdpbGwgbG9hZCB0aGUgZGF0YSAmIHByb2Nlc3MgdGhlIHJlc3BvbnNlIGluIGEgc3BlY2lhbCByZXNwb25zZSBvYmplY3RcbiAgICBmdW5jdGlvbiBsb2FkRnVuYygpIHtcbiAgICAgICAgaWYgKGFib3J0ZWQpIHJldHVyblxuICAgICAgICB2YXIgc3RhdHVzXG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0VGltZXIpXG4gICAgICAgIGlmKG9wdGlvbnMudXNlWERSICYmIHhoci5zdGF0dXM9PT11bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vSUU4IENPUlMgR0VUIHN1Y2Nlc3NmdWwgcmVzcG9uc2UgZG9lc24ndCBoYXZlIGEgc3RhdHVzIGZpZWxkLCBidXQgYm9keSBpcyBmaW5lXG4gICAgICAgICAgICBzdGF0dXMgPSAyMDBcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0YXR1cyA9ICh4aHIuc3RhdHVzID09PSAxMjIzID8gMjA0IDogeGhyLnN0YXR1cylcbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVzcG9uc2UgPSBmYWlsdXJlUmVzcG9uc2VcbiAgICAgICAgdmFyIGVyciA9IG51bGxcblxuICAgICAgICBpZiAoc3RhdHVzICE9PSAwKXtcbiAgICAgICAgICAgIHJlc3BvbnNlID0ge1xuICAgICAgICAgICAgICAgIGJvZHk6IGdldEJvZHkoKSxcbiAgICAgICAgICAgICAgICBzdGF0dXNDb2RlOiBzdGF0dXMsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge30sXG4gICAgICAgICAgICAgICAgdXJsOiB1cmksXG4gICAgICAgICAgICAgICAgcmF3UmVxdWVzdDogeGhyXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZih4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKXsgLy9yZW1lbWJlciB4aHIgY2FuIGluIGZhY3QgYmUgWERSIGZvciBDT1JTIGluIElFXG4gICAgICAgICAgICAgICAgcmVzcG9uc2UuaGVhZGVycyA9IHBhcnNlSGVhZGVycyh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlcnIgPSBuZXcgRXJyb3IoXCJJbnRlcm5hbCBYTUxIdHRwUmVxdWVzdCBFcnJvclwiKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIsIHJlc3BvbnNlLCByZXNwb25zZS5ib2R5KVxuICAgIH1cblxuICAgIHZhciB4aHIgPSBvcHRpb25zLnhociB8fCBudWxsXG5cbiAgICBpZiAoIXhocikge1xuICAgICAgICBpZiAob3B0aW9ucy5jb3JzIHx8IG9wdGlvbnMudXNlWERSKSB7XG4gICAgICAgICAgICB4aHIgPSBuZXcgY3JlYXRlWEhSLlhEb21haW5SZXF1ZXN0KClcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICB4aHIgPSBuZXcgY3JlYXRlWEhSLlhNTEh0dHBSZXF1ZXN0KClcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBrZXlcbiAgICB2YXIgYWJvcnRlZFxuICAgIHZhciB1cmkgPSB4aHIudXJsID0gb3B0aW9ucy51cmkgfHwgb3B0aW9ucy51cmxcbiAgICB2YXIgbWV0aG9kID0geGhyLm1ldGhvZCA9IG9wdGlvbnMubWV0aG9kIHx8IFwiR0VUXCJcbiAgICB2YXIgYm9keSA9IG9wdGlvbnMuYm9keSB8fCBvcHRpb25zLmRhdGFcbiAgICB2YXIgaGVhZGVycyA9IHhoci5oZWFkZXJzID0gb3B0aW9ucy5oZWFkZXJzIHx8IHt9XG4gICAgdmFyIHN5bmMgPSAhIW9wdGlvbnMuc3luY1xuICAgIHZhciBpc0pzb24gPSBmYWxzZVxuICAgIHZhciB0aW1lb3V0VGltZXJcbiAgICB2YXIgZmFpbHVyZVJlc3BvbnNlID0ge1xuICAgICAgICBib2R5OiB1bmRlZmluZWQsXG4gICAgICAgIGhlYWRlcnM6IHt9LFxuICAgICAgICBzdGF0dXNDb2RlOiAwLFxuICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgdXJsOiB1cmksXG4gICAgICAgIHJhd1JlcXVlc3Q6IHhoclxuICAgIH1cblxuICAgIGlmIChcImpzb25cIiBpbiBvcHRpb25zICYmIG9wdGlvbnMuanNvbiAhPT0gZmFsc2UpIHtcbiAgICAgICAgaXNKc29uID0gdHJ1ZVxuICAgICAgICBoZWFkZXJzW1wiYWNjZXB0XCJdIHx8IGhlYWRlcnNbXCJBY2NlcHRcIl0gfHwgKGhlYWRlcnNbXCJBY2NlcHRcIl0gPSBcImFwcGxpY2F0aW9uL2pzb25cIikgLy9Eb24ndCBvdmVycmlkZSBleGlzdGluZyBhY2NlcHQgaGVhZGVyIGRlY2xhcmVkIGJ5IHVzZXJcbiAgICAgICAgaWYgKG1ldGhvZCAhPT0gXCJHRVRcIiAmJiBtZXRob2QgIT09IFwiSEVBRFwiKSB7XG4gICAgICAgICAgICBoZWFkZXJzW1wiY29udGVudC10eXBlXCJdIHx8IGhlYWRlcnNbXCJDb250ZW50LVR5cGVcIl0gfHwgKGhlYWRlcnNbXCJDb250ZW50LVR5cGVcIl0gPSBcImFwcGxpY2F0aW9uL2pzb25cIikgLy9Eb24ndCBvdmVycmlkZSBleGlzdGluZyBhY2NlcHQgaGVhZGVyIGRlY2xhcmVkIGJ5IHVzZXJcbiAgICAgICAgICAgIGJvZHkgPSBKU09OLnN0cmluZ2lmeShvcHRpb25zLmpzb24gPT09IHRydWUgPyBib2R5IDogb3B0aW9ucy5qc29uKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IHJlYWR5c3RhdGVjaGFuZ2VcbiAgICB4aHIub25sb2FkID0gbG9hZEZ1bmNcbiAgICB4aHIub25lcnJvciA9IGVycm9yRnVuY1xuICAgIC8vIElFOSBtdXN0IGhhdmUgb25wcm9ncmVzcyBiZSBzZXQgdG8gYSB1bmlxdWUgZnVuY3Rpb24uXG4gICAgeGhyLm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIElFIG11c3QgZGllXG4gICAgfVxuICAgIHhoci5vbmFib3J0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgYWJvcnRlZCA9IHRydWU7XG4gICAgfVxuICAgIHhoci5vbnRpbWVvdXQgPSBlcnJvckZ1bmNcbiAgICB4aHIub3BlbihtZXRob2QsIHVyaSwgIXN5bmMsIG9wdGlvbnMudXNlcm5hbWUsIG9wdGlvbnMucGFzc3dvcmQpXG4gICAgLy9oYXMgdG8gYmUgYWZ0ZXIgb3BlblxuICAgIGlmKCFzeW5jKSB7XG4gICAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSAhIW9wdGlvbnMud2l0aENyZWRlbnRpYWxzXG4gICAgfVxuICAgIC8vIENhbm5vdCBzZXQgdGltZW91dCB3aXRoIHN5bmMgcmVxdWVzdFxuICAgIC8vIG5vdCBzZXR0aW5nIHRpbWVvdXQgb24gdGhlIHhociBvYmplY3QsIGJlY2F1c2Ugb2Ygb2xkIHdlYmtpdHMgZXRjLiBub3QgaGFuZGxpbmcgdGhhdCBjb3JyZWN0bHlcbiAgICAvLyBib3RoIG5wbSdzIHJlcXVlc3QgYW5kIGpxdWVyeSAxLnggdXNlIHRoaXMga2luZCBvZiB0aW1lb3V0LCBzbyB0aGlzIGlzIGJlaW5nIGNvbnNpc3RlbnRcbiAgICBpZiAoIXN5bmMgJiYgb3B0aW9ucy50aW1lb3V0ID4gMCApIHtcbiAgICAgICAgdGltZW91dFRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgaWYgKGFib3J0ZWQpIHJldHVyblxuICAgICAgICAgICAgYWJvcnRlZCA9IHRydWUvL0lFOSBtYXkgc3RpbGwgY2FsbCByZWFkeXN0YXRlY2hhbmdlXG4gICAgICAgICAgICB4aHIuYWJvcnQoXCJ0aW1lb3V0XCIpXG4gICAgICAgICAgICB2YXIgZSA9IG5ldyBFcnJvcihcIlhNTEh0dHBSZXF1ZXN0IHRpbWVvdXRcIilcbiAgICAgICAgICAgIGUuY29kZSA9IFwiRVRJTUVET1VUXCJcbiAgICAgICAgICAgIGVycm9yRnVuYyhlKVxuICAgICAgICB9LCBvcHRpb25zLnRpbWVvdXQgKVxuICAgIH1cblxuICAgIGlmICh4aHIuc2V0UmVxdWVzdEhlYWRlcikge1xuICAgICAgICBmb3Ioa2V5IGluIGhlYWRlcnMpe1xuICAgICAgICAgICAgaWYoaGVhZGVycy5oYXNPd25Qcm9wZXJ0eShrZXkpKXtcbiAgICAgICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihrZXksIGhlYWRlcnNba2V5XSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5oZWFkZXJzICYmICFpc0VtcHR5KG9wdGlvbnMuaGVhZGVycykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSGVhZGVycyBjYW5ub3QgYmUgc2V0IG9uIGFuIFhEb21haW5SZXF1ZXN0IG9iamVjdFwiKVxuICAgIH1cblxuICAgIGlmIChcInJlc3BvbnNlVHlwZVwiIGluIG9wdGlvbnMpIHtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9IG9wdGlvbnMucmVzcG9uc2VUeXBlXG4gICAgfVxuXG4gICAgaWYgKFwiYmVmb3JlU2VuZFwiIGluIG9wdGlvbnMgJiZcbiAgICAgICAgdHlwZW9mIG9wdGlvbnMuYmVmb3JlU2VuZCA9PT0gXCJmdW5jdGlvblwiXG4gICAgKSB7XG4gICAgICAgIG9wdGlvbnMuYmVmb3JlU2VuZCh4aHIpXG4gICAgfVxuXG4gICAgLy8gTWljcm9zb2Z0IEVkZ2UgYnJvd3NlciBzZW5kcyBcInVuZGVmaW5lZFwiIHdoZW4gc2VuZCBpcyBjYWxsZWQgd2l0aCB1bmRlZmluZWQgdmFsdWUuXG4gICAgLy8gWE1MSHR0cFJlcXVlc3Qgc3BlYyBzYXlzIHRvIHBhc3MgbnVsbCBhcyBib2R5IHRvIGluZGljYXRlIG5vIGJvZHlcbiAgICAvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL25hdWd0dXIveGhyL2lzc3Vlcy8xMDAuXG4gICAgeGhyLnNlbmQoYm9keSB8fCBudWxsKVxuXG4gICAgcmV0dXJuIHhoclxuXG5cbn1cblxuZnVuY3Rpb24gZ2V0WG1sKHhocikge1xuICAgIGlmICh4aHIucmVzcG9uc2VUeXBlID09PSBcImRvY3VtZW50XCIpIHtcbiAgICAgICAgcmV0dXJuIHhoci5yZXNwb25zZVhNTFxuICAgIH1cbiAgICB2YXIgZmlyZWZveEJ1Z1Rha2VuRWZmZWN0ID0geGhyLnJlc3BvbnNlWE1MICYmIHhoci5yZXNwb25zZVhNTC5kb2N1bWVudEVsZW1lbnQubm9kZU5hbWUgPT09IFwicGFyc2VyZXJyb3JcIlxuICAgIGlmICh4aHIucmVzcG9uc2VUeXBlID09PSBcIlwiICYmICFmaXJlZm94QnVnVGFrZW5FZmZlY3QpIHtcbiAgICAgICAgcmV0dXJuIHhoci5yZXNwb25zZVhNTFxuICAgIH1cblxuICAgIHJldHVybiBudWxsXG59XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuIiwibW9kdWxlLmV4cG9ydHMgPSBleHRlbmRcblxudmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuZnVuY3Rpb24gZXh0ZW5kKCkge1xuICAgIHZhciB0YXJnZXQgPSB7fVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXVxuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRcbn1cbiIsImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgUmVhY3RDU1NUcmFuc2l0aW9uR3JvdXAgZnJvbSAncmVhY3QtYWRkb25zLWNzcy10cmFuc2l0aW9uLWdyb3VwJztcbmltcG9ydCBSZWFjdERPTSBmcm9tICdyZWFjdC1kb20nO1xuaW1wb3J0IHtcblx0Q29udGFpbmVyLFxuXHRjcmVhdGVBcHAsXG5cdFVJLFxuXHRWaWV3LFxuXHRWaWV3TWFuYWdlclxufSBmcm9tICd0b3VjaHN0b25lanMnO1xuXG4vLyBBcHAgQ29uZmlnXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuY29uc3QgUGVvcGxlU3RvcmUgPSByZXF1aXJlKCcuL3N0b3Jlcy9wZW9wbGUnKVxuY29uc3QgcGVvcGxlU3RvcmUgPSBuZXcgUGVvcGxlU3RvcmUoKVxuXG52YXIgQXBwID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRtaXhpbnM6IFtjcmVhdGVBcHAoKV0sXG5cblx0Y2hpbGRDb250ZXh0VHlwZXM6IHtcblx0XHRwZW9wbGVTdG9yZTogUmVhY3QuUHJvcFR5cGVzLm9iamVjdFxuXHR9LFxuXG5cdGdldENoaWxkQ29udGV4dCAoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHBlb3BsZVN0b3JlOiBwZW9wbGVTdG9yZVxuXHRcdH07XG5cdH0sXG5cblx0Y29tcG9uZW50RGlkTW91bnQgKCkge1xuXHRcdC8vIEhpZGUgdGhlIHNwbGFzaCBzY3JlZW4gd2hlbiB0aGUgYXBwIGlzIG1vdW50ZWRcblx0XHRpZiAobmF2aWdhdG9yLnNwbGFzaHNjcmVlbikge1xuXHRcdFx0bmF2aWdhdG9yLnNwbGFzaHNjcmVlbi5oaWRlKCk7XG5cdFx0fVxuXHR9LFxuXG5cdHJlbmRlciAoKSB7XG5cdFx0bGV0IGFwcFdyYXBwZXJDbGFzc05hbWUgPSAnYXBwLXdyYXBwZXIgZGV2aWNlLS0nICsgKHdpbmRvdy5kZXZpY2UgfHwge30pLnBsYXRmb3JtXG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdiBjbGFzc05hbWU9e2FwcFdyYXBwZXJDbGFzc05hbWV9PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cImRldmljZS1zaWxob3VldHRlXCI+XG5cdFx0XHRcdFx0PFZpZXdNYW5hZ2VyIG5hbWU9XCJhcHBcIiBkZWZhdWx0Vmlldz1cIm1haW5cIj5cblx0XHRcdFx0XHRcdDxWaWV3IG5hbWU9XCJtYWluXCIgY29tcG9uZW50PXtNYWluVmlld0NvbnRyb2xsZXJ9IC8+XG5cdFx0XHRcdFx0XHQ8VmlldyBuYW1lPVwidHJhbnNpdGlvbnMtdGFyZ2V0LW92ZXJcIiBjb21wb25lbnQ9e3JlcXVpcmUoJy4vdmlld3MvdHJhbnNpdGlvbnMtdGFyZ2V0LW92ZXInKX0gLz5cblx0XHRcdFx0XHQ8L1ZpZXdNYW5hZ2VyPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cbn0pO1xuXG4vLyBNYWluIENvbnRyb2xsZXJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG52YXIgTWFpblZpZXdDb250cm9sbGVyID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRyZW5kZXIgKCkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8Q29udGFpbmVyPlxuXHRcdFx0XHQ8VUkuTmF2aWdhdGlvbkJhciBuYW1lPVwibWFpblwiIC8+XG5cdFx0XHRcdDxWaWV3TWFuYWdlciBuYW1lPVwibWFpblwiIGRlZmF1bHRWaWV3PVwidGFic1wiPlxuXHRcdFx0XHRcdDxWaWV3IG5hbWU9XCJ0YWJzXCIgY29tcG9uZW50PXtUYWJWaWV3Q29udHJvbGxlcn0gLz5cblx0XHRcdFx0PC9WaWV3TWFuYWdlcj5cblx0XHRcdDwvQ29udGFpbmVyPlxuXHRcdCk7XG5cdH1cbn0pO1xuXG4vLyBUYWIgQ29udHJvbGxlclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbnZhciBsYXN0U2VsZWN0ZWRUYWIgPSAnbGlzdHMnXG52YXIgVGFiVmlld0NvbnRyb2xsZXIgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGdldEluaXRpYWxTdGF0ZSAoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHNlbGVjdGVkVGFiOiBsYXN0U2VsZWN0ZWRUYWJcblx0XHR9O1xuXHR9LFxuXG5cdG9uVmlld0NoYW5nZSAobmV4dFZpZXcpIHtcblx0XHRsYXN0U2VsZWN0ZWRUYWIgPSBuZXh0Vmlld1xuXG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRzZWxlY3RlZFRhYjogbmV4dFZpZXdcblx0XHR9KTtcblx0fSxcblxuXHRzZWxlY3RUYWIgKHZhbHVlKSB7XG5cdFx0bGV0IHZpZXdQcm9wcztcblxuXHRcdHRoaXMucmVmcy52bS50cmFuc2l0aW9uVG8odmFsdWUsIHtcblx0XHRcdHRyYW5zaXRpb246ICdpbnN0YW50Jyxcblx0XHRcdHZpZXdQcm9wczogdmlld1Byb3BzXG5cdFx0fSk7XG5cblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdHNlbGVjdGVkVGFiOiB2YWx1ZVxuXHRcdH0pXG5cdH0sXG5cblx0cmVuZGVyICgpIHtcblx0XHRsZXQgc2VsZWN0ZWRUYWIgPSB0aGlzLnN0YXRlLnNlbGVjdGVkVGFiXG5cdFx0bGV0IHNlbGVjdGVkVGFiU3BhbiA9IHNlbGVjdGVkVGFiXG5cblx0XHRpZiAoc2VsZWN0ZWRUYWIgPT09ICdsaXN0cycgfHwgc2VsZWN0ZWRUYWIgPT09ICdsaXN0LXNpbXBsZScgfHwgc2VsZWN0ZWRUYWIgPT09ICdsaXN0LWNvbXBsZXgnIHx8IHNlbGVjdGVkVGFiID09PSAnbGlzdC1kZXRhaWxzJykge1xuXHRcdFx0c2VsZWN0ZWRUYWJTcGFuID0gJ2xpc3RzJztcblx0XHR9XG5cblx0XHRpZiAoc2VsZWN0ZWRUYWIgPT09ICd0cmFuc2l0aW9ucycgfHwgc2VsZWN0ZWRUYWIgPT09ICd0cmFuc2l0aW9ucy10YXJnZXQnKSB7XG5cdFx0XHRzZWxlY3RlZFRhYlNwYW4gPSAndHJhbnNpdGlvbnMnO1xuXHRcdH1cblxuXHRcdHJldHVybiAoXG5cdFx0XHQ8Q29udGFpbmVyPlxuXHRcdFx0XHQ8Vmlld01hbmFnZXIgcmVmPVwidm1cIiBuYW1lPVwidGFic1wiIGRlZmF1bHRWaWV3PXtzZWxlY3RlZFRhYn0gb25WaWV3Q2hhbmdlPXt0aGlzLm9uVmlld0NoYW5nZX0+XG5cdFx0XHRcdFx0PFZpZXcgbmFtZT1cImxpc3RzXCIgY29tcG9uZW50PXtyZXF1aXJlKCcuL3ZpZXdzL2xpc3RzJyl9IC8+XG5cdFx0XHRcdFx0PFZpZXcgbmFtZT1cImxpc3Qtc2ltcGxlXCIgY29tcG9uZW50PXtyZXF1aXJlKCcuL3ZpZXdzL2xpc3Qtc2ltcGxlJyl9IC8+XG5cdFx0XHRcdFx0PFZpZXcgbmFtZT1cImxpc3QtY29tcGxleFwiIGNvbXBvbmVudD17cmVxdWlyZSgnLi92aWV3cy9saXN0LWNvbXBsZXgnKX0gLz5cblx0XHRcdFx0XHQ8VmlldyBuYW1lPVwibGlzdC1kZXRhaWxzXCIgY29tcG9uZW50PXtyZXF1aXJlKCcuL3ZpZXdzL2xpc3QtZGV0YWlscycpfSAvPlxuXHRcdFx0XHRcdDxWaWV3IG5hbWU9XCJmb3JtXCIgY29tcG9uZW50PXtyZXF1aXJlKCcuL3ZpZXdzL2Zvcm0nKX0gLz5cblx0XHRcdFx0XHQ8VmlldyBuYW1lPVwiY29udHJvbHNcIiBjb21wb25lbnQ9e3JlcXVpcmUoJy4vdmlld3MvY29udHJvbHMnKX0gLz5cblx0XHRcdFx0XHQ8VmlldyBuYW1lPVwidHJhbnNpdGlvbnNcIiBjb21wb25lbnQ9e3JlcXVpcmUoJy4vdmlld3MvdHJhbnNpdGlvbnMnKX0gLz5cblx0XHRcdFx0XHQ8VmlldyBuYW1lPVwidHJhbnNpdGlvbnMtdGFyZ2V0XCIgY29tcG9uZW50PXtyZXF1aXJlKCcuL3ZpZXdzL3RyYW5zaXRpb25zLXRhcmdldCcpfSAvPlxuXHRcdFx0XHQ8L1ZpZXdNYW5hZ2VyPlxuXHRcdFx0XHQ8VUkuVGFicy5OYXZpZ2F0b3I+XG5cdFx0XHRcdFx0PFVJLlRhYnMuVGFiIG9uVGFwPXt0aGlzLnNlbGVjdFRhYi5iaW5kKHRoaXMsICdsaXN0cycpfSBzZWxlY3RlZD17c2VsZWN0ZWRUYWJTcGFuID09PSAnbGlzdHMnfT5cblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzTmFtZT1cIlRhYnMtSWNvbiBUYWJzLUljb24tLWxpc3RzXCIgLz5cblx0XHRcdFx0XHRcdDxVSS5UYWJzLkxhYmVsPkxpc3RzPC9VSS5UYWJzLkxhYmVsPlxuXHRcdFx0XHRcdDwvVUkuVGFicy5UYWI+XG5cdFx0XHRcdFx0PFVJLlRhYnMuVGFiIG9uVGFwPXt0aGlzLnNlbGVjdFRhYi5iaW5kKHRoaXMsICdmb3JtJyl9IHNlbGVjdGVkPXtzZWxlY3RlZFRhYlNwYW4gPT09ICdmb3JtJ30+XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzc05hbWU9XCJUYWJzLUljb24gVGFicy1JY29uLS1mb3Jtc1wiIC8+XG5cdFx0XHRcdFx0XHQ8VUkuVGFicy5MYWJlbD5Gb3JtczwvVUkuVGFicy5MYWJlbD5cblx0XHRcdFx0XHQ8L1VJLlRhYnMuVGFiPlxuXHRcdFx0XHRcdDxVSS5UYWJzLlRhYiBvblRhcD17dGhpcy5zZWxlY3RUYWIuYmluZCh0aGlzLCAnY29udHJvbHMnKX0gc2VsZWN0ZWQ9e3NlbGVjdGVkVGFiU3BhbiA9PT0gJ2NvbnRyb2xzJ30+XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzc05hbWU9XCJUYWJzLUljb24gVGFicy1JY29uLS1jb250cm9sc1wiIC8+XG5cdFx0XHRcdFx0XHQ8VUkuVGFicy5MYWJlbD5Db250cm9sczwvVUkuVGFicy5MYWJlbD5cblx0XHRcdFx0XHQ8L1VJLlRhYnMuVGFiPlxuXHRcdFx0XHRcdDxVSS5UYWJzLlRhYiBvblRhcD17dGhpcy5zZWxlY3RUYWIuYmluZCh0aGlzLCAndHJhbnNpdGlvbnMnKX0gc2VsZWN0ZWQ9e3NlbGVjdGVkVGFiU3BhbiA9PT0gJ3RyYW5zaXRpb25zJ30+XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzc05hbWU9XCJUYWJzLUljb24gVGFicy1JY29uLS10cmFuc2l0aW9uc1wiIC8+XG5cdFx0XHRcdFx0XHQ8VUkuVGFicy5MYWJlbD5UcmFuc2l0aW9uczwvVUkuVGFicy5MYWJlbD5cblx0XHRcdFx0XHQ8L1VJLlRhYnMuVGFiPlxuXHRcdFx0XHQ8L1VJLlRhYnMuTmF2aWdhdG9yPlxuXHRcdFx0PC9Db250YWluZXI+XG5cdFx0KTtcblx0fVxufSk7XG5cbmZ1bmN0aW9uIHN0YXJ0QXBwICgpIHtcblx0aWYgKHdpbmRvdy5TdGF0dXNCYXIpIHtcblx0XHR3aW5kb3cuU3RhdHVzQmFyLnN0eWxlRGVmYXVsdCgpO1xuXHR9XG5cdFJlYWN0RE9NLnJlbmRlcig8QXBwIC8+LCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXBwJykpO1xufVxuXG5pZiAoIXdpbmRvdy5jb3Jkb3ZhKSB7XG5cdHN0YXJ0QXBwKCk7XG59IGVsc2Uge1xuXHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2VyZWFkeScsIHN0YXJ0QXBwLCBmYWxzZSk7XG59XG4iLCJ2YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xuXG52YXIgYXN5bmMgPSByZXF1aXJlKCdhc3luYycpO1xudmFyIGh0dHBpZnkgPSByZXF1aXJlKCdodHRwaWZ5Jyk7XG5cbmNvbnN0IGFwaVVybCA9ICh3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgPT09ICdodHRwczonKSA/ICdodHRwczovL3JhbmRvbXVzZXIubWUvYXBpP25hdD1hdSZyZXN1bHRzPTE2JyA6ICdodHRwOi8vYXBpLnJhbmRvbXVzZXIubWUvP25hdD1hdSZyZXN1bHRzPTE2JztcblxuZnVuY3Rpb24gUGVvcGxlU3RvcmUgKCkge1xuXHRFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcblxuXHQvLyBpbml0aWFsaXplIGludGVybmFsIGNhY2hlXG5cdHZhciBzdG9yYWdlID0gdGhpcy5jYWNoZSA9IHtcblx0XHRwZW9wbGU6IFtdXG5cdH07XG5cdHZhciBzZWxmID0gdGhpcztcblxuXHQvLyBEaXNwYXRjaGVyc1xuXHR0aGlzLnN0YXJRdWV1ZSA9IGFzeW5jLnF1ZXVlKChkYXRhLCBjYWxsYmFjaykgPT4ge1xuXHRcdHZhciB7IGlkLCBzdGFycmVkIH0gPSBkYXRhO1xuXG5cdFx0Ly8gdXBkYXRlIGludGVybmFsIGRhdGFcblx0XHRzZWxmLmNhY2hlLnBlb3BsZVxuXHRcdFx0LmZpbHRlcihwZXJzb24gPT4gcGVyc29uLmlkID09PSBpZClcblx0XHRcdC5mb3JFYWNoKHBlcnNvbiA9PiBwZXJzb24uaXNTdGFycmVkID0gc3RhcnJlZCk7XG5cblx0XHQvLyBlbWl0IGV2ZW50c1xuXHRcdHNlbGYuZW1pdCgncGVvcGxlLXVwZGF0ZWQnLCBzdG9yYWdlLnBlb3BsZSk7XG5cblx0XHRjYWxsYmFjaygpO1xuXHR9LCAxKTtcblxuXHR0aGlzLnJlZnJlc2hRdWV1ZSA9IGFzeW5jLnF1ZXVlKChfLCBjYWxsYmFjaykgPT4ge1xuXHRcdC8vIHVwZGF0ZVxuXHRcdGh0dHBpZnkoe1xuXHRcdFx0bWV0aG9kOiAnR0VUJyxcblx0XHRcdHVybDogYXBpVXJsXG5cdFx0fSwgZnVuY3Rpb24gKGVyciwgcmVzKSB7XG5cdFx0XHRpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcblxuXHRcdFx0c3RvcmFnZS5wZW9wbGUgPSByZXMuYm9keS5yZXN1bHRzLm1hcChwID0+IHAudXNlcik7XG5cdFx0XHRcblx0XHRcdC8vIHBvc3QgcHJvY2VzcyBuZXcgZGF0YVxuXHRcdFx0c3RvcmFnZS5wZW9wbGUuZm9yRWFjaCgocGVyc29uLCBpKSA9PiB7XG5cdFx0XHRcdHBlcnNvbi5pZCA9IGk7XG5cdFx0XHRcdHBlcnNvbi5uYW1lLmZpcnN0ID0gcGVyc29uLm5hbWUuZmlyc3RbMF0udG9VcHBlckNhc2UoKSArIHBlcnNvbi5uYW1lLmZpcnN0LnNsaWNlKDEpO1xuXHRcdFx0XHRwZXJzb24ubmFtZS5sYXN0ID0gcGVyc29uLm5hbWUubGFzdFswXS50b1VwcGVyQ2FzZSgpICsgcGVyc29uLm5hbWUubGFzdC5zbGljZSgxKTtcblx0XHRcdFx0cGVyc29uLm5hbWUuaW5pdGlhbHMgPSBwZXJzb24ubmFtZS5maXJzdFswXSArIHBlcnNvbi5uYW1lLmxhc3RbMF07XG5cdFx0XHRcdHBlcnNvbi5uYW1lLmZ1bGwgPSBwZXJzb24ubmFtZS5maXJzdCArICcgJyArIHBlcnNvbi5uYW1lLmxhc3Q7XG5cdFx0XHRcdHBlcnNvbi5jYXRlZ29yeSA9IE1hdGgucmFuZG9tKCkgPiAwLjUgPyAnQScgOiAnQic7XG5cdFx0XHRcdHBlcnNvbi5naXRodWIgPSBwZXJzb24ubmFtZS5maXJzdC50b0xvd2VyQ2FzZSgpICsgcGVyc29uLm5hbWUubGFzdC50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRwZXJzb24ucGljdHVyZSA9IHBlcnNvbi5waWN0dXJlLm1lZGl1bTtcblx0XHRcdFx0cGVyc29uLnR3aXR0ZXIgPSAnQCcgKyBwZXJzb24ubmFtZS5maXJzdC50b0xvd2VyQ2FzZSgpICsgKE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzIpLnNsaWNlKDIsIDUpKTtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyBlbWl0IGV2ZW50c1xuXHRcdFx0c2VsZi5lbWl0KCdwZW9wbGUtdXBkYXRlZCcsIHN0b3JhZ2UucGVvcGxlKTtcblx0XHRcdHNlbGYuZW1pdCgncmVmcmVzaCcpO1xuXG5cdFx0XHRjYWxsYmFjayhudWxsLCBzdG9yYWdlLnBlb3BsZSk7XG5cdFx0fSk7XG5cdH0sIDEpO1xuXG5cdC8vIHJlZnJlc2ggaW1tZWRpYXRlbHlcblx0dGhpcy5yZWZyZXNoKCk7XG59XG5cbk9iamVjdC5hc3NpZ24oUGVvcGxlU3RvcmUucHJvdG90eXBlLCBFdmVudEVtaXR0ZXIucHJvdG90eXBlKTtcblxuLy8gSW50ZW50c1xuUGVvcGxlU3RvcmUucHJvdG90eXBlLnJlZnJlc2ggPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcblx0dGhpcy5yZWZyZXNoUXVldWUucHVzaChudWxsLCBjYWxsYmFjayk7XG59XG5cblBlb3BsZVN0b3JlLnByb3RvdHlwZS5zdGFyID0gZnVuY3Rpb24gKHsgaWQgfSwgc3RhcnJlZCwgY2FsbGJhY2spIHtcblx0dGhpcy5zdGFyUXVldWUucHVzaCh7IGlkLCBzdGFycmVkIH0sIGNhbGxiYWNrKTtcbn1cblxuLy8gR2V0dGVyc1xuUGVvcGxlU3RvcmUucHJvdG90eXBlLmdldFBlb3BsZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuY2FjaGUucGVvcGxlOyB9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBlb3BsZVN0b3JlO1xuIiwiaW1wb3J0IENvbnRhaW5lciBmcm9tICdyZWFjdC1jb250YWluZXInO1xuaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCBUYXBwYWJsZSBmcm9tICdyZWFjdC10YXBwYWJsZSc7XG5pbXBvcnQgVGltZXJzIGZyb20gJ3JlYWN0LXRpbWVycyc7XG5pbXBvcnQgeyBMaW5rLCBVSSB9IGZyb20gJ3RvdWNoc3RvbmVqcyc7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRtaXhpbnM6IFtUaW1lcnNdLFxuXHRzdGF0aWNzOiB7XG5cdFx0bmF2aWdhdGlvbkJhcjogJ21haW4nLFxuXHRcdGdldE5hdmlnYXRpb24gKCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0dGl0bGU6ICdDb250cm9scydcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cdFxuXHRnZXRJbml0aWFsU3RhdGUgKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRhbGVydGJhcjoge1xuXHRcdFx0XHR2aXNpYmxlOiBmYWxzZSxcblx0XHRcdFx0dHlwZTogJycsXG5cdFx0XHRcdHRleHQ6ICcnXG5cdFx0XHR9LFxuXHRcdFx0cG9wdXA6IHtcblx0XHRcdFx0dmlzaWJsZTogZmFsc2Vcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cdFxuXHRzaG93TG9hZGluZ1BvcHVwICgpIHtcblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdHBvcHVwOiB7XG5cdFx0XHRcdHZpc2libGU6IHRydWUsXG5cdFx0XHRcdGxvYWRpbmc6IHRydWUsXG5cdFx0XHRcdGhlYWRlcjogJ0xvYWRpbmcnLFxuXHRcdFx0XHRpY29uTmFtZTogJ2lvbi1sb2FkLWMnLFxuXHRcdFx0XHRpY29uVHlwZTogJ2RlZmF1bHQnXG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLnNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRcdHBvcHVwOiB7XG5cdFx0XHRcdFx0dmlzaWJsZTogdHJ1ZSxcblx0XHRcdFx0XHRsb2FkaW5nOiBmYWxzZSxcblx0XHRcdFx0XHRoZWFkZXI6ICdEb25lIScsXG5cdFx0XHRcdFx0aWNvbk5hbWU6ICdpb24taW9zLWNoZWNrbWFyaycsXG5cdFx0XHRcdFx0aWNvblR5cGU6ICdzdWNjZXNzJ1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LCAyMDAwKTtcblxuXHRcdHRoaXMuc2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdFx0cG9wdXA6IHtcblx0XHRcdFx0XHR2aXNpYmxlOiBmYWxzZVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LCAzMDAwKTtcblx0fSxcblx0XG5cdHNob3dBbGVydGJhciAodHlwZSwgdGV4dCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0YWxlcnRiYXI6IHtcblx0XHRcdFx0dmlzaWJsZTogdHJ1ZSxcblx0XHRcdFx0dHlwZTogdHlwZSxcblx0XHRcdFx0dGV4dDogdGV4dFxuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5zZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0XHRhbGVydGJhcjoge1xuXHRcdFx0XHRcdHZpc2libGU6IGZhbHNlXG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIDIwMDApO1xuXHR9LFxuXHRcblx0aGFuZGxlTW9kZUNoYW5nZSAobmV3TW9kZSkge1xuXHRcdGxldCBzZWxlY3RlZEl0ZW0gPSBuZXdNb2RlO1xuXG5cdFx0aWYgKHRoaXMuc3RhdGUuc2VsZWN0ZWRNb2RlID09PSBuZXdNb2RlKSB7XG5cdFx0XHRzZWxlY3RlZEl0ZW0gPSBudWxsO1xuXHRcdH1cblxuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0c2VsZWN0ZWRNb2RlOiBzZWxlY3RlZEl0ZW1cblx0XHR9KTtcblxuXHR9LFxuXHRcblx0cmVuZGVyICgpIHtcblx0XHRsZXQgeyBhbGVydGJhciB9ID0gdGhpcy5zdGF0ZTtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PENvbnRhaW5lciBzY3JvbGxhYmxlPlxuXHRcdFx0XHQ8VUkuQWxlcnRiYXIgdHlwZT17YWxlcnRiYXIudHlwZSB8fCAnZGVmYXVsdCd9IHZpc2libGU9e2FsZXJ0YmFyLnZpc2libGV9IGFuaW1hdGVkPnthbGVydGJhci50ZXh0IHx8ICcnfTwvVUkuQWxlcnRiYXI+XG5cdFx0XHRcdDxVSS5Hcm91cCBoYXNUb3BHdXR0ZXI+XG5cdFx0XHRcdFx0PFVJLkdyb3VwSGVhZGVyPlNlZ21lbnRlZCBDb250cm9sPC9VSS5Hcm91cEhlYWRlcj5cblx0XHRcdFx0XHQ8VUkuU2VnbWVudGVkQ29udHJvbCB2YWx1ZT17dGhpcy5zdGF0ZS5zZWxlY3RlZE1vZGV9IG9uQ2hhbmdlPXt0aGlzLmhhbmRsZU1vZGVDaGFuZ2V9IGhhc0d1dHRlciBvcHRpb25zPXtbXG5cdFx0XHRcdFx0XHR7IGxhYmVsOiAnT25lJywgdmFsdWU6ICdvbmUnIH0sXG5cdFx0XHRcdFx0XHR7IGxhYmVsOiAnVHdvJywgdmFsdWU6ICd0d28nIH0sXG5cdFx0XHRcdFx0XHR7IGxhYmVsOiAnVGhyZWUnLCB2YWx1ZTogJ3RocmVlJyB9LFxuXHRcdFx0XHRcdFx0eyBsYWJlbDogJ0ZvdXInLCB2YWx1ZTogJ2ZvdXInIH1cblx0XHRcdFx0XHRdfSAvPlxuXHRcdFx0XHQ8L1VJLkdyb3VwPlxuXG5cdFx0XHRcdDxVSS5Hcm91cD5cblx0XHRcdFx0XHQ8VUkuR3JvdXBIZWFkZXI+QWxlcnQgQmFyPC9VSS5Hcm91cEhlYWRlcj5cblx0XHRcdFx0XHQ8VUkuQnV0dG9uR3JvdXA+XG5cdFx0XHRcdFx0XHQ8VUkuQnV0dG9uIHR5cGU9XCJwcmltYXJ5XCIgb25UYXA9e3RoaXMuc2hvd0FsZXJ0YmFyLmJpbmQodGhpcywgJ2RhbmdlcicsICdObyBJbnRlcm5ldCBDb25uZWN0aW9uJyl9IGRpc2FibGVkPXt0aGlzLnN0YXRlLmFsZXJ0YmFyLnZpc2libGV9PlxuXHRcdFx0XHRcdFx0XHREYW5nZXJcblx0XHRcdFx0XHRcdDwvVUkuQnV0dG9uPlxuXHRcdFx0XHRcdFx0PFVJLkJ1dHRvbiB0eXBlPVwicHJpbWFyeVwiIG9uVGFwPXt0aGlzLnNob3dBbGVydGJhci5iaW5kKHRoaXMsICd3YXJuaW5nJywgJ0Nvbm5lY3RpbmcuLi4nKX0gZGlzYWJsZWQ9e3RoaXMuc3RhdGUuYWxlcnRiYXIudmlzaWJsZX0+XG5cdFx0XHRcdFx0XHRcdFdhcm5pbmdcblx0XHRcdFx0XHRcdDwvVUkuQnV0dG9uPlxuXHRcdFx0XHRcdFx0PFVJLkJ1dHRvbiB0eXBlPVwicHJpbWFyeVwiIG9uVGFwPXt0aGlzLnNob3dBbGVydGJhci5iaW5kKHRoaXMsICdzdWNjZXNzJywgJ0Nvbm5lY3RlZCcpfSBkaXNhYmxlZD17dGhpcy5zdGF0ZS5hbGVydGJhci52aXNpYmxlfT5cblx0XHRcdFx0XHRcdFx0U3VjY2Vzc1xuXHRcdFx0XHRcdFx0PC9VSS5CdXR0b24+XG5cdFx0XHRcdFx0PC9VSS5CdXR0b25Hcm91cD5cblx0XHRcdFx0PC9VSS5Hcm91cD5cblx0XHRcdFx0PFVJLkdyb3VwPlxuXHRcdFx0XHRcdDxVSS5Hcm91cEhlYWRlcj5Qb3B1cDwvVUkuR3JvdXBIZWFkZXI+XG5cdFx0XHRcdFx0PFVJLkJ1dHRvbiB0eXBlPVwicHJpbWFyeVwiIG9uVGFwPXt0aGlzLnNob3dMb2FkaW5nUG9wdXB9IGRpc2FibGVkPXt0aGlzLnN0YXRlLnBvcHVwLnZpc2libGV9PlxuXHRcdFx0XHRcdFx0U2hvdyBQb3B1cFxuXHRcdFx0XHRcdDwvVUkuQnV0dG9uPlxuXHRcdFx0XHQ8L1VJLkdyb3VwPlxuXHRcdFx0XHQ8VUkuR3JvdXA+XG5cdFx0XHRcdFx0PFVJLkdyb3VwSGVhZGVyPkFwcGxpY2F0aW9uIFN0YXRlPC9VSS5Hcm91cEhlYWRlcj5cblx0XHRcdFx0XHQ8VUkuR3JvdXBCb2R5PlxuXHRcdFx0XHRcdFx0PExpbmsgdG89XCJ0YWJzOm5vbi1leGlzdGVudFwiIHRyYW5zaXRpb249XCJzaG93LWZyb20tcmlnaHRcIj5cblx0XHRcdFx0XHRcdFx0PFVJLkl0ZW0gc2hvd0Rpc2Nsb3N1cmVBcnJvdz5cblx0XHRcdFx0XHRcdFx0XHQ8VUkuSXRlbUlubmVyPkludmFsaWQgVmlldzwvVUkuSXRlbUlubmVyPlxuXHRcdFx0XHRcdFx0XHQ8L1VJLkl0ZW0+XG5cdFx0XHRcdFx0XHQ8L0xpbms+XG5cdFx0XHRcdFx0PC9VSS5Hcm91cEJvZHk+XG5cdFx0XHRcdDwvVUkuR3JvdXA+XG5cblx0XHRcdFx0PFVJLlBvcHVwIHZpc2libGU9e3RoaXMuc3RhdGUucG9wdXAudmlzaWJsZX0+XG5cdFx0XHRcdFx0PFVJLlBvcHVwSWNvbiBuYW1lPXt0aGlzLnN0YXRlLnBvcHVwLmljb25OYW1lfSB0eXBlPXt0aGlzLnN0YXRlLnBvcHVwLmljb25UeXBlfSBzcGlubmluZz17dGhpcy5zdGF0ZS5wb3B1cC5sb2FkaW5nfSAvPlx0XHRcblx0XHRcdFx0XHQ8ZGl2PjxzdHJvbmc+e3RoaXMuc3RhdGUucG9wdXAuaGVhZGVyfTwvc3Ryb25nPjwvZGl2PlxuXHRcdFx0XHQ8L1VJLlBvcHVwPlxuXHRcdFx0PC9Db250YWluZXI+XG5cdFx0KTtcblx0fVxufSk7XG4iLCJpbXBvcnQgQ29udGFpbmVyIGZyb20gJ3JlYWN0LWNvbnRhaW5lcic7XG5pbXBvcnQgZGlhbG9ncyBmcm9tICdjb3Jkb3ZhLWRpYWxvZ3MnO1xuaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCBUYXBwYWJsZSBmcm9tICdyZWFjdC10YXBwYWJsZSc7XG5pbXBvcnQgeyBVSSB9IGZyb20gJ3RvdWNoc3RvbmVqcyc7XG5cbmNvbnN0IHNjcm9sbGFibGUgPSBDb250YWluZXIuaW5pdFNjcm9sbGFibGUoKTtcblxuLy8gaHRtbDUgaW5wdXQgdHlwZXMgZm9yIHRlc3Rpbmdcbi8vIG9taXR0ZWQ6IGJ1dHRvbiwgY2hlY2tib3gsIHJhZGlvLCBpbWFnZSwgaGlkZGVuLCByZXNldCwgc3VibWl0XG5jb25zdCBIVE1MNV9JTlBVVF9UWVBFUyA9IFsnY29sb3InLCAnZGF0ZScsICdkYXRldGltZScsICdkYXRldGltZS1sb2NhbCcsICdlbWFpbCcsICdmaWxlJywgJ21vbnRoJywgJ251bWJlcicsICdwYXNzd29yZCcsICdyYW5nZScsICdzZWFyY2gnLCAndGVsJywgJ3RleHQnLCAndGltZScsICd1cmwnLCAnd2VlayddO1xuY29uc3QgRkxBVk9VUlMgPSBbXG5cdHsgbGFiZWw6ICdWYW5pbGxhJywgICAgdmFsdWU6ICd2YW5pbGxhJyB9LFxuXHR7IGxhYmVsOiAnQ2hvY29sYXRlJywgIHZhbHVlOiAnY2hvY29sYXRlJyB9LFxuXHR7IGxhYmVsOiAnQ2FyYW1lbCcsICAgIHZhbHVlOiAnY2FyYW1lbCcgfSxcblx0eyBsYWJlbDogJ1N0cmF3YmVycnknLCB2YWx1ZTogJ3N0cmF3YmVycnknIH1cbl07XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRzdGF0aWNzOiB7XG5cdFx0bmF2aWdhdGlvbkJhcjogJ21haW4nLFxuXHRcdGdldE5hdmlnYXRpb24gKCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0dGl0bGU6ICdGb3Jtcydcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cdFxuXHRnZXRJbml0aWFsU3RhdGUgKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRmbGF2b3VyTGFiZWxTZWxlY3Q6ICdjaG9jb2xhdGUnLFxuXHRcdFx0Zmxhdm91clJhZGlvTGlzdDogJ2Nob2NvbGF0ZScsXG5cdFx0XHRzd2l0Y2hWYWx1ZTogdHJ1ZVxuXHRcdH1cblx0fSxcblx0XG5cdGhhbmRsZVJhZGlvTGlzdENoYW5nZSAoa2V5LCBuZXdWYWx1ZSkge1xuXHRcdGNvbnNvbGUubG9nKCdoYW5kbGVGbGF2b3VyQ2hhbmdlOicsIGtleSwgbmV3VmFsdWUpO1xuXHRcdGxldCBuZXdTdGF0ZSA9IHt9O1xuXHRcdG5ld1N0YXRlW2tleV0gPSBuZXdWYWx1ZTtcblxuXHRcdHRoaXMuc2V0U3RhdGUobmV3U3RhdGUpO1xuXHR9LFxuXHRcblx0aGFuZGxlTGFiZWxTZWxlY3RDaGFuZ2UgKGtleSwgZXZlbnQpIHtcblx0XHRjb25zb2xlLmxvZygnaGFuZGxlRmxhdm91ckNoYW5nZTonLCBrZXksIGV2ZW50LnRhcmdldC52YWx1ZSk7XG5cdFx0bGV0IG5ld1N0YXRlID0ge307XG5cdFx0bmV3U3RhdGVba2V5XSA9IGV2ZW50LnRhcmdldC52YWx1ZTtcblxuXHRcdHRoaXMuc2V0U3RhdGUobmV3U3RhdGUpO1xuXHR9LFxuXHRcblx0aGFuZGxlU3dpdGNoIChrZXksIGV2ZW50KSB7XG5cdFx0bGV0IG5ld1N0YXRlID0ge307XG5cdFx0bmV3U3RhdGVba2V5XSA9ICF0aGlzLnN0YXRlW2tleV07XG5cblx0XHR0aGlzLnNldFN0YXRlKG5ld1N0YXRlKTtcblx0fSxcblx0XG5cdGFsZXJ0IChtZXNzYWdlKSB7XG5cdFx0ZGlhbG9ncy5hbGVydChtZXNzYWdlLCBmdW5jdGlvbigpIHt9LCBudWxsKVxuXHR9LFxuXHRcblx0Ly8gdXNlZCBmb3IgdGVzdGluZ1xuXHRyZW5kZXJJbnB1dFR5cGVzICgpIHtcblx0XHRyZXR1cm4gSFRNTDVfSU5QVVRfVFlQRVMubWFwKHR5cGUgPT4ge1xuXHRcdFx0cmV0dXJuIDxVSS5MYWJlbElucHV0IGtleT17dHlwZX0gdHlwZT17dHlwZX0gbGFiZWw9e3R5cGV9IHBsYWNlaG9sZGVyPXt0eXBlfSAvPjtcblx0XHR9KTtcblx0fSxcblxuXHRzaG93RGF0ZVBpY2tlciAoKSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7ZGF0ZVBpY2tlcjogdHJ1ZX0pO1xuXHR9LFxuXG5cdGhhbmRsZURhdGVQaWNrZXJDaGFuZ2UgKGQpIHtcblx0XHR0aGlzLnNldFN0YXRlKHtkYXRlUGlja2VyOiBmYWxzZSwgZGF0ZTogZH0pO1xuXHR9LFxuXG5cdGZvcm1hdERhdGUgKGRhdGUpIHtcblx0XHRpZiAoZGF0ZSkge1xuXHRcdFx0cmV0dXJuIGRhdGUuZ2V0RnVsbFllYXIoKSArICctJyArIChkYXRlLmdldE1vbnRoKCkgKyAxKSArICctJyArIGRhdGUuZ2V0RGF0ZSgpO1xuXHRcdH1cblx0fSxcblx0XG5cdHJlbmRlciAoKSB7XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PENvbnRhaW5lciBmaWxsPlxuXHRcdFx0XHQ8Q29udGFpbmVyIHNjcm9sbGFibGU9e3Njcm9sbGFibGV9PlxuXHRcdFx0XHRcdHsvKjxVSS5Hcm91cD5cblx0XHRcdFx0XHRcdDxVSS5Hcm91cEhlYWRlcj5JbnB1dCBUeXBlIEV4cGVyaW1lbnQ8L1VJLkdyb3VwSGVhZGVyPlxuXHRcdFx0XHRcdFx0PFVJLkdyb3VwQm9keT5cblx0XHRcdFx0XHRcdFx0e3RoaXMucmVuZGVySW5wdXRUeXBlcygpfVxuXHRcdFx0XHRcdFx0PC9VSS5Hcm91cEJvZHk+XG5cdFx0XHRcdFx0PC9VSS5Hcm91cD4qL31cblx0XHRcdFx0XHQ8VUkuR3JvdXA+XG5cdFx0XHRcdFx0XHQ8VUkuR3JvdXBIZWFkZXI+Q2hlY2tib3g8L1VJLkdyb3VwSGVhZGVyPlxuXHRcdFx0XHRcdFx0PFVJLkdyb3VwQm9keT5cblx0XHRcdFx0XHRcdFx0PFVJLkl0ZW0+XG5cdFx0XHRcdFx0XHRcdFx0PFVJLkl0ZW1Jbm5lcj5cblx0XHRcdFx0XHRcdFx0XHRcdDxVSS5GaWVsZExhYmVsPlN3aXRjaDwvVUkuRmllbGRMYWJlbD5cblx0XHRcdFx0XHRcdFx0XHRcdDxVSS5Td2l0Y2ggb25UYXA9e3RoaXMuaGFuZGxlU3dpdGNoLmJpbmQodGhpcywgJ3N3aXRjaFZhbHVlJyl9IG9uPXt0aGlzLnN0YXRlLnN3aXRjaFZhbHVlfSAvPlxuXHRcdFx0XHRcdFx0XHRcdDwvVUkuSXRlbUlubmVyPlxuXHRcdFx0XHRcdFx0XHQ8L1VJLkl0ZW0+XG5cdFx0XHRcdFx0XHRcdDxVSS5JdGVtPlxuXHRcdFx0XHRcdFx0XHRcdDxVSS5JdGVtSW5uZXI+XG5cdFx0XHRcdFx0XHRcdFx0XHQ8VUkuRmllbGRMYWJlbD5EaXNhYmxlZDwvVUkuRmllbGRMYWJlbD5cblx0XHRcdFx0XHRcdFx0XHRcdDxVSS5Td2l0Y2ggZGlzYWJsZWQgLz5cblx0XHRcdFx0XHRcdFx0XHQ8L1VJLkl0ZW1Jbm5lcj5cblx0XHRcdFx0XHRcdFx0PC9VSS5JdGVtPlxuXHRcdFx0XHRcdFx0PC9VSS5Hcm91cEJvZHk+XG5cdFx0XHRcdFx0PC9VSS5Hcm91cD5cblx0XHRcdFx0XHQ8VUkuR3JvdXA+XG5cdFx0XHRcdFx0XHQ8VUkuR3JvdXBIZWFkZXI+UmFkaW88L1VJLkdyb3VwSGVhZGVyPlxuXHRcdFx0XHRcdFx0PFVJLkdyb3VwQm9keT5cblx0XHRcdFx0XHRcdFx0PFVJLlJhZGlvTGlzdCB2YWx1ZT17dGhpcy5zdGF0ZS5mbGF2b3VyUmFkaW9MaXN0fSBvbkNoYW5nZT17dGhpcy5oYW5kbGVSYWRpb0xpc3RDaGFuZ2UuYmluZCh0aGlzLCAnZmxhdm91clJhZGlvTGlzdCcpfSBvcHRpb25zPXtGTEFWT1VSU30gLz5cblx0XHRcdFx0XHRcdDwvVUkuR3JvdXBCb2R5PlxuXHRcdFx0XHRcdDwvVUkuR3JvdXA+XG5cdFx0XHRcdFx0PFVJLkdyb3VwPlxuXHRcdFx0XHRcdFx0PFVJLkdyb3VwSGVhZGVyPklucHV0czwvVUkuR3JvdXBIZWFkZXI+XG5cdFx0XHRcdFx0XHQ8VUkuR3JvdXBCb2R5PlxuXHRcdFx0XHRcdFx0XHQ8VUkuSW5wdXQgcGxhY2Vob2xkZXI9XCJEZWZhdWx0XCIgLz5cblx0XHRcdFx0XHRcdFx0PFVJLklucHV0IGRlZmF1bHRWYWx1ZT1cIldpdGggVmFsdWVcIiBwbGFjZWhvbGRlcj1cIlBsYWNlaG9sZGVyXCIgLz5cblx0XHRcdFx0XHRcdFx0PFVJLlRleHRhcmVhIGRlZmF1bHRWYWx1ZT1cIkxvbmd0ZXh0IGlzIGdvb2QgZm9yIGJpb3MgZXRjLlwiIHBsYWNlaG9sZGVyPVwiTG9uZ3RleHRcIiAvPlxuXHRcdFx0XHRcdFx0PC9VSS5Hcm91cEJvZHk+XG5cdFx0XHRcdFx0PC9VSS5Hcm91cD5cblx0XHRcdFx0XHQ8VUkuR3JvdXA+XG5cdFx0XHRcdFx0XHQ8VUkuR3JvdXBIZWFkZXI+TGFiZWxsZWQgSW5wdXRzPC9VSS5Hcm91cEhlYWRlcj5cblx0XHRcdFx0XHRcdDxVSS5Hcm91cEJvZHk+XG5cdFx0XHRcdFx0XHRcdDxVSS5MYWJlbElucHV0IHR5cGU9XCJlbWFpbFwiIGxhYmVsPVwiRW1haWxcIiAgIHBsYWNlaG9sZGVyPVwieW91ci5uYW1lQGV4YW1wbGUuY29tXCIgLz5cblx0XHRcdFx0XHRcdFx0PFRhcHBhYmxlIGNvbXBvbmVudD1cImxhYmVsXCIgb25UYXA9e3RoaXMuc2hvd0RhdGVQaWNrZXJ9PlxuXHRcdFx0XHRcdFx0XHRcdDxVSS5MYWJlbFZhbHVlIGxhYmVsPVwiRGF0ZVwiIHZhbHVlPXt0aGlzLmZvcm1hdERhdGUodGhpcy5zdGF0ZS5kYXRlKX0gcGxhY2Vob2xkZXI9XCJTZWxlY3QgYSBkYXRlXCIgLz5cblx0XHRcdFx0XHRcdFx0PC9UYXBwYWJsZT5cblx0XHRcdFx0XHRcdFx0PFVJLkxhYmVsSW5wdXQgdHlwZT1cInVybFwiICAgbGFiZWw9XCJVUkxcIiAgICAgcGxhY2Vob2xkZXI9XCJodHRwOi8vd3d3LnlvdXJ3ZWJzaXRlLmNvbVwiIC8+XG5cdFx0XHRcdFx0XHRcdDxVSS5MYWJlbElucHV0IG5vZWRpdCAgICAgICBsYWJlbD1cIk5vIEVkaXRcIiBkZWZhdWx0VmFsdWU9XCJVbi1lZGl0YWJsZSwgc2Nyb2xsYWJsZSwgc2VsZWN0YWJsZSBjb250ZW50XCIgLz5cblx0XHRcdFx0XHRcdFx0PFVJLkxhYmVsU2VsZWN0IGxhYmVsPVwiRmxhdm91clwiIHZhbHVlPXt0aGlzLnN0YXRlLmZsYXZvdXJMYWJlbFNlbGVjdH0gb25DaGFuZ2U9e3RoaXMuaGFuZGxlTGFiZWxTZWxlY3RDaGFuZ2UuYmluZCh0aGlzLCAnZmxhdm91ckxhYmVsU2VsZWN0Jyl9IG9wdGlvbnM9e0ZMQVZPVVJTfSAvPlxuXHRcdFx0XHRcdFx0PC9VSS5Hcm91cEJvZHk+XG5cdFx0XHRcdFx0PC9VSS5Hcm91cD5cblx0XHRcdFx0XHQ8VUkuQnV0dG9uIHR5cGU9XCJwcmltYXJ5XCIgb25UYXA9e3RoaXMuYWxlcnQuYmluZCh0aGlzLCAnWW91IGNsaWNrZWQgdGhlIFByaW1hcnkgQnV0dG9uJyl9PlxuXHRcdFx0XHRcdFx0UHJpbWFyeSBCdXR0b25cblx0XHRcdFx0XHQ8L1VJLkJ1dHRvbj5cblx0XHRcdFx0XHQ8VUkuQnV0dG9uIG9uVGFwPXt0aGlzLmFsZXJ0LmJpbmQodGhpcywgJ1lvdSBjbGlja2VkIHRoZSBEZWZhdWx0IEJ1dHRvbicpfT5cblx0XHRcdFx0XHRcdERlZmF1bHQgQnV0dG9uXG5cdFx0XHRcdFx0PC9VSS5CdXR0b24+XG5cdFx0XHRcdFx0PFVJLkJ1dHRvbiB0eXBlPVwiZGFuZ2VyXCIgb25UYXA9e3RoaXMuYWxlcnQuYmluZCh0aGlzLCAnWW91IGNsaWNrZWQgdGhlIERhbmdlciBCdXR0b24nKX0+XG5cdFx0XHRcdFx0XHREYW5nZXIgQnV0dG9uXG5cdFx0XHRcdFx0PC9VSS5CdXR0b24+XG5cdFx0XHRcdFx0PFVJLkJ1dHRvbiB0eXBlPVwiZGFuZ2VyXCIgb25UYXA9e3RoaXMuYWxlcnQuYmluZCh0aGlzLCAnWW91IGNsaWNrZWQgdGhlIERhbmdlciBCdXR0b24nKX0gZGlzYWJsZWQ+XG5cdFx0XHRcdFx0XHREaXNhYmxlZCBCdXR0b25cblx0XHRcdFx0XHQ8L1VJLkJ1dHRvbj5cblx0XHRcdFx0PC9Db250YWluZXI+XG5cdFx0XHRcdDxVSS5EYXRlUGlja2VyUG9wdXAgdmlzaWJsZT17dGhpcy5zdGF0ZS5kYXRlUGlja2VyfSBkYXRlPXt0aGlzLnN0YXRlLmRhdGV9IG9uQ2hhbmdlPXt0aGlzLmhhbmRsZURhdGVQaWNrZXJDaGFuZ2V9Lz5cblx0XHRcdDwvQ29udGFpbmVyPlxuXHRcdCk7XG5cdH1cbn0pO1xuIiwiaW1wb3J0IENvbnRhaW5lciBmcm9tICdyZWFjdC1jb250YWluZXInO1xuaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCBTZW50cnkgZnJvbSAncmVhY3Qtc2VudHJ5JztcbmltcG9ydCBUYXBwYWJsZSBmcm9tICdyZWFjdC10YXBwYWJsZSc7XG5pbXBvcnQgeyBMaW5rLCBVSSB9IGZyb20gJ3RvdWNoc3RvbmVqcyc7XG5cbnZhciBzY3JvbGxhYmxlID0gQ29udGFpbmVyLmluaXRTY3JvbGxhYmxlKCk7XG5cbnZhciBDb21wbGV4TGlua0l0ZW0gPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGNvbnRleHRUeXBlczogeyBwZW9wbGVTdG9yZTogUmVhY3QuUHJvcFR5cGVzLm9iamVjdC5pc1JlcXVpcmVkIH0sXG5cblx0dG9nZ2xlU3RhciAoKSB7XG5cdFx0bGV0IHBlcnNvbiA9IHRoaXMucHJvcHMucGVyc29uXG5cblx0XHR0aGlzLmNvbnRleHQucGVvcGxlU3RvcmUuc3RhcihwZXJzb24sICFwZXJzb24uaXNTdGFycmVkKVxuXHR9LFxuXG5cdHJlbmRlciAoKSB7XG5cdFx0bGV0IHBlcnNvbiA9IHRoaXMucHJvcHMucGVyc29uO1xuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxMaW5rIHRvPVwidGFiczpsaXN0LWRldGFpbHNcIiB0cmFuc2l0aW9uPVwic2hvdy1mcm9tLXJpZ2h0XCIgdmlld1Byb3BzPXt7IHBlcnNvbjogcGVyc29uLCBwcmV2VmlldzogJ2xpc3QtY29tcGxleCcgfX0+XG5cdFx0XHRcdDxVSS5JdGVtPlxuXHRcdFx0XHRcdDxVSS5JdGVtTWVkaWEgYXZhdGFyPXtwZXJzb24ucGljdHVyZX0gYXZhdGFySW5pdGlhbHM9e3BlcnNvbi5pbml0aWFsc30gLz5cblx0XHRcdFx0XHQ8VUkuSXRlbUlubmVyPlxuXHRcdFx0XHRcdFx0PFVJLkl0ZW1Db250ZW50PlxuXHRcdFx0XHRcdFx0XHQ8VUkuSXRlbVRpdGxlPntwZXJzb24ubmFtZS5mdWxsfTwvVUkuSXRlbVRpdGxlPlxuXHRcdFx0XHRcdFx0XHQ8VUkuSXRlbVN1YlRpdGxlPntwZXJzb24uZW1haWwgfHwgJyd9PC9VSS5JdGVtU3ViVGl0bGU+XG5cdFx0XHRcdFx0XHQ8L1VJLkl0ZW1Db250ZW50PlxuXHRcdFx0XHRcdFx0PFRhcHBhYmxlIG9uVGFwPXt0aGlzLnRvZ2dsZVN0YXJ9IHN0b3BQcm9wYWdhdGlvbj5cblx0XHRcdFx0XHRcdFx0PFVJLkl0ZW1Ob3RlIGljb249e3BlcnNvbi5pc1N0YXJyZWQgPyAnaW9uLWlvcy1zdGFyJyA6ICdpb24taW9zLXN0YXItb3V0bGluZSd9IHR5cGU9e3BlcnNvbi5pc1N0YXJyZWQgPyAnd2FybmluZycgOiAnZGVmYXVsdCd9IGNsYXNzTmFtZT1cImlvbi1sZ1wiIC8+XG5cdFx0XHRcdFx0XHQ8L1RhcHBhYmxlPlxuXHRcdFx0XHRcdDwvVUkuSXRlbUlubmVyPlxuXHRcdFx0XHQ8L1VJLkl0ZW0+XG5cdFx0XHQ8L0xpbms+XG5cdFx0KTtcblx0fVxufSk7XG5cbi8vIEZJWE1FOiB0aGlzIGJpdCBpcyBnbG9iYWwgYW5kIGhhY2t5LCBleHBlY3QgaXQgdG8gY2hhbmdlXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xudmFyIGVtaXR0ZXIgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbmZ1bmN0aW9uIGdldE5hdmlnYXRpb24gKHByb3BzLCBhcHAsIGZpbHRlclN0YXJyZWQpIHtcblx0cmV0dXJuIHtcblx0XHRsZWZ0TGFiZWw6ICdMaXN0cycsXG5cdFx0bGVmdEFycm93OiB0cnVlLFxuXHRcdGxlZnRBY3Rpb246ICgpID0+IHsgYXBwLnRyYW5zaXRpb25UbygndGFiczpsaXN0cycsIHsgdHJhbnNpdGlvbjogJ3JldmVhbC1mcm9tLXJpZ2h0JyB9KSB9LFxuXHRcdHJpZ2h0TGFiZWw6IGZpbHRlclN0YXJyZWQgPyAnQWxsJyA6ICdTdGFycmVkJyxcblx0XHRyaWdodEFjdGlvbjogZW1pdHRlci5lbWl0LmJpbmQoZW1pdHRlciwgJ25hdmlnYXRpb25CYXJSaWdodEFjdGlvbicpLFxuXHRcdHRpdGxlOiAnQ29tcGxleCdcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdGNvbnRleHRUeXBlczoge1xuXHRcdGFwcDogUmVhY3QuUHJvcFR5cGVzLm9iamVjdCxcblx0XHRwZW9wbGVTdG9yZTogUmVhY3QuUHJvcFR5cGVzLm9iamVjdC5pc1JlcXVpcmVkXG5cdH0sXG5cdG1peGluczogW1NlbnRyeV0sXG5cblx0c3RhdGljczoge1xuXHRcdG5hdmlnYXRpb25CYXI6ICdtYWluJyxcblx0XHRnZXROYXZpZ2F0aW9uOiBnZXROYXZpZ2F0aW9uXG5cdH0sXG5cblx0Z2V0SW5pdGlhbFN0YXRlICgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZmlsdGVyU3RhcnJlZDogZmFsc2UsXG5cdFx0XHRwZW9wbGU6IHRoaXMuY29udGV4dC5wZW9wbGVTdG9yZS5nZXRQZW9wbGUoKVxuXHRcdH1cblx0fSxcblxuXHRjb21wb25lbnREaWRNb3VudCAoKSB7XG5cdFx0dGhpcy53YXRjaCh0aGlzLmNvbnRleHQucGVvcGxlU3RvcmUsICdwZW9wbGUtdXBkYXRlZCcsIHBlb3BsZSA9PiB7XG5cdFx0XHR0aGlzLnNldFN0YXRlKHsgcGVvcGxlIH0pXG5cdFx0fSlcblxuXHRcdHRoaXMud2F0Y2goZW1pdHRlciwgJ25hdmlnYXRpb25CYXJSaWdodEFjdGlvbicsIHRoaXMudG9nZ2xlU3RhcnJlZCk7XG5cdH0sXG5cblx0dG9nZ2xlU3RhcnJlZCAoKSB7XG5cdFx0bGV0IGZpbHRlclN0YXJyZWQgPSAhdGhpcy5zdGF0ZS5maWx0ZXJTdGFycmVkO1xuXHRcdHRoaXMuc2V0U3RhdGUoeyBmaWx0ZXJTdGFycmVkIH0pO1xuXHRcdHRoaXMuY29udGV4dC5hcHAubmF2aWdhdGlvbkJhcnMubWFpbi51cGRhdGUoZ2V0TmF2aWdhdGlvbih7fSwgdGhpcy5jb250ZXh0LmFwcCwgZmlsdGVyU3RhcnJlZCkpO1xuXHR9LFxuXG5cdGhhbmRsZU1vZGVDaGFuZ2UgKG5ld01vZGUpIHtcblx0XHRsZXQgc2VsZWN0ZWRNb2RlID0gbmV3TW9kZTtcblxuXHRcdGlmICh0aGlzLnN0YXRlLnNlbGVjdGVkTW9kZSA9PT0gbmV3TW9kZSkge1xuXHRcdFx0c2VsZWN0ZWRNb2RlID0gbnVsbDtcblx0XHR9XG5cblx0XHR0aGlzLnNldFN0YXRlKHsgc2VsZWN0ZWRNb2RlIH0pXG5cdH0sXG5cblx0cmVuZGVyICgpIHtcblx0XHRsZXQgeyBwZW9wbGUsIGZpbHRlclN0YXJyZWQsIHNlbGVjdGVkTW9kZSB9ID0gdGhpcy5zdGF0ZVxuXG5cdFx0aWYgKGZpbHRlclN0YXJyZWQpIHtcblx0XHRcdHBlb3BsZSA9IHBlb3BsZS5maWx0ZXIocGVyc29uID0+IHBlcnNvbi5pc1N0YXJyZWQpXG5cdFx0fVxuXG5cdFx0aWYgKHNlbGVjdGVkTW9kZSA9PT0gJ0EnIHx8IHNlbGVjdGVkTW9kZSA9PT0gJ0InKSB7XG5cdFx0XHRwZW9wbGUgPSBwZW9wbGUuZmlsdGVyKHBlcnNvbiA9PiBwZXJzb24uY2F0ZWdvcnkgPT09IHNlbGVjdGVkTW9kZSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzb3J0QnlOYW1lIChhLCBiKSB7IHJldHVybiBhLm5hbWUuZnVsbC5sb2NhbGVDb21wYXJlKGIubmFtZS5mdWxsKSB9XG5cblx0XHRsZXQgc29ydGVkUGVvcGxlID0gcGVvcGxlLnNvcnQoc29ydEJ5TmFtZSlcblx0XHRsZXQgcmVzdWx0c1xuXG5cdFx0aWYgKHNvcnRlZFBlb3BsZS5sZW5ndGgpIHtcblx0XHRcdGxldCBhUGVvcGxlID0gc29ydGVkUGVvcGxlXG5cdFx0XHRcdC5maWx0ZXIocGVyc29uID0+IHBlcnNvbi5jYXRlZ29yeSA9PT0gJ0EnKVxuXHRcdFx0XHQubWFwKChwZXJzb24sIGkpID0+IHtcblx0XHRcdFx0XHRyZXR1cm4gPENvbXBsZXhMaW5rSXRlbSBrZXk9eydwZXJzb25hJyArIGl9IHBlcnNvbj17cGVyc29ufSAvPlxuXHRcdFx0XHR9KVxuXG5cdFx0XHRsZXQgYlBlb3BsZSA9IHNvcnRlZFBlb3BsZVxuXHRcdFx0XHQuZmlsdGVyKHBlcnNvbiA9PiBwZXJzb24uY2F0ZWdvcnkgPT09ICdCJylcblx0XHRcdFx0Lm1hcCgocGVyc29uLCBpKSA9PiB7XG5cdFx0XHRcdFx0cmV0dXJuIDxDb21wbGV4TGlua0l0ZW0ga2V5PXsncGVyc29uYicgKyBpfSBwZXJzb249e3BlcnNvbn0gLz5cblx0XHRcdFx0fSlcblxuXHRcdFx0cmVzdWx0cyA9IChcblx0XHRcdFx0PFVJLkdyb3VwQm9keT5cblx0XHRcdFx0XHR7YVBlb3BsZS5sZW5ndGggPiAwID8gPFVJLkxpc3RIZWFkZXIgc3RpY2t5PkNhdGVnb3J5IEE8L1VJLkxpc3RIZWFkZXI+IDogJyd9XG5cdFx0XHRcdFx0e2FQZW9wbGV9XG5cdFx0XHRcdFx0e2JQZW9wbGUubGVuZ3RoID4gMCA/IDxVSS5MaXN0SGVhZGVyIHN0aWNreT5DYXRlZ29yeSBCPC9VSS5MaXN0SGVhZGVyPiA6ICcnfVxuXHRcdFx0XHRcdHtiUGVvcGxlfVxuXHRcdFx0XHQ8L1VJLkdyb3VwQm9keT5cblx0XHRcdClcblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHRzID0gKFxuXHRcdFx0XHQ8Q29udGFpbmVyIGRpcmVjdGlvbj1cImNvbHVtblwiIGFsaWduPVwiY2VudGVyXCIganVzdGlmeT1cImNlbnRlclwiIGNsYXNzTmFtZT1cIm5vLXJlc3VsdHNcIj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cIm5vLXJlc3VsdHNfX2ljb24gaW9uLWlvcy1zdGFyXCIgLz5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cIm5vLXJlc3VsdHNfX3RleHRcIj5HbyBzdGFyIHNvbWUgcGVvcGxlITwvZGl2PlxuXHRcdFx0XHQ8L0NvbnRhaW5lcj5cblx0XHRcdClcblx0XHR9XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PENvbnRhaW5lciBzY3JvbGxhYmxlPXtzY3JvbGxhYmxlfT5cblx0XHRcdFx0PFVJLlNlZ21lbnRlZENvbnRyb2wgdmFsdWU9e3RoaXMuc3RhdGUuc2VsZWN0ZWRNb2RlfSBvbkNoYW5nZT17dGhpcy5oYW5kbGVNb2RlQ2hhbmdlfSBoYXNHdXR0ZXIgZXF1YWxXaWR0aFNlZ21lbnRzIG9wdGlvbnM9e1tcblx0XHRcdFx0XHR7IGxhYmVsOiAnQScsIHZhbHVlOiAnQScgfSxcblx0XHRcdFx0XHR7IGxhYmVsOiAnQicsIHZhbHVlOiAnQicgfVxuXHRcdFx0XHRdfSAvPlxuXHRcdFx0XHR7cmVzdWx0c31cblx0XHRcdDwvQ29udGFpbmVyPlxuXHRcdCk7XG5cdH1cbn0pO1xuIiwiaW1wb3J0IENvbnRhaW5lciBmcm9tICdyZWFjdC1jb250YWluZXInO1xuaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdHN0YXRpY3M6IHtcblx0XHRuYXZpZ2F0aW9uQmFyOiAnbWFpbicsXG5cdFx0Z2V0TmF2aWdhdGlvbiAocHJvcHMsIGFwcCkge1xuXHRcdFx0dmFyIGxlZnRMYWJlbCA9IHByb3BzLnByZXZWaWV3ID09PSAnbGlzdC1zaW1wbGUnID8gJ1NpbXBsZScgOiAnQ29tcGxleCc7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRsZWZ0QXJyb3c6IHRydWUsXG5cdFx0XHRcdGxlZnRMYWJlbDogbGVmdExhYmVsLFxuXHRcdFx0XHRsZWZ0QWN0aW9uOiAoKSA9PiB7IGFwcC50cmFuc2l0aW9uVG8oJ3RhYnM6JyArIHByb3BzLnByZXZWaWV3LCB7IHRyYW5zaXRpb246ICdyZXZlYWwtZnJvbS1yaWdodCcgfSkgfSxcblx0XHRcdFx0dGl0bGU6ICdQZXJzb24nXG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXHRnZXREZWZhdWx0UHJvcHMgKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRwcmV2VmlldzogJ2hvbWUnXG5cdFx0fVxuXHR9LFxuXHRyZW5kZXIgKCkge1xuXHRcdHZhciB7IHBlcnNvbiB9ID0gdGhpcy5wcm9wcztcblxuXHRcdHJldHVybiAoXG5cdFx0XHQ8Q29udGFpbmVyIGRpcmVjdGlvbj1cImNvbHVtblwiPlxuXHRcdFx0XHQ8Q29udGFpbmVyIGZpbGwgc2Nyb2xsYWJsZSByZWY9XCJzY3JvbGxDb250YWluZXJcIiBjbGFzc05hbWU9XCJQZXJzb25EZXRhaWxzXCI+XG5cdFx0XHRcdFx0PGltZyBzcmM9e3BlcnNvbi5waWN0dXJlfSBjbGFzc05hbWU9XCJQZXJzb25EZXRhaWxzX19hdmF0YXJcIiAvPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwiUGVyc29uRGV0YWlsc19faGVhZGluZ1wiPntwZXJzb24ubmFtZS5mdWxsfTwvZGl2PlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwiUGVyc29uRGV0YWlsc19fdGV4dCB0ZXh0LWJsb2NrXCI+e3BlcnNvbi5lbWFpbCB8fCAnJ308L2Rpdj5cblx0XHRcdFx0XHR7KHBlcnNvbi50d2l0dGVyIHx8IHBlcnNvbi5naXRodWIpICYmIDxkaXYgY2xhc3NOYW1lPVwiUGVyc29uRGV0YWlsc19fcHJvZmlsZXNcIj5cblx0XHRcdFx0XHRcdHtwZXJzb24udHdpdHRlciAmJiA8ZGl2IGNsYXNzTmFtZT1cIlBlcnNvbkRldGFpbHNfX3Byb2ZpbGVcIj5cblx0XHRcdFx0XHRcdFx0PHNwYW4gY2xhc3NOYW1lPVwiUGVyc29uRGV0YWlsc19fcHJvZmlsZV9faWNvbiBpb24tc29jaWFsLXR3aXR0ZXJcIiAvPlxuXHRcdFx0XHRcdFx0XHR7cGVyc29uLnR3aXR0ZXJ9XG5cdFx0XHRcdFx0XHQ8L2Rpdj59XG5cdFx0XHRcdFx0XHR7cGVyc29uLmdpdGh1YiAmJiA8ZGl2IGNsYXNzTmFtZT1cIlBlcnNvbkRldGFpbHNfX3Byb2ZpbGVcIj5cblx0XHRcdFx0XHRcdFx0PHNwYW4gY2xhc3NOYW1lPVwiUGVyc29uRGV0YWlsc19fcHJvZmlsZV9faWNvbiBpb24tc29jaWFsLWdpdGh1YlwiIC8+XG5cdFx0XHRcdFx0XHRcdHtwZXJzb24uZ2l0aHVifVxuXHRcdFx0XHRcdFx0PC9kaXY+fVxuXHRcdFx0XHRcdDwvZGl2Pn1cblx0XHRcdFx0PC9Db250YWluZXI+XG5cdFx0XHQ8L0NvbnRhaW5lcj5cblx0XHQpO1xuXHR9XG59KTtcbiIsImltcG9ydCBDb250YWluZXIgZnJvbSAncmVhY3QtY29udGFpbmVyJztcbmltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgU2VudHJ5IGZyb20gJ3JlYWN0LXNlbnRyeSc7XG5pbXBvcnQgVGFwcGFibGUgZnJvbSAncmVhY3QtdGFwcGFibGUnO1xuaW1wb3J0IHsgTGluaywgVUkgfSBmcm9tICd0b3VjaHN0b25lanMnO1xuXG52YXIgc2Nyb2xsYWJsZSA9IENvbnRhaW5lci5pbml0U2Nyb2xsYWJsZSh7IGxlZnQ6IDAsIHRvcDogNDQgfSk7XG5cbnZhciBTaW1wbGVMaW5rSXRlbSA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0cHJvcFR5cGVzOiB7XG5cdFx0cGVyc29uOiBSZWFjdC5Qcm9wVHlwZXMub2JqZWN0LmlzUmVxdWlyZWRcblx0fSxcblxuXHRyZW5kZXIgKCkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8TGluayB0bz1cInRhYnM6bGlzdC1kZXRhaWxzXCIgdHJhbnNpdGlvbj1cInNob3ctZnJvbS1yaWdodFwiIHZpZXdQcm9wcz17eyBwZXJzb246IHRoaXMucHJvcHMucGVyc29uLCBwcmV2VmlldzogJ2xpc3Qtc2ltcGxlJyB9fT5cblx0XHRcdFx0PFVJLkl0ZW0gc2hvd0Rpc2Nsb3N1cmVBcnJvdz5cblx0XHRcdFx0XHQ8VUkuSXRlbUlubmVyPlxuXHRcdFx0XHRcdFx0PFVJLkl0ZW1UaXRsZT57dGhpcy5wcm9wcy5wZXJzb24ubmFtZS5mdWxsfTwvVUkuSXRlbVRpdGxlPlxuXHRcdFx0XHRcdDwvVUkuSXRlbUlubmVyPlxuXHRcdFx0XHQ8L1VJLkl0ZW0+XG5cdFx0XHQ8L0xpbms+XG5cdFx0KTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRtaXhpbnM6IFtTZW50cnldLFxuXHRjb250ZXh0VHlwZXM6IHsgcGVvcGxlU3RvcmU6IFJlYWN0LlByb3BUeXBlcy5vYmplY3QuaXNSZXF1aXJlZCB9LFxuXG5cdHN0YXRpY3M6IHtcblx0XHRuYXZpZ2F0aW9uQmFyOiAnbWFpbicsXG5cdFx0Z2V0TmF2aWdhdGlvbiAocHJvcHMsIGFwcCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0bGVmdEFycm93OiB0cnVlLFxuXHRcdFx0XHRsZWZ0TGFiZWw6ICdMaXN0cycsXG5cdFx0XHRcdGxlZnRBY3Rpb246ICgpID0+IHsgYXBwLnRyYW5zaXRpb25UbygndGFiczpsaXN0cycsIHsgdHJhbnNpdGlvbjogJ3JldmVhbC1mcm9tLXJpZ2h0JyB9KSB9LFxuXHRcdFx0XHR0aXRsZTogJ1NpbXBsZSdcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0Y29tcG9uZW50RGlkTW91bnQgKCkge1xuXHRcdHRoaXMud2F0Y2godGhpcy5jb250ZXh0LnBlb3BsZVN0b3JlLCAncGVvcGxlLXVwZGF0ZWQnLCBwZW9wbGUgPT4ge1xuXHRcdFx0dGhpcy5zZXRTdGF0ZSh7IHBlb3BsZSB9KVxuXHRcdH0pO1xuXHR9LFxuXG5cdGdldEluaXRpYWxTdGF0ZSAoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHNlYXJjaFN0cmluZzogJycsXG5cdFx0XHRwZW9wbGU6IHRoaXMuY29udGV4dC5wZW9wbGVTdG9yZS5nZXRQZW9wbGUoKVxuXHRcdH1cblx0fSxcblxuXHRjbGVhclNlYXJjaCAoKSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7IHNlYXJjaFN0cmluZzogJycgfSk7XG5cdH0sXG5cblx0dXBkYXRlU2VhcmNoIChzdHIpIHtcblx0XHR0aGlzLnNldFN0YXRlKHsgc2VhcmNoU3RyaW5nOiBzdHIgfSk7XG5cdH0sXG5cdFxuXHRzdWJtaXRTZWFyY2ggKHN0cikge1xuXHRcdGNvbnNvbGUubG9nKHN0cik7XG5cdH0sXG5cblx0cmVuZGVyICgpIHtcblx0XHRsZXQgeyBwZW9wbGUsIHNlYXJjaFN0cmluZyB9ID0gdGhpcy5zdGF0ZVxuXHRcdGxldCBzZWFyY2hSZWdleCA9IG5ldyBSZWdFeHAoc2VhcmNoU3RyaW5nKVxuXG5cdFx0ZnVuY3Rpb24gc2VhcmNoRmlsdGVyIChwZXJzb24pIHsgcmV0dXJuIHNlYXJjaFJlZ2V4LnRlc3QocGVyc29uLm5hbWUuZnVsbC50b0xvd2VyQ2FzZSgpKSB9O1xuXHRcdGZ1bmN0aW9uIHNvcnRCeU5hbWUgKGEsIGIpIHsgcmV0dXJuIGEubmFtZS5mdWxsLmxvY2FsZUNvbXBhcmUoYi5uYW1lLmZ1bGwpIH07XG5cdFx0XG5cdFx0bGV0IGZpbHRlcmVkUGVvcGxlID0gcGVvcGxlLmZpbHRlcihzZWFyY2hGaWx0ZXIpLnNvcnQoc29ydEJ5TmFtZSk7XG5cblx0XHRsZXQgcmVzdWx0c1xuXG5cdFx0aWYgKHNlYXJjaFN0cmluZyAmJiAhZmlsdGVyZWRQZW9wbGUubGVuZ3RoKSB7XG5cdFx0XHRyZXN1bHRzID0gKFxuXHRcdFx0XHQ8Q29udGFpbmVyIGRpcmVjdGlvbj1cImNvbHVtblwiIGFsaWduPVwiY2VudGVyXCIganVzdGlmeT1cImNlbnRlclwiIGNsYXNzTmFtZT1cIm5vLXJlc3VsdHNcIj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cIm5vLXJlc3VsdHNfX2ljb24gaW9uLWlvcy1zZWFyY2gtc3Ryb25nXCIgLz5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cIm5vLXJlc3VsdHNfX3RleHRcIj57J05vIHJlc3VsdHMgZm9yIFwiJyArIHNlYXJjaFN0cmluZyArICdcIid9PC9kaXY+XG5cdFx0XHRcdDwvQ29udGFpbmVyPlxuXHRcdFx0KTtcblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXN1bHRzID0gKFxuXHRcdFx0XHQ8VUkuR3JvdXBCb2R5PlxuXHRcdFx0XHRcdHtmaWx0ZXJlZFBlb3BsZS5tYXAoKHBlcnNvbiwgaSkgPT4ge1xuXHRcdFx0XHRcdFx0cmV0dXJuIDxTaW1wbGVMaW5rSXRlbSBrZXk9eydwZXJzb24nICsgaX0gcGVyc29uPXtwZXJzb259IC8+XG5cdFx0XHRcdFx0fSl9XG5cdFx0XHRcdDwvVUkuR3JvdXBCb2R5PlxuXHRcdFx0KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PENvbnRhaW5lciByZWY9XCJzY3JvbGxDb250YWluZXJcIiBzY3JvbGxhYmxlPXtzY3JvbGxhYmxlfT5cblx0XHRcdFx0PFVJLlNlYXJjaEZpZWxkIHR5cGU9XCJkYXJrXCIgdmFsdWU9e3RoaXMuc3RhdGUuc2VhcmNoU3RyaW5nfSBvblN1Ym1pdD17dGhpcy5zdWJtaXRTZWFyY2h9IG9uQ2hhbmdlPXt0aGlzLnVwZGF0ZVNlYXJjaH0gb25DYW5jZWw9e3RoaXMuY2xlYXJTZWFyY2h9IG9uQ2xlYXI9e3RoaXMuY2xlYXJTZWFyY2h9IHBsYWNlaG9sZGVyPVwiU2VhcmNoLi4uXCIgLz5cblx0XHRcdFx0e3Jlc3VsdHN9XG5cdFx0XHQ8L0NvbnRhaW5lcj5cblx0XHQpO1xuXHR9XG59KTtcbiIsImltcG9ydCBDb250YWluZXIgZnJvbSAncmVhY3QtY29udGFpbmVyJztcbmltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBMaW5rLCBVSSB9IGZyb20gJ3RvdWNoc3RvbmVqcyc7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRzdGF0aWNzOiB7XG5cdFx0bmF2aWdhdGlvbkJhcjogJ21haW4nLFxuXHRcdGdldE5hdmlnYXRpb24gKCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0dGl0bGU6ICdMaXN0cydcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxDb250YWluZXIgc2Nyb2xsYWJsZT5cblx0XHRcdFx0PFVJLkdyb3VwPlxuXHRcdFx0XHRcdDxVSS5Hcm91cEhlYWRlcj5MaXN0czwvVUkuR3JvdXBIZWFkZXI+XG5cdFx0XHRcdFx0PFVJLkdyb3VwQm9keT5cblx0XHRcdFx0XHRcdDxMaW5rIHRvPVwidGFiczpsaXN0LXNpbXBsZVwiIHRyYW5zaXRpb249XCJzaG93LWZyb20tcmlnaHRcIj5cblx0XHRcdFx0XHRcdFx0PFVJLkl0ZW0gc2hvd0Rpc2Nsb3N1cmVBcnJvdz5cblx0XHRcdFx0XHRcdFx0XHQ8VUkuSXRlbUlubmVyPlxuXHRcdFx0XHRcdFx0XHRcdFx0U2ltcGxlIExpc3Rcblx0XHRcdFx0XHRcdFx0XHQ8L1VJLkl0ZW1Jbm5lcj5cblx0XHRcdFx0XHRcdFx0PC9VSS5JdGVtPlxuXHRcdFx0XHRcdFx0PC9MaW5rPlxuXHRcdFx0XHRcdFx0PExpbmsgdG89XCJ0YWJzOmxpc3QtY29tcGxleFwiIHRyYW5zaXRpb249XCJzaG93LWZyb20tcmlnaHRcIj5cblx0XHRcdFx0XHRcdFx0PFVJLkl0ZW0gc2hvd0Rpc2Nsb3N1cmVBcnJvdz5cblx0XHRcdFx0XHRcdFx0XHQ8VUkuSXRlbUlubmVyPlxuXHRcdFx0XHRcdFx0XHRcdFx0Q29tcGxleCBMaXN0XG5cdFx0XHRcdFx0XHRcdFx0PC9VSS5JdGVtSW5uZXI+XG5cdFx0XHRcdFx0XHRcdDwvVUkuSXRlbT5cblx0XHRcdFx0XHRcdDwvTGluaz5cblx0XHRcdFx0XHQ8L1VJLkdyb3VwQm9keT5cblx0XHRcdFx0PC9VSS5Hcm91cD5cblx0XHRcdFx0PFVJLkdyb3VwPlxuXHRcdFx0XHRcdDxVSS5Hcm91cEhlYWRlcj5Hcm91cEhlYWRlcjwvVUkuR3JvdXBIZWFkZXI+XG5cdFx0XHRcdFx0PFVJLkdyb3VwQm9keT5cblx0XHRcdFx0XHRcdDxVSS5Hcm91cElubmVyPlxuXHRcdFx0XHRcdFx0XHQ8cD5Vc2UgZ3JvdXBzIHRvIGNvbnRhaW4gY29udGVudCBvciBsaXN0cy4gV2hlcmUgYXBwcm9wcmlhdGUgYSBHcm91cCBzaG91bGQgYmUgYWNjb21wYW5pZWQgYnkgYSBHcm91cEhlYWRpbmcgYW5kIG9wdGlvbmFsbHkgYSBHcm91cEZvb3Rlci48L3A+XG5cdFx0XHRcdFx0XHRcdEdyb3VwQm9keSB3aWxsIGFwcGx5IHRoZSBiYWNrZ3JvdW5kIGZvciBjb250ZW50IGluc2lkZSBncm91cHMuXG5cdFx0XHRcdFx0XHQ8L1VJLkdyb3VwSW5uZXI+XG5cdFx0XHRcdFx0PC9VSS5Hcm91cEJvZHk+XG5cdFx0XHRcdFx0PFVJLkdyb3VwRm9vdGVyPkdyb3VwRm9vdGVyOiB1c2VmdWwgZm9yIGEgZGV0YWlsZWQgZXhwbGFuYXRpb24gdG8gZXhwcmVzcyB0aGUgaW50ZW50aW9ucyBvZiB0aGUgR3JvdXAuIFRyeSB0byBiZSBjb25jaXNlIC0gcmVtZW1iZXIgdGhhdCB1c2VycyBhcmUgbGlrZWx5IHRvIHJlYWQgdGhlIHRleHQgaW4geW91ciBVSSBtYW55IHRpbWVzLjwvVUkuR3JvdXBGb290ZXI+XG5cdFx0XHRcdDwvVUkuR3JvdXA+XG5cdFx0XHQ8L0NvbnRhaW5lcj5cblx0XHQpO1xuXHR9XG59KTtcbiIsImltcG9ydCBDb250YWluZXIgZnJvbSAncmVhY3QtY29udGFpbmVyJztcbmltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgVGltZXJzIGZyb20gJ3JlYWN0LXRpbWVycyc7XG5pbXBvcnQgeyBNaXhpbnMsIFVJIH0gZnJvbSAndG91Y2hzdG9uZWpzJztcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cdG1peGluczogW01peGlucy5UcmFuc2l0aW9ucywgVGltZXJzXSxcblx0Y29tcG9uZW50RGlkTW91bnQgKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHR0aGlzLnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0c2VsZi50cmFuc2l0aW9uVG8oJ2FwcDptYWluJywgeyB0cmFuc2l0aW9uOiAnZmFkZScgfSk7XG5cdFx0fSwgMTAwMCk7XG5cdH0sXG5cdHJlbmRlciAoKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxDb250YWluZXIgZGlyZWN0aW9uPVwiY29sdW1uXCI+XG5cdFx0XHRcdDxVSS5OYXZpZ2F0aW9uQmFyIG5hbWU9XCJvdmVyXCIgdGl0bGU9e3RoaXMucHJvcHMubmF2YmFyVGl0bGV9IC8+XG5cdFx0XHRcdDxDb250YWluZXIgZGlyZWN0aW9uPVwiY29sdW1uXCIgYWxpZ249XCJjZW50ZXJcIiBqdXN0aWZ5PVwiY2VudGVyXCIgY2xhc3NOYW1lPVwibm8tcmVzdWx0c1wiPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwibm8tcmVzdWx0c19faWNvbiBpb24taW9zLXBob3Rvc1wiIC8+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJuby1yZXN1bHRzX190ZXh0XCI+SG9sZCBvbiBhIHNlYy4uLjwvZGl2PlxuXHRcdFx0XHQ8L0NvbnRhaW5lcj5cblx0XHRcdDwvQ29udGFpbmVyPlxuXHRcdCk7XG5cdH1cbn0pO1xuIiwiaW1wb3J0IENvbnRhaW5lciBmcm9tICdyZWFjdC1jb250YWluZXInO1xuaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCBUaW1lcnMgZnJvbSAncmVhY3QtdGltZXJzJztcbmltcG9ydCB7IE1peGlucyB9IGZyb20gJ3RvdWNoc3RvbmVqcyc7XG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXHRtaXhpbnM6IFtNaXhpbnMuVHJhbnNpdGlvbnMsIFRpbWVyc10sXG5cdHN0YXRpY3M6IHtcblx0XHRuYXZpZ2F0aW9uQmFyOiAnbWFpbicsXG5cdFx0Z2V0TmF2aWdhdGlvbiAocHJvcHMpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHRpdGxlOiBwcm9wcy5uYXZiYXJUaXRsZVxuXHRcdFx0fVxuXHRcdH1cblx0fSxcblx0Y29tcG9uZW50RGlkTW91bnQgKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHRoaXMuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRzZWxmLnRyYW5zaXRpb25UbygndGFiczp0cmFuc2l0aW9ucycsIHsgdHJhbnNpdGlvbjogJ2ZhZGUnIH0pO1xuXHRcdH0sIDEwMDApO1xuXHR9LFxuXHRyZW5kZXIgKCkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8Q29udGFpbmVyIGRpcmVjdGlvbj1cImNvbHVtblwiIGFsaWduPVwiY2VudGVyXCIganVzdGlmeT1cImNlbnRlclwiIGNsYXNzTmFtZT1cIm5vLXJlc3VsdHNcIj5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJuby1yZXN1bHRzX19pY29uIGlvbi1pb3MtcGhvdG9zXCIgLz5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9XCJuby1yZXN1bHRzX190ZXh0XCI+SG9sZCBvbiBhIHNlYy4uLjwvZGl2PlxuXHRcdFx0PC9Db250YWluZXI+XG5cdFx0KTtcblx0fVxufSk7XG4iLCJpbXBvcnQgQ29udGFpbmVyIGZyb20gJ3JlYWN0LWNvbnRhaW5lcic7XG5pbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgTGluaywgVUkgfSBmcm9tICd0b3VjaHN0b25lanMnO1xuXG52YXIgc2Nyb2xsYWJsZSA9IENvbnRhaW5lci5pbml0U2Nyb2xsYWJsZSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblx0c3RhdGljczoge1xuXHRcdG5hdmlnYXRpb25CYXI6ICdtYWluJyxcblx0XHRnZXROYXZpZ2F0aW9uICgpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHRpdGxlOiAnVHJhbnNpdGlvbnMnXG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXHRcblx0cmVuZGVyICgpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PENvbnRhaW5lciBzY3JvbGxhYmxlPXtzY3JvbGxhYmxlfT5cblx0XHRcdFx0PFVJLkdyb3VwPlxuXHRcdFx0XHRcdDxVSS5Hcm91cEhlYWRlcj5EZWZhdWx0PC9VSS5Hcm91cEhlYWRlcj5cblx0XHRcdFx0XHQ8VUkuR3JvdXBCb2R5PlxuXHRcdFx0XHRcdFx0PExpbmsgdG89XCJ0YWJzOnRyYW5zaXRpb25zLXRhcmdldFwiIHZpZXdQcm9wcz17eyBuYXZiYXJUaXRsZTogJ0luc3RhbnQnIH19PlxuXHRcdFx0XHRcdFx0XHQ8VUkuSXRlbSBzaG93RGlzY2xvc3VyZUFycm93PlxuXHRcdFx0XHRcdFx0XHRcdDxVSS5JdGVtSW5uZXI+SW5zdGFudDwvVUkuSXRlbUlubmVyPlxuXHRcdFx0XHRcdFx0XHQ8L1VJLkl0ZW0+XG5cdFx0XHRcdFx0XHQ8L0xpbms+XG5cdFx0XHRcdFx0PC9VSS5Hcm91cEJvZHk+XG5cdFx0XHRcdDwvVUkuR3JvdXA+XG5cdFx0XHRcdDxVSS5Hcm91cD5cblx0XHRcdFx0XHQ8VUkuR3JvdXBIZWFkZXI+RmFkZTwvVUkuR3JvdXBIZWFkZXI+XG5cdFx0XHRcdFx0PFVJLkdyb3VwQm9keT5cblx0XHRcdFx0XHRcdDxMaW5rIHRvPVwidGFiczp0cmFuc2l0aW9ucy10YXJnZXRcIiB0cmFuc2l0aW9uPVwiZmFkZVwiIHZpZXdQcm9wcz17eyBuYXZiYXJUaXRsZTogJ0ZhZGUnIH19PlxuXHRcdFx0XHRcdFx0XHQ8VUkuSXRlbSBzaG93RGlzY2xvc3VyZUFycm93PlxuXHRcdFx0XHRcdFx0XHRcdDxVSS5JdGVtSW5uZXI+RmFkZTwvVUkuSXRlbUlubmVyPlxuXHRcdFx0XHRcdFx0XHQ8L1VJLkl0ZW0+XG5cdFx0XHRcdFx0XHQ8L0xpbms+XG5cdFx0XHRcdFx0XHQ8TGluayB0bz1cInRhYnM6dHJhbnNpdGlvbnMtdGFyZ2V0XCIgdHJhbnNpdGlvbj1cImZhZGUtZXhwYW5kXCIgdmlld1Byb3BzPXt7IG5hdmJhclRpdGxlOiAnRmFkZSBFeHBhbmQnIH19PlxuXHRcdFx0XHRcdFx0XHQ8VUkuSXRlbSBzaG93RGlzY2xvc3VyZUFycm93PlxuXHRcdFx0XHRcdFx0XHRcdDxVSS5JdGVtSW5uZXI+PHNwYW4+RmFkZSBFeHBhbmQgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1tdXRlZFwiPihub24tc3RhbmRhcmQpPC9zcGFuPjwvc3Bhbj48L1VJLkl0ZW1Jbm5lcj5cblx0XHRcdFx0XHRcdFx0PC9VSS5JdGVtPlxuXHRcdFx0XHRcdFx0PC9MaW5rPlxuXHRcdFx0XHRcdFx0PExpbmsgdG89XCJ0YWJzOnRyYW5zaXRpb25zLXRhcmdldFwiIHRyYW5zaXRpb249XCJmYWRlLWNvbnRyYWN0XCIgdmlld1Byb3BzPXt7IG5hdmJhclRpdGxlOiAnRmFkZSBDb250cmFjdCcgfX0+XG5cdFx0XHRcdFx0XHRcdDxVSS5JdGVtIHNob3dEaXNjbG9zdXJlQXJyb3c+XG5cdFx0XHRcdFx0XHRcdFx0PFVJLkl0ZW1Jbm5lcj48c3Bhbj5GYWRlIENvbnRyYWN0IDxzcGFuIGNsYXNzTmFtZT1cInRleHQtbXV0ZWRcIj4obm9uLXN0YW5kYXJkKTwvc3Bhbj48L3NwYW4+PC9VSS5JdGVtSW5uZXI+XG5cdFx0XHRcdFx0XHRcdDwvVUkuSXRlbT5cblx0XHRcdFx0XHRcdDwvTGluaz5cblx0XHRcdFx0XHQ8L1VJLkdyb3VwQm9keT5cblx0XHRcdFx0PC9VSS5Hcm91cD5cblx0XHRcdFx0PFVJLkdyb3VwPlxuXHRcdFx0XHRcdDxVSS5Hcm91cEhlYWRlcj5TaG93PC9VSS5Hcm91cEhlYWRlcj5cblx0XHRcdFx0XHQ8VUkuR3JvdXBCb2R5PlxuXHRcdFx0XHRcdFx0PExpbmsgdG89XCJ0YWJzOnRyYW5zaXRpb25zLXRhcmdldFwiIHRyYW5zaXRpb249XCJzaG93LWZyb20tbGVmdFwiIHZpZXdQcm9wcz17eyBuYXZiYXJUaXRsZTogJ1Nob3cgZnJvbSBMZWZ0JyB9fT5cblx0XHRcdFx0XHRcdFx0PFVJLkl0ZW0gc2hvd0Rpc2Nsb3N1cmVBcnJvdz5cblx0XHRcdFx0XHRcdFx0XHQ8VUkuSXRlbUlubmVyPjxzcGFuPlNob3cgZnJvbSBMZWZ0IDxzcGFuIGNsYXNzTmFtZT1cInRleHQtbXV0ZWRcIj4obm9uLXN0YW5kYXJkKTwvc3Bhbj48L3NwYW4+PC9VSS5JdGVtSW5uZXI+XG5cdFx0XHRcdFx0XHRcdDwvVUkuSXRlbT5cblx0XHRcdFx0XHRcdDwvTGluaz5cblx0XHRcdFx0XHRcdDxMaW5rIHRvPVwidGFiczp0cmFuc2l0aW9ucy10YXJnZXRcIiB0cmFuc2l0aW9uPVwic2hvdy1mcm9tLXJpZ2h0XCIgdmlld1Byb3BzPXt7IG5hdmJhclRpdGxlOiAnU2hvdyBmcm9tIFJpZ2h0JyB9fT5cblx0XHRcdFx0XHRcdFx0PFVJLkl0ZW0gc2hvd0Rpc2Nsb3N1cmVBcnJvdz5cblx0XHRcdFx0XHRcdFx0XHQ8VUkuSXRlbUlubmVyPlNob3cgZnJvbSBSaWdodDwvVUkuSXRlbUlubmVyPlxuXHRcdFx0XHRcdFx0XHQ8L1VJLkl0ZW0+XG5cdFx0XHRcdFx0XHQ8L0xpbms+XG5cdFx0XHRcdFx0XHQ8TGluayB0bz1cImFwcDp0cmFuc2l0aW9ucy10YXJnZXQtb3ZlclwiIHRyYW5zaXRpb249XCJzaG93LWZyb20tdG9wXCIgdmlld1Byb3BzPXt7IG5hdmJhclRpdGxlOiAnU2hvdyBmcm9tIFRvcCcgfX0+XG5cdFx0XHRcdFx0XHRcdDxVSS5JdGVtIHNob3dEaXNjbG9zdXJlQXJyb3c+XG5cdFx0XHRcdFx0XHRcdFx0PFVJLkl0ZW1Jbm5lcj48c3Bhbj5TaG93IGZyb20gVG9wIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtbXV0ZWRcIj4obm9uLXN0YW5kYXJkKTwvc3Bhbj48L3NwYW4+PC9VSS5JdGVtSW5uZXI+XG5cdFx0XHRcdFx0XHRcdDwvVUkuSXRlbT5cblx0XHRcdFx0XHRcdDwvTGluaz5cblx0XHRcdFx0XHRcdDxMaW5rIHRvPVwiYXBwOnRyYW5zaXRpb25zLXRhcmdldC1vdmVyXCIgdHJhbnNpdGlvbj1cInNob3ctZnJvbS1ib3R0b21cIiB2aWV3UHJvcHM9e3sgbmF2YmFyVGl0bGU6ICdTaG93IGZyb20gQm90dG9tJyB9fT5cblx0XHRcdFx0XHRcdFx0PFVJLkl0ZW0gc2hvd0Rpc2Nsb3N1cmVBcnJvdz5cblx0XHRcdFx0XHRcdFx0XHQ8VUkuSXRlbUlubmVyPlNob3cgZnJvbSBCb3R0b208L1VJLkl0ZW1Jbm5lcj5cblx0XHRcdFx0XHRcdFx0PC9VSS5JdGVtPlxuXHRcdFx0XHRcdFx0PC9MaW5rPlxuXHRcdFx0XHRcdDwvVUkuR3JvdXBCb2R5PlxuXHRcdFx0XHQ8L1VJLkdyb3VwPlxuXHRcdFx0XHQ8VUkuR3JvdXA+XG5cdFx0XHRcdFx0PFVJLkdyb3VwSGVhZGVyPlJldmVhbDwvVUkuR3JvdXBIZWFkZXI+XG5cdFx0XHRcdFx0PFVJLkdyb3VwQm9keT5cblx0XHRcdFx0XHRcdDxMaW5rIHRvPVwidGFiczp0cmFuc2l0aW9ucy10YXJnZXRcIiB0cmFuc2l0aW9uPVwicmV2ZWFsLWZyb20tbGVmdFwiIHZpZXdQcm9wcz17eyBuYXZiYXJUaXRsZTogJ1JldmVhbCBmcm9tIExlZnQnIH19PlxuXHRcdFx0XHRcdFx0XHQ8VUkuSXRlbSBzaG93RGlzY2xvc3VyZUFycm93PlxuXHRcdFx0XHRcdFx0XHRcdDxVSS5JdGVtSW5uZXI+PHNwYW4+UmV2ZWFsIGZyb20gTGVmdCA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LW11dGVkXCI+KG5vbi1zdGFuZGFyZCk8L3NwYW4+PC9zcGFuPjwvVUkuSXRlbUlubmVyPlxuXHRcdFx0XHRcdFx0XHQ8L1VJLkl0ZW0+XG5cdFx0XHRcdFx0XHQ8L0xpbms+XG5cdFx0XHRcdFx0XHQ8TGluayB0bz1cInRhYnM6dHJhbnNpdGlvbnMtdGFyZ2V0XCIgdHJhbnNpdGlvbj1cInJldmVhbC1mcm9tLXJpZ2h0XCIgdmlld1Byb3BzPXt7IG5hdmJhclRpdGxlOiAnUmV2ZWFsIGZyb20gUmlnaHQnIH19PlxuXHRcdFx0XHRcdFx0XHQ8VUkuSXRlbSBzaG93RGlzY2xvc3VyZUFycm93PlxuXHRcdFx0XHRcdFx0XHRcdDxVSS5JdGVtSW5uZXI+UmV2ZWFsIGZyb20gUmlnaHQ8L1VJLkl0ZW1Jbm5lcj5cblx0XHRcdFx0XHRcdFx0PC9VSS5JdGVtPlxuXHRcdFx0XHRcdFx0PC9MaW5rPlxuXHRcdFx0XHRcdFx0PExpbmsgdG89XCJhcHA6dHJhbnNpdGlvbnMtdGFyZ2V0LW92ZXJcIiB0cmFuc2l0aW9uPVwicmV2ZWFsLWZyb20tdG9wXCIgdmlld1Byb3BzPXt7IG5hdmJhclRpdGxlOiAnUmV2ZWFsIGZyb20gVG9wJyB9fT5cblx0XHRcdFx0XHRcdFx0PFVJLkl0ZW0gc2hvd0Rpc2Nsb3N1cmVBcnJvdz5cblx0XHRcdFx0XHRcdFx0XHQ8VUkuSXRlbUlubmVyPjxzcGFuPlJldmVhbCBmcm9tIFRvcCA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LW11dGVkXCI+KG5vbi1zdGFuZGFyZCk8L3NwYW4+PC9zcGFuPjwvVUkuSXRlbUlubmVyPlxuXHRcdFx0XHRcdFx0XHQ8L1VJLkl0ZW0+XG5cdFx0XHRcdFx0XHQ8L0xpbms+XG5cdFx0XHRcdFx0XHQ8TGluayB0bz1cImFwcDp0cmFuc2l0aW9ucy10YXJnZXQtb3ZlclwiIHRyYW5zaXRpb249XCJyZXZlYWwtZnJvbS1ib3R0b21cIiB2aWV3UHJvcHM9e3sgbmF2YmFyVGl0bGU6ICdSZXZlYWwgZnJvbSBCb3R0b20nIH19PlxuXHRcdFx0XHRcdFx0XHQ8VUkuSXRlbSBzaG93RGlzY2xvc3VyZUFycm93PlxuXHRcdFx0XHRcdFx0XHRcdDxVSS5JdGVtSW5uZXI+UmV2ZWFsIGZyb20gQm90dG9tPC9VSS5JdGVtSW5uZXI+XG5cdFx0XHRcdFx0XHRcdDwvVUkuSXRlbT5cblx0XHRcdFx0XHRcdDwvTGluaz5cblx0XHRcdFx0XHQ8L1VJLkdyb3VwQm9keT5cblx0XHRcdFx0PC9VSS5Hcm91cD5cblx0XHRcdDwvQ29udGFpbmVyPlxuXHRcdCk7XG5cdH1cbn0pO1xuIl19
