const mysql = require("./database");
const mailer = require("./mailer");
const loggers = require("./loggers");

/**
 * checks if the string is indeed a string and isn't empty or only spaces
 * @param {string} str
 * @returns {boolean}
 */
function isValidString(str){
    return str && (typeof(str)==="string" || (str instanceof String)) && str.trim();
}

/**
 * checks if the number is 1 or 0
 * @param {number} num
 * @returns {boolean}
 */
function isValidBoolean(num){
    return (+num===0 || +num===1);
}

/**
 * receive an object array, will return ether the first value,
 * or if the array is empty will return null
 * @param {object[]} res
 * @returns {object|null}
 */
function returnSingle(res){
    return !res.length? null:res[0];
}

/**
 *  query the database with the statement given,
 *  the only stmt parameter is the string given
 * @param {string} stmt - MySQL statement
 * @param {string} arg
 * @returns {Promise<object[]>}
 */
async function queryByString(stmt,arg){
    if (!isValidString(arg))
        throw 400;
    let res = await mysql.promisePool.query(stmt,[arg]);
    return res[0];
}

/**
 * sends a mail with given parameters,
 * the email will be send from Tors.R.Us.project@gmail.com address
 * @param {object} mailOptions
 * @param {{address:string,name:string}} mailOptions.from
 * @param {string} mailOptions.to
 * @param {string} mailOptions.subject
 * @param {string} mailOptions.html
 * @param {object} mailOptions.info - sendMail info result
 * @returns {Promise<void>}
 */
async function sendMail(mailOptions){
    mailOptions.from = {address:"Tors.R.Us.project@gmail.com",name:"Tors R Us"};
    await mailer.transporter.sendMail(mailOptions, (err, info) => {
        mailOptions.info = info;
        loggers.mail(undefined,undefined,mailOptions,err);
    });
}


/**
 *  request the database to add a message,
 *  if mail==true will also send a message to the receiver's email
 * @param {object} message
 * @param {string} message.content
 * @param {string} message.subject
 * @param {string} message.businessName
 * @param {string} message.receiverEmail
 * @param {string} message.to - converted from receiverEmail, for sendMail
 * @param {string} message.html - converted from subject and content, for sendMail
 * @param {boolean} mail - if true will also send an email
 * @returns {Promise<number>}
 */
async function sendMessage(message,mail){
    if (!isValidString(message.content) || !isValidString(message.subject)
        || !isValidString(message.businessName) || !isValidString(message.receiverEmail))
        throw 400;
    await mysql.promisePool.query("INSERT INTO messages (dateOf,timeOf,wasRead,content,subject,messageType,businessName,receiverEmail) "+
        "VALUES (CURRENT_DATE(),CURRENT_TIME(),0,?,?,0,?,?)",[message.content,message.subject,message.businessName,message.receiverEmail]);
    if (mail) {
        message.to = message.receiverEmail;
        message.html = getHTML(message.subject, message.content);
        delete message.receiverEmail;
        delete message.businessName;
        delete message.content;
        await sendMail(message);
    }
    return 204;
}

/**
 *  put the subject into an h2 tag, and the content into p tag,
 *  will return both as an html string
 * @param {string} subject
 * @param {string} content
 * @returns {string}
 */
function getHTML(subject,content){
    return `<h2>${subject}</h2><p>${content}</p>`;
}

/**
 *  convert the dateOf and timeOf strings into a one Date object that represents both
 * @param {Date|string} dateOf
 * @param {string} timeOf
 * @returns {Date}
 */
function getDate(dateOf,timeOf){
    let date = new Date(dateOf);
    let ind = timeOf.indexOf(':');
    // get the minutes, from HH:mm:ss or HH:mm
    let min = (timeOf.lastIndexOf(':')!==ind)? timeOf.substring(ind+1,timeOf.lastIndexOf(':')):timeOf.substring(ind+1);
    date.setHours(+timeOf.substring(0,ind),+min);
    return date;
}

/**
 * return date format of Y-M-d, exampe: 21-1-2021 -> 2021-01-21
 * @param {string|Date} dateOf
 * @returns {string}
 */
function getDateFormat(dateOf){
    let date = new Date(dateOf);
    return `${date.getFullYear()}-${twoDigits(date.getMonth()+1)}-${twoDigits(date.getDate())}`;
}

/**
 * returns a two digit number string, will add a zero if necessary
 * @param num
 * @returns {string|*}
 */
function twoDigits(num){
    return num<10? `0${num}`:num;
}

/**
 *  request the database to hide the message from given side
 *  is used by user.router deleteMessage and business.router deleteMessage
 * @param {number} id
 * @param {number} side    0 (user) | 1 (business)
 * @returns {Promise<number>}
 */
async function hideMessage(id,side){
    if (+id<1 || !isValidBoolean(side))
        throw 400;
    await mysql.promisePool.query(`UPDATE messages SET ${+side? "visibleBusiness":"visibleUser"}=0 WHERE id=?`,[+id]);
    return 204;
}

/**
 * catches errors, if the exception is a number (custom created) it will send it as a status code,
 * else will send the exception in the body with the status code 500
 * @param {Error|SQLError|number}err
 * @param {Request} req
 * @param {Response} res
 */
const errorHandler = (err,req,res) =>{
    if (isNaN(err) || (+err<200 || +err>299))   // an error and not 2XX code
        loggers.error(req,res,undefined,err);
    if (!isNaN(err))    // custom error, handled
        res.status(err).end();
    else    // unhandled error
        res.status(500).json(err).end();
}

module.exports = {
    errorHandler,
    getDate,
    isValidString,
    isValidBoolean,
    returnSingle,
    queryByString,
    sendMail,
    getHTML,
    getDateFormat,
    twoDigits,
    sendMessage,
    hideMessage,
    loggers,
};
