// Uses the coordinator's existing legacy campaign; no content is reseeded.
const {run} = require('./legacy.cjs');
module.exports = {
  run: args => run({...args, onlyNames: ['chapter-without-summary-or-modification']}),
};
