module.exports = function(config) {
    config.set({
        browsers: [
            'Chrome',
            'Firefox',
            'Safari',
            'Opera'
        ],
        files: [
            {pattern: 'src/**.js', included: true},
            {pattern: 'spec/**.js', included: true},
            {pattern: 'spec/**.json', included: false}
        ],
        frameworks: [
            'jasmine'
        ],
        reporters: [
            'progress',
            'growl-notifications'
        ]
    });
};
