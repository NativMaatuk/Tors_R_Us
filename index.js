const express = require('express');
const app = express();
const PORT = 8000;
const path = require("path");

// in order to send and receive json body
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({extended:false})
);

// take cares of the CORS error
const cors = require("cors");
app.use(cors());

// create the auto http request logger
const morgan = require("morgan");
const rts = require("rotating-file-stream")
const accessLogStream = rts.createStream('httpRequests.log',{
    size:'1M',
    interval: '1d',
    path: path.join(__dirname,'api/logs')
});
// uses the http logger
app.use(morgan((tokens, req, res) =>{
    return [
        new Date().toLocaleString(),
        tokens.method(req, res),
        tokens.url(req, res),
        tokens.status(req, res),
        tokens.res(req, res, 'content-length'), '-',
        tokens['response-time'](req, res), 'ms',
    ].join(' ')
}, { stream: accessLogStream }));

// the different routes
const users = require("./api/routes/users.router");
const businesses = require("./api/routes/businesses.router");
const appointments = require("./api/routes/appointments.router");
app.use("/api/userManager",users);
app.use("/api/businessManager",businesses);
app.use("/api/appointmentManager",appointments);

// static files - frontend routing
app.use(express.static(path.join(__dirname,"dist/Tors_R_Us")));
app.get("*",(req,res)=>{
    res.sendFile(path.join(__dirname,"dist/Tors_R_Us/index.html"));
});

// setup the server on the port
app.listen(PORT,()=>console.log("Server up"));
