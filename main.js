var app = require('app');
var browser_window = require('browser-window');

var main_window = null;

//crash-report
require('crash-reporter').start();

//quit, if all window closed
app.on('window-all-closed', function(){ app.quit(); });


app.on('ready', function(){
  //create main window
  main_window = new browser_window({ width: 1280, height: 960 });

  //load html
  main_window.loadURL('file://' + __dirname + '/index.html');

  //if clicked close button, close main window.
  main_window.on('closed', function(){ main_window = null; });
})
