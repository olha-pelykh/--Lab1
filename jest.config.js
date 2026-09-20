/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'jsdom',
    collectCoverage: true,
    collectCoverageFrom: ['game.js'],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            statements: 80,
            branches:   80,
            functions:  70,
            lines:      80,
        },
    },
};
