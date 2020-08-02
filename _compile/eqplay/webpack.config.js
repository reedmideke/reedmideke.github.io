const webpack = require('webpack');

module.exports = function(env, argv) {
  return {
    entry: './eqplay.js',
    output: {
      path: __dirname+'/../../assets/js',
      filename: (env.prod)?'eqplay.min.js':'eqplay.dev.js'
    },
    performance: { hints: false }
  }
};
