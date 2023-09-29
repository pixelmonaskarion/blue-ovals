module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main.js',
  // Put your normal webpack config below here
  module: {
    rules: require('./webpack.rules'),
  },
  externals: {
    'node:crypto': 'node:crypto'
  },
  devServer: {
    compress: true,
    port: 3000,
    headers: {
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' data:; connect-src 'self' ws://localhost:3000 https://chrissytopher.com:40441; script-src 'self' 'unsafe-eval' http://localhost:3000; style-src 'self' 'unsafe-inline';",
    }
  },
};
