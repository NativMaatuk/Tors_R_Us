
/**
 *  request the database to update an irregular appointment to the offer time,
 *  if the time is taken, the appointment has passed, will throw 403, else will return 204 (succeed)
 * @param id number
 * @param offer string
 * @returns {Promise<number>}
 */
async function acceptOffer(id,offer){
    if (+id<1 || !serviceModule.isValidString(offer))
        throw 400;
    let app = await getById(id);
    if (!app)   // no such appointment
        throw 400;
    if (!app.irregular || app.timeOf !== '25:00:00' || serviceModule.getDate(app.dateOf,app.timeOf).getTime() < Date.now())
        throw 403;  // the appointment is no longer irregular or has passed
    try{
        await mysql.promisePool.query("UPDATE appointments SET irregular=0 , timeOf=? WHERE id=? AND irregular=1",[offer,id]);
    } catch (sqlException){
        throw ('45000' === sqlException.sqlState)? 403:sqlException;   // the offer is taken
    }

    // sends an email 'made an appointment'
    let mailOp = {
        to:app.userEmail,
        subject:`Accepted Appointment`,
        html: serviceModule.getHTML('Accepted Offer',`Accepted Appointment Offer for '${app.businessName}' on ${serviceModule.getDate(app.dateOf,offer).toDateString()} at ${offer}`)
    };
    serviceModule.sendMail(mailOp).then();
    // sets reminder
    setReminder(id).then();
    // checks if the schedule is full
    businessModule.checkIfScheduleFull(app.businessName,app.dateOf,true).then();

    // log update accept offer
    serviceModule.loggers.update(undefined,undefined,{
        function:"Accept Appointment Offer",
        appointmentId:id,
        offer:offer
    });

    return 204;
}

/**
 *  request the database to add a new appointment, and create its services connections,
 *  if the time is already taken will throw 403, if succeeded will send an email, set a reminder, and return 204.
 * @param app object
 * @param {string|time} app.timeOf
 * @param {string|date} app.dateOf
 * @param {boolean} app.irregular
 * @param {string} app.businessName
 * @param {string} app.userEmail
 * @param {number} app.scheduleId - will be fetched from the database
 * @param {number} app.id - will be fetched from the database
 * @param {object[]} services
 * @returns {Promise<object>}
 */
async function addAppointment(app,services){
    if (!services.length || !serviceModule.isValidString(app.timeOf) || !serviceModule.isValidString(app.dateOf)
    || !serviceModule.isValidString(app.businessName) || !serviceModule.isValidString(app.userEmail)
    || !serviceModule.isValidBoolean(app.irregular))
        throw 400;
    let totalPrice,totalDuration;
    totalPrice = totalDuration = 0;
    // check the services, and calculate totals
    services.forEach((item)=>{
        if (item.id<1 || +item.duration<0 || +item.price<0)
            throw 400;
        totalPrice += item.price;
        totalDuration += item.duration;
    });

    // if irregular set the time;
    if (app.irregular)
        app.timeOf = "25:00:00";
    // get the scheduleId
    let schedule = await mysql.promisePool.query("SELECT getSchedule(?,?) AS 'res'",[app.businessName,app.dateOf]);
    app.scheduleId = +schedule[0][0].res;
    let res;
    // query
    try {
        res = await mysql.promisePool.query("INSERT INTO appointments (timeOf,dateOf,totalDuration,totalPrice,irregular,completed,businessName,userEmail,scheduleId) " +
            "VALUES (?,?,?,?,?,0,?,?,?)", [app.timeOf, app.dateOf, +totalDuration, +totalPrice, +app.irregular, app.businessName, app.userEmail, +app.scheduleId]);
    } catch (sqlException){
        throw ('45000' === sqlException.sqlState)? 403:sqlException;   // the time is taken
    }
    app.id = res[0].insertId; // fetch the id

    // create the services connections
    services.forEach((item)=>{
        mysql.pool.query("INSERT INTO appointmentServices (appointmentId , serviceId) VALUES (?,?)",
            [+app.id,+item.id]);
    });

    // sends an email, appointment made
    let mailOp = {
        to:app.userEmail,
        subject:`Appointment Made`,
        html: serviceModule.getHTML('Appointment Made',`Made an appointment for '${app.businessName}' on ${serviceModule.getDate(app.dateOf,app.timeOf).toDateString()} ${app.irregular? 'for the waiting list':`at ${app.timeOf}`}`)
    };
    serviceModule.sendMail(mailOp).then();

    if (!app.irregular) {
        // set reminder if non irregular
        setReminder(app.id).then();
        // checks if the schedule is full
        businessModule.checkIfScheduleFull(app.businessName,app.dateOf,true).then();
    }

    return app;
}

/**
 *  request to add a new review to the database, if six hours have passed since the appointment will throw 418,
 *  if there is already a review for the appointment will throw 406, else return 204.
 * @param {object} review
 * @param {number} review.id - same as the appointment's
 * @param {boolean} review.liked
 * @param {string} review.content - can be empty
 * @param {string} review.businessName
 * @param {string} review.userEmail
 * @returns {Promise<number>}
 */
async function addReview(review){
    if (+review.id<1 || +review.liked<0 || +review.liked>1 || !serviceModule.isValidString(review.businessName)
        || !serviceModule.isValidString(review.userEmail))
        throw 400;
    // if passed six hours, can't make a review
    let app = await getById(review.id);
    let date = serviceModule.getDate(app.dateOf,app.timeOf);
    if (Date.now() - date.getTime() > 21600000)
        throw 418;  // can't make an appointment, ether the time has passed or appointment is in the future
    try {
        await mysql.promisePool.query("INSERT INTO reviews (liked,content,businessName,userEmail,appointmentId,id) VALUES (?,?,?,?,?,?)",
            [+review.liked,review.content,review.businessName,review.userEmail,+review.id,+review.id]);
    } catch (sqlException){
        throw (sqlException.sqlState === '45000')? 406:sqlException;    // there is already an appointment
    }
    return 204;
}

/**
 *   have inner use
 *  returns all the appointments of given business
 *  newly completed appointments will be updated
 * @param {string} name
 * @returns {Promise<Object[]>}
 */
async function getByBusiness(name){
    return checkIfCompleted(await serviceModule.queryByString("SELECT * FROM appointments WHERE businessName=? ORDER BY dateOf,timeOf ASC",name));
}

/**
 *   have inner use
 *  returns all the appointments of given business, narrow the search by date
 *  newly completed appointments will be updated
 * @param {string} name
 * @param {date} date
 * @returns {Promise<Object[]>}
 */
async function getByBusinessDate(name,date){
    if (!serviceModule.isValidString(name) || !serviceModule.isValidString(date))
        throw 400;
    let res = await mysql.promisePool.query("SELECT * FROM appointments WHERE businessName=? AND dateOf=? ORDER BY dateOf,timeOf ASC",
        [name,date]);
    return checkIfCompleted(res[0]);
}

/**
 * return all the appointments under the user email
 *  newly completed appointments will be updated
 * @param {string} email
 * @returns {Promise<Object[]>}
 */
async function getByUser(email){
    return checkIfCompleted(await serviceModule.queryByString("SELECT * FROM appointments WHERE userEmail=? ORDER BY dateOf,timeOf ASC",email));
}

/**
 * have no use
 * @param {string} name
 * @param {date} date
 * @param {time} time
 * @returns {Promise<Object[]>}
 */
/*
async function getByTimeDate(name,date,time){
    if (!serviceModule.isValidString(name) || !serviceModule.isValidString(date) || !serviceModule.isValidString(time))
        throw 400;
    let res = await mysql.promisePool.query("SELECT * FROM appointments WHERE businessName=? AND timeOf=? AND dateOf=? ORDER BY dateOf,timeOf",
        [name,time,date]);
    return serviceModule.returnSingle(res[0]);
}
*/

/**
 * return the services related to the appointment's id
 * @param {number} id
 * @returns {Promise<object[]>}
 */
async function getServices(id){
    if (+id<1)
        throw 400;
    let res = await mysql.promisePool.query("SELECT `services`.* FROM `appointmentservices` "+
        "INNER JOIN `services` ON `appointmentservices`.`serviceId` = `services`.`id` "+
        "WHERE `appointmentservices`.`appointmentId` = ?;",[+id]);
    return res[0];
}

/**
 * for inner use
 * update the appointment to completed, returns 204 if succeeded.
 * @param {number} id
 * @returns {Promise<number>}
 */
async function toggleCompleted(id){
    if (+id<1)
        throw 400;
    await mysql.promisePool.query("UPDATE appointments SET completed=1 WHERE id=?",[+id]);
    // log update id completed
    serviceModule.loggers.update(undefined,undefined,{
        function:"Toggle Completed Appointment",
        appointmentId:id
    });
    return 204;
}

/**
 * add a message to the database that is type offer,
 * and sends an email to the email argument
 * @param {number} id
 * @param {time} offer
 * @param {string} businessName
 * @param {string} receiverEmail
 * @returns {Promise<number>}
 */
async function sendOffer(id,offer,businessName,receiverEmail){
    if (+id<1 || !serviceModule.isValidString(offer) || !serviceModule.isValidString(businessName) || !serviceModule.isValidString(receiverEmail))
        throw 400;
    // prepares the message info
    let content = `An opening was made and you can have an appointment at ${offer} at '${businessName}. If its still available you can accept it by clicking on the button`;
    let obj = JSON.stringify({
        appointmentId:id,
        offer:offer
    });
    // add a message with the offer
    await mysql.promisePool.query("INSERT INTO messages (dateOf,timeOf,wasRead,content,subject,messageType,obj,businessName,receiverEmail) "+
        "VALUES (CURRENT_DATE(),CURRENT_TIME(),0,?,'Appointment Offer',2,?,'Tors R Us',?)",
        [content,obj,receiverEmail]);

    // prepares the email info
    content = `An opening was made and you can have an appointment at ${offer} at '${businessName}'. If its still available you can accept it by going into your inbox and clicking the button in the message.`;
    let mailOp = {
        to:receiverEmail,
        subject:"Appointment Offer",
        html: serviceModule.getHTML("Appointment Offer",content)
    };
    // sends the email
    await serviceModule.sendMail(mailOp);
    return 204;
}

/**
 * delete user appointment and sends offers to all in waiting list that can fit into the open slot,
 * if message argument isn't null then it was the business that cancelled and will send an email to client,
 * if message was null then it was the client that cancelled and will send an email to owner
 * @param {number} id
 * @param {string|null} message  - if not null will send message and email to user, cancelled appointment
 * @returns {Promise<number>}
 */
async function deleteAppointment(id,message){
    if (+id<1 || (message!=null && !serviceModule.isValidString(message)))
        throw 400;
    let app = await getById(+id);   // get the rest of the appointment's info
    if (!app) throw 400;
    // delete the appointment from the database
    await mysql.promisePool.query("DELETE FROM appointments WHERE id=?",[+id]);
    // if the appointment was a regular one, will send offers to the waiting list
    if (!app.irregular){
        let list = await getIrregularList(app.businessName,serviceModule.getDateFormat(app.dateOf));
        for (let tmp of list){
            if (tmp.totalDuration > app.totalDuration)
                continue;   // the irregular appointment won't fit in the newly open time
            sendOffer(tmp.id,app.timeOf,app.businessName,tmp.userEmail).then();
        }
    }
    // message have content (was cancelled by business), sends a message and email to user
    if (message!=null){
        await serviceModule.sendMessage({
            subject:"Business Cancelled Appointment",
            content:`${app.businessName} cancelled you appointment on ${serviceModule.getDate(app.dateOf,app.timeOf).toDateString()} ${app.timeOf!=='25:00:00'? app.timeOf:''}. `+
                `Message from business: "${message}".`,
            businessName:app.businessName,
            receiverEmail:app.userEmail
        },true);
    }
    else{   // no message content (was cancelled by user), sends an email to the business owner, and message to client
        let owner = await businessModule.getOwner(app.businessName);
        let content = `${app.businessName} - Client cancelled an appointment on ${serviceModule.getDate(app.dateOf,app.timeOf).toDateString()} ${app.timeOf!=='25:00:00'? app.timeOf:''}.`;
        await serviceModule.sendMessage({
            subject:"Client Cancelled Appointment",
            content:content,
            businessName:app.businessName,
            receiverEmail:app.userEmail
        },false);
        serviceModule.sendMail({
            to:owner.email,
            subject: "Client Cancelled Appointment",
            html: serviceModule.getHTML("Client Cancelled Appointment",content)
        }).then().catch(err=> {
            throw err
        });
    }
    return 204;
}

/**
 * query the database for an appointment with matching id to the one given.
 * returns the appointment if succeed else will throw error
 * @param {number} id
 * @returns {Promise<object>}
 */
async function getById(id){
    if (+id<1)
        throw 400   // invalid id
    let res = await mysql.promisePool.query("SELECT * FROM `appointments` WHERE id = ? LIMIT 1",[+id]);
    return serviceModule.returnSingle(res[0]);
}

/**
 * set a timer to send a reminder via email, if by the time the timer completed,
 * if the appointment got cancelled than the mail won't be sent.
 * @param {number} id
 * @returns {Promise<void>}
 */
async function setReminder(id){
    let app = await getById(id);    // also checks the id
    if (!app)   // no such appointment
        throw 400;
    // prepare mail data
    let mailOp = {
        to:app.userEmail,
        subject:"Appointment Reminder",
        html:`<h2>${app.businessName} ${app.timeOf} Appointment</h2><p>` +
            `You have an appointment at '${app.businessName}' at ${app.timeOf}.` +
            `</p>`
    };
    // get appointment's and current time
    let date = serviceModule.getDate(app.dateOf,app.timeOf);
    date.setMinutes(date.getMinutes()-15);
    let diff = date.getTime() - Date.now(); // how long until appointment's time (minus 15 minutes)
    if (diff>0) {   // more then 15 minutes to the appointment's time
        setTimeout(() => {  // set a timeout function
            getById(id).then(value => { // checks if the appointments still in system
                if (!value) return; // no such appointment, cancel reminder
                serviceModule.sendMail(mailOp).then();  // still have appointment, sends reminder email
            })
        }, diff);
    }
    else    // less then 15 minutes to appointment's time
        serviceModule.sendMail(mailOp).then();  // sends reminder email now
}

/**
 * any appointment in the array that is regular and has passed will be updated to completed
 * @param {object[]} arr
 */
function checkIfCompleted(arr){
    for (let i=0;i<arr.length;i++)
        if (!arr[i].irregular && !arr[i].completed && serviceModule.getDate(arr[i].dateOf,arr[i].timeOf).getTime() <= Date.now()){
            toggleCompleted(arr[i].id).then();
            arr[i].completed = 1;
        }
    return arr;
}

/**
 * for inner use
 * return all irregular appointments at business in given date
 * @param {string} name
 * @param {string} date
 */
async function getIrregularList(name,date){
    if (!serviceModule.isValidString(name) || !serviceModule.isValidString(date))
        throw 400;
    let res = await mysql.promisePool.query("SELECT * FROM appointments WHERE businessName=? AND dateOf=? AND irregular=1",
        [name,date]);
    return res[0];
}

module.exports = {
    acceptOffer,
    addAppointment,
    addReview,
    getByBusiness,
    getByBusinessDate,
    getByUser,
    getServices,
    deleteAppointment,

}

const mysql = require("./database");
const serviceModule = require("./service");
const businessModule = require("./businessModule");

// initialize all the future regular appointments reminders
mysql.promisePool.query("SELECT id FROM `appointments` app WHERE TIMESTAMP(app.dateOf,app.timeOf) > NOW() AND irregular=0").then(
    value => {
        let ids = value[0];
        ids.forEach(id=>setReminder(id['id']))
    }
).catch();
