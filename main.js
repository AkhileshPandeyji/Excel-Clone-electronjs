// Directory Structure
// your-app/
// ├── package.json
// ├── main.js
// └── index.html

// npm init

// modify package.json
// {
//     "name": "your-app",
//     "version": "0.1.0",
//     "main": "main.js",
//     "scripts": {
//       "start": "electron ."
//     }
// }

// npm install --save-dev electron

// Run the app
// npm start


const electron = require("electron");
const ejs = require("ejs-electron");
const app = electron.app;


ejs.data({
    "title":"My Excel",
    "rows":100,
    "cols":26    
});

function createWindow(){
    const win = new electron.BrowserWindow({
       width:800,
       height:600,
       show:false,
       webPreferences:{
           nodeIntegration:true
       }
    })
    win.loadFile("index.ejs").then(function(){
        win.maximize();
        win.removeMenu();
        win.setIcon("./images/excel-icon.png");
        win.show();
        // win.webContents.openDevTools();
    })
}


app.whenReady().then(createWindow);

app.on("window-all-closed",function(){
    if(process.platform !== "darwin"){
        app.quit();
    }
});

app.on("activate",function(){
    if(electron.BrowserWindow.getAllWindows().length === 0){
        createWindow();
    }
});