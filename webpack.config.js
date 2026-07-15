const path = require('path');

module.exports = {
  entry: './app.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  devServer: {
    static: {
      directory: __dirname
    },
    port: 8080,
    open: false,
    hot: false,
    liveReload: true
  }
};