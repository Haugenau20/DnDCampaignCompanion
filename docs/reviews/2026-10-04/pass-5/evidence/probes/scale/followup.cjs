'use strict';
exports.run=api=>require('./scale.cjs').run({...api,scaleSizes:[3000],warmupRecovery:true});
