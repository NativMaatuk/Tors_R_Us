const winston = require("winston");
const path = require("path");

// custom log levels
const myLevels = {
    mail:0,
    error:0,
    activation:0,
    deactivation:0,
    deletion:0,
    creation:0,
    update:0,
}

/**
 * also declared it here to solve circular dependency
 * return date format of Y-M-d,
 * same functions as in service.js but cannot call the service's function
 * because circular dependency exception
 * @param {string|Date} dateOf
 * @returns {string}
 */
function getDateFormat(dateOf){
    let twoDigits = (num) => {return num<10? `0${num}`:num;}
    let date = new Date(dateOf);
    return `${date.getFullYear()}-${twoDigits(date.getMonth()+1)}-${twoDigits(date.getDate())}`;
}

// the custom format: date time : level : message : restData
const myFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({level,message,timestamp,...restData})=>{
        let date = new Date(timestamp);
        let msg = `${getDateFormat(date)} ${date.toLocaleTimeString()} : [${level}] : ${message} `;
        if (restData)
            msg+=JSON.stringify(restData);
        return msg;
    })
)

// creates the custom loggers
const createLogger = (level,file) => winston.loggers.add(level,{
    levels:myLevels,
    level:level,
    format:myFormat,
    transports:[
        new winston.transports.File({level:level,filename:file})
    ]
});

/**
 *  create the log data object from given parameters,
 *  the object will later be converted into json string
 *  the function will skip missing parameters
 * @param {Request|undefined} request
 * @param {Response|undefined} response
 * @param {any} result
 * @param {object|undefined} error
 * @return {{method:string,statusCode:number,requestParams:object, requestBody:object, requestUrl: string,
 *          res:object|undefined, err:object|undefined}}
 */
function getLogData(request=undefined,response=undefined,result=undefined,error=undefined){
    let getBaseData = (req,res) =>{
        return {
            method:req.method,
            statusCode:res.statusCode,
            requestUrl:`${req.protocol}://${req.get('host')}${req.originalUrl}`,
            requestParams:req.params,
            requestBody:req.body
        };
    }
    let obj = {};
    if (request!==undefined && request && response!==undefined && response)
        obj= getBaseData(request,response);
    if (result !== undefined && result)
        obj.result = result;
    if (error !== undefined && error)
        obj.error = error;
    return obj;
}

// create arrow log function that receive request,result,data,error
const logTo = (level) => {
    return (req=undefined,res=undefined,data=undefined,error=undefined)=>{
        winston.loggers.get(level).log({level:level,message:JSON.stringify(getLogData(req,res,data,error),null,4)})
    }
}

/**
 * creates the custom loggers and their arrow log functions
 * each level will log into its designated file
 * @type {{
 *  mail:function(message:string|object),
 *  error:function(message:string|object),
 *  activation:function(message:string|object),
 *  deactivation:function(message:string|object),
 *  deletion:function(message:string|object),
 *  creation:function(message:string|object),
 *  update:function(message:string|object)
 *  }}
 */
let logs = {};
Object.keys(myLevels).forEach((key)=>{
    createLogger(key,path.join(__dirname,"../logs",`${key}.log`));
    logs[key] = logTo(key);
});

module.exports = logs;
