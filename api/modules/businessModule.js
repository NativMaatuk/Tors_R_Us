
/**
 *  query the database to add given business, if succeed will return the same object with activated = 1.
 * @param {object} business
 * @param {string} business.name
 * @param {string} business.phone
 * @param {string} business.address
 * @param {string} business.city
 * @param {string} business.ownerEmail
 * @param {number} business.activated {1}
 * @returns {Promise<object>}
 */
async function addBusiness(business){
    if (!serviceModule.isValidString(business.name) || isNaN(business.phone) || !serviceModule.isValidString(business.address)
        || !serviceModule.isValidString(business.city) || !serviceModule.isValidString(business.ownerEmail))
        throw 400;      // invalid business data
    if (await getByName(business.name))
        throw 303;  // name already taken
    await mysql.promisePool.query("INSERT INTO businesses (name,phone,address,city,ownerEmail,activated) VALUES (?,?,?,?,?,1)",
        [business.name,business.phone,business.address,business.city,business.ownerEmail]);
    business.activated = 1;
    return business;
}

/**
 *  query the database to add a new service, if succeed will return the object with the inserted id and activated = 1
 * @param {object} serviceData
 * @param {number} serviceData.id
 * @param {string} serviceData.name
 * @param {number} serviceData.duration
 * @param {number} serviceData.price
 * @param {string} serviceData.businessName
 * @param {number} serviceData.activated {1}
 * @returns {Promise<object>}
 */
async function addService(serviceData){
    if (!serviceModule.isValidString(serviceData.name) || +serviceData.duration<0 || +serviceData.price<0 || !serviceModule.isValidString(serviceData.businessName))
        throw 400;  // invalid service data
    let res = await mysql.promisePool.query("INSERT INTO services (name,duration,price,businessName,activated) VALUES (?,?,?,?,1)",
        [serviceData.name,serviceData.duration,serviceData.price,serviceData.businessName]);
    // get and put in the object the id and activated values
    serviceData.id = res[0].insertId;
    serviceData.activated = 1;
    return serviceData;
}

/**
 * query the database for all the businesses with similer name to the name given, and only those that not related to the email given
 * @param {string} namem 
 * @param {string} userEmail 
 * @returns 
 */
async function searchByName(name, userEmail){
    if (!serviceModule.isValidString(name) || !serviceModule.isValidString(userEmail))
        return [];
    let res = await mysql.promisePool.query("SELECT * FROM businesses WHERE name like ? AND ownerEmail <> ? AND activated=1",[`%${name}%`,userEmail]);
    return res[0];
}

/**
 * query the database for all the businesses that offer services similar to the ones given, and not related to the userEmail
 * @param {string} names
 * @param {string} userEmail
 * @returns {Promise<object[]>}
 */
async function searchByServices(names,userEmail){
    if (!serviceModule.isValidString(names) || !serviceModule.isValidString(userEmail))
        return [];
    // remove empty values
    let arr = names.split(",").filter((item)=>serviceModule.isValidString(item));
    if (!arr.length)
        return [];
    // add the like %% and build the condition
    let cond = "hasLikeService(`businesses`.`name`,?)>0 AND ".repeat(arr.length);
    // add the userEmail to the parameters
    arr.push(userEmail);
    // query
    let res = await mysql.promisePool.query("SELECT `businesses`.* FROM `businesses` "+
            "WHERE "+cond+"`businesses`.`activated`=1 AND `businesses`.`ownerEmail`<>?",arr);
    return res[0];
}

/**
 *  returns all businesses that have similier services, and not related to the userEmail, along with closest time to the one give on given date
 * @param {string} names
 * @param {string} userEmail
 * @param {string|date} date
 * @param {string|time} timeOf
 * @returns {Promise<object[]>} - each item {business:Business , time:string}
 */
async function searchByTimeServices(names,userEmail,date,timeOf){
    if (!serviceModule.isValidString(names) || !serviceModule.isValidString(date) || !serviceModule.isValidString(timeOf))
        return [];

    /**
     * return the similar services of given business
     * @param {string} businessName
     * @returns {Promise<object>}
     */
    let getServices = async (businessName)=>{
        let res = await mysql.promisePool.query("SELECT `services`.* FROM `services` " +
            "WHERE `services`.`name` REGEXP ? AND `services`.`businessName`=? AND `services`.`activated`=1",[arr.join('|'),businessName]);
        res = res[0];
        let duration = 0;
        res.forEach((item)=>duration+=item.duration);
        return {res:res,duration:duration};
    }

    /**
     * returns the closest time to the request by an hour differance, null if non was found
     * @param {{time,number}[]} times - an array of {timeOf,duration}
     * @param {number} duration
     * @returns object
     */
    let getClosestTime = (times,duration) =>{
        let res = null, min = -1;
        let tmpStamp;
        for (let tmp of times){
            tmpStamp = Date.parse(`${date} ${tmp.timeOf}`);
            if (tmp.duration >= duration && Math.abs(stamp-tmpStamp)<=3600000
                && (res==null || Math.abs(stamp-tmpStamp) < Math.abs(stamp-min))){
                res = tmp;
                min = tmpStamp;
            }
        }
        return res;
    }

    // remove invalid service names and create the condition
    let arr = names.split(",").filter((item)=>serviceModule.isValidString(item));
    if (!arr.length)
        return [];  // no valid name

    let stamp = Date.parse(`${date} ${timeOf}`);    // timestamp of the request time
    let businesses = await searchByServices(names,userEmail); // all businesses with similar services
    let res = [];   // the result array
    for (let val of businesses){
        let times = await getFreeTimes(val.name,date);  // get the free time on given date
        if (!times.length) continue;    // no free times on given date for the business
        let services = await getServices(val.name);   // get the similar services
        if (!services.res.length) continue; // no similar services
        let req = getClosestTime(times,services.duration);
        if (!req) continue;
        res.push({business:val,time:req.timeOf});
    }
    return res;
}

/**
 * calculate and return all the free time in the given date of the business with their duration,
 * if the schedule jump on the date is zero, the business is closed and will return an empty array
 * @param {string} name
 * @param {string|date} date
 * @returns {Promise<object[]>}
 */
async function getFreeTimes(name,date){
    if (!serviceModule.isValidString(name) || !serviceModule.isValidString(date))
        throw 400;
    /**
     *  check if there is a taken time overlapping or one in the future after the time give.
     *  if overlapping will return the end time of the overlapped appointment
     *  if there is one in the future after the time given will return how long until the future appointment
     *  else return 0, there are no appointments left to check, can continue to add until the end
     * @param time number
     * @returns {[number, number]}
     */
    let isTaken = (time) =>{
        let start,end;
        for (let tmp of taken){     // tmp = {timeOf:number , totalDuration:number}
            start = Date.parse(`${date} ${tmp.timeOf}`);
            end = start + tmp.totalDuration*60000;
            if (start===time || (start<time && end>time))
                return [-1,end];
            else if (start>time)
                return [1,(start-time)/60000];
        }
        return [0,0];
    }
    // get taken times
    let taken = await getTakenTimes(name,date);
    // initialize schedule variables
    let schedule = await getScheduleByDay(name,new Date(date).getDay());
    if (!schedule || !schedule.jumps)
        return [];  // business is closed on that day
    let jumps = schedule.jumps;
    let time = new Date(`${date} ${schedule.openTime}`).getTime();
    let end;
    if (Date.now() > time) {    // if on current day, openTime is before current time, will get the next time slot as the start
        time = Date.now();  // get current time
        end = time - (time % (jumps * 60000));  // get previous time slot
        if (end < time) // check if before current time
            time += (jumps * 60000);    // advance to next slot
    }
    end= new Date(`${date} ${schedule.closeTime}`).getTime();

    // initialize result variable
    let res = [];
    let toNext = 0;

    // the last appointment in taken times
    let lastApp;
    if (taken.length){
        let tmp = taken[taken.length-1];
        lastApp = Date.parse(`${date} ${tmp.timeOf}`)+tmp.totalDuration*60000;
    }
    else
        lastApp = 0;
    // calculate the times
    let check;
    outer: while (time<end){
        if (lastApp>time){
            if (toNext<1) {
                check = isTaken(time);
                switch (check[0]) {
                    case 1:     // there is toNext time until the next appointment, won't check until toNext==0
                        toNext = check[1];
                        res.push({'timeOf': time, 'duration': toNext});
                        toNext -= jumps;
                        break;
                    case -1:    // the appointment is overlapping another, will move the time to after the appointment is done
                        time = check[1] - (check[1] % (jumps * 60000));
                        if (time >= check[1])
                            continue outer;
                        break;
                    case 0:     // so it won't add jumps*60000
                        res.push({'timeOf': time, 'duration': (end - time) / 60000});
                        break;
                }
            } else{
                res.push({'timeOf': time, 'duration': toNext});
                toNext -= jumps;
            }
        } else  // there are no appointments left to check, will continue to add until endTime
            res.push({'timeOf':time,'duration':(end-time)/60000});
        time += jumps * 60000;
    }

    // converting to date string format
    for (let i=0; i<res.length;i++) {
        let date = new Date(res[i].timeOf);
        res[i].timeOf = `${serviceModule.twoDigits(date.getHours())}:${serviceModule.twoDigits(date.getMinutes())}`;
    }
    return res;
}

/**
 * activate / deactivate given business by name and current activated state,
 * if the new state equals zero, then will also deactivate all active services, and cancel all future appointments
 * @param {string} name
 * @param {number} activated
 * @returns {Promise<number>}
 */
async function toggleActivatedBusiness(name,activated){
    if (!serviceModule.isValidString(name) || !serviceModule.isValidBoolean(activated))
        throw 400;
    activated = +activated? 0:1;
    await mysql.promisePool.query("UPDATE businesses SET activated=? WHERE name=?",[activated,name]);

    // if the new activated state equals zero, toggle all activated services, which would also cancel future appointments
    if (!activated){
        let services = await serviceModule.queryByString("SELECT id FROM services WHERE businessName=? AND activated=1",name);
        for (let tmp of services)
            toggleActivatedService(tmp.id,1).then();
    }
    let owner = await getOwner(name);
    let subject = `${activated? "Activated":"Deactivated"} Business '${name}'`;
    serviceModule.sendMail({
        to: owner.email,
        subject:subject,
        html:serviceModule.getHTML(subject,`Your business '${name}' has been ${activated? "Activated":"Deactivated"}.`)
    }).then();
    return 204;
}

/**
 * activate / deactivate the service by given id and current activated state,
 * if the new state is 0 (deactivated) will also cancel all future appointments related to the service,
 * returns 204
 * @param {number} id
 * @param {number} activated
 * @returns {Promise<number>}
 */
async function toggleActivatedService(id,activated){
    if (+id<1 || !serviceModule.isValidBoolean(activated))
        throw 400;
    activated = activated? 0:1;
    await mysql.promisePool.query("UPDATE services SET activated=? WHERE id=?",[activated,id]);

    // if new activated state equals zero, cancel all future appointments related to the service
    if (!activated){
        let sqlRes = await mysql.promisePool.query("SELECT `appointments`.* FROM `appointmentservices` "+
            "INNER JOIN `appointments` ON `appointments`.`id` = `appointmentservices`.`appointmentId` "+
            "WHERE `appointmentservices`.`serviceId` = ? AND TIMESTAMP(`appointments`.`dateOf`,`appointments`.`timeOf`)>CURRENT_TIMESTAMP() "+
            "ORDER BY `appointments`.`irregular` DESC",[id]);
        sqlRes = sqlRes[0];
        for (let app of sqlRes)
            appointmentModule.deleteAppointment(app.id,`we longer offer the service you requested`).then();
    }
    return 204;
}

/**
 *	Returns the statistics of business and forecast as assoc array:
 *  totalEarnings - number
 *  servicesCounter - 2D array [ 'name' => serviceId , 'value' => counter ]
 *  popularService - array [ 'name' => serviceId , 'value' => counter ] | null
 *  popularDay - day (0-6) | null
 *  popularTime - 2D array [ 'name' => dayNum , 'value' => time (H:i:s) ]   // empty days won't be in the array
 *  monthEarnings - 2D array [ 'name' => year-month-01 (Y-M-01) , 'value' => totalSum ]
 *  curentPrediction - number | null    // predict current month earnings, if one of the last three months had zero profit then null (insufficient data)
 *  futurePrediction - number | null    // predict next month earnings, if one of the last three months had zero profit then null (insufficient data)
 * @param {string} name
 * @returns {Promise<{}>}
 */
async function getStatistics(name){
    if (!serviceModule.isValidString(name))
        throw 400;
    /*
    // get the extra data for calculations, appointments, services, and schedules
    let appointments = await appointmentModule.getByBusiness(name);
    let services = await serviceModule.queryByString("SELECT * FROM services WHERE businessName=?",name);
    let schedules = await serviceModule.queryByString("SELECT * FROM schedules WHERE businessName=? ORDER BY dayInWeek ASC",name);
     */

    // initialize data object
    let data = {};
    let sqlRes;

    // calculate total earnings
    data.totalEarnings = serviceModule.returnSingle(await serviceModule.queryByString(
        "SELECT SUM(`appointments`.`totalPrice`) AS `res` FROM `appointments` " +
            "WHERE `appointments`.`completed`=1 AND `appointments`.`businessName`=?",name));
    data.totalEarnings = (data.totalEarnings===null)? 0 : data.totalEarnings.res;

    // calculate service counter, and most popular service
    data.servicesCounter = [];
    let max = -1;
    // get the counters
    sqlRes = await mysql.promisePool.query("SELECT `appointmentservices`.`serviceId`, "+
        "COUNT(`appointmentservices`.`serviceId`) AS 'totalCount', `services`.`price` FROM `appointmentservices` "+
        "INNER JOIN `services` ON `appointmentservices`.`serviceId` = `services`.`id` AND `services`.`businessName` = ? "+
        "INNER JOIN `appointments` ON `appointments`.`id` = `appointmentservices`.`appointmentId` AND `appointments`.`completed` = 1 AND `appointments`.`businessName` = ? "+
        "GROUP BY `serviceId`",[name,name]);
    sqlRes = sqlRes[0];
    for (let i=0;i<sqlRes.length;i++){
        if (max === -1 || data.servicesCounter[max] < sqlRes[i].totalCount)
            max = i;
        data.servicesCounter.push({name:sqlRes[i].serviceId,value:sqlRes[i].totalCount});
    }
    data.popularService = (max!==-1)? data.servicesCounter[max]:null;

    // calculate the most popular day
    sqlRes = await mysql.promisePool.query("SELECT COUNT(appointments.scheduleId) AS 'max', "+
        "schedules.dayInWeek AS 'day' FROM `appointments` "+
        "INNER JOIN `schedules` ON appointments.scheduleId = schedules.id "+
        "WHERE appointments.businessName = ? AND appointments.completed = 1 "+
        "GROUP BY appointments.scheduleId ORDER BY COUNT(appointments.scheduleId) DESC LIMIT 1",[name]);
    sqlRes = serviceModule.returnSingle(sqlRes[0]);
    if (sqlRes)
        data.popularDay = sqlRes.day;
    else
        data.popularDay = null;

    // calculate most popular time each day, days without a result will be ignored;
    data.popularTime = [];
    let getDay = async (day) =>{
        sqlRes = await mysql.promisePool.query("SELECT appointments.timeOf as 'time' FROM `appointments` "+
            "INNER JOIN `schedules` ON schedules.id = appointments.scheduleId "+
            "WHERE appointments.businessName = ? AND schedules.dayInWeek = ? AND appointments.irregular != 1 GROUP BY appointments.timeOf "+
            "ORDER BY COUNT(appointments.timeOf) DESC LIMIT 1",[name,day]);
        return serviceModule.returnSingle(sqlRes[0]);
    }
    for (let i=0;i<7;i++){
        let tmp = await getDay(i);
        if (!tmp) continue;
        data.popularTime.push({name:i,value:tmp.time});
    }

    // calculate month earnings
    data.monthEarnings = [];
    let date = new Date();
    date.setDate(1);
    let calcMonth = async (str) =>{
        sqlRes = await mysql.promisePool.query("SELECT getYearMonthEarnings(?,?) as res",[name,str]);
        return serviceModule.returnSingle(sqlRes[0]);
    }
    for (let i=0;i<7;i++){
        let format = serviceModule.getDateFormat(date.toDateString());
        let tmp = await calcMonth(format);
        data.monthEarnings.push({name:format,value:tmp.res});
        date.setDate(0);    // previous month
        date.setDate(1);    // first day of the month
    }

    // calculate moving average, only if the business had earnings for the last three months
    let avg,counter;
    avg = counter = 0;
    for (let i=1;i<4;i++){
        if (!data.monthEarnings[i].value) {
            counter++;
            break;  // insufficient data
        }
        avg += data.monthEarnings[i].value;
    }
    if (!counter && avg){
        data.currentPrediction = Math.round(avg/3);
        data.futurePrediction = Math.round((avg - data.monthEarnings[3].value + data.currentPrediction)/3);
    }
    else
        data.currentPrediction = data.futurePrediction = null;

    return data;
}

/**
 *  query the database to update a business, if the name was changed will check if the new name is available,
 *  will return the same business argument if succeed
 * @param {object} business
 * @param {string} business.name
 * @param {string} business.phone - number (string)
 * @param {string} business.address
 * @param {string} business.city
 * @param {string} orgName
 * @returns {Promise<object>}
 */
async function updateBusiness(business,orgName){
    if (!serviceModule.isValidString(business.name) || isNaN(+business.phone) || !serviceModule.isValidString(business.address)
        || !serviceModule.isValidString(business.city) || !serviceModule.isValidString(orgName))
        throw 400;
    if (business.name!= orgName && (await getByName(business.name)) != null)
        throw 303;
    // get old business info
    let oldData = serviceModule.returnSingle((await mysql.promisePool.query("SELECT * FROM `businesses` WHERE name=?",[orgName]))[0]);
    if (oldData==null)
        throw 422;  // no such business
    // execute query
    let res = await mysql.promisePool.query("UPDATE businesses SET name=? , phone=? , address=? , city=? WHERE name=?",
        [business.name,+business.phone,business.address,business.city,orgName]);
    // log update
    serviceModule.loggers.update(undefined,undefined,{
        function:"Update Business",
        old:oldData,
        new:business
    });
    return res[0];
}

/**
 *  query the database to update a service, if succeed will return the service argument.
 * @param {object} service
 * @param {number} service.id
 * @param {number} service.price
 * @param {number} service.duration
 * @param {string} service.name
 * @returns {Promise<object>}
 */
async function updateService(service){
    if (+service.id<1 || +service.price<0 || !+service.duration<0 || !serviceModule.isValidString(service.name))
        throw 400;
    // get old service info
    let oldData = serviceModule.returnSingle((await mysql.promisePool.query("SELECT * FROM `services` WHERE id=?",[+service.id]))[0]);
    // execute update
    await mysql.promisePool.query("UPDATE services SET name=? , duration=? , price=? WHERE id=?",
        [service.name,+service.duration,+service.price,+service.id]);
    // log update
    serviceModule.loggers.update(undefined,undefined,{
        function:"Update Service",
        old:oldData,
        new:service
    });
    return service;
}

/**
 *  query the database to update a schedule, if succeed will return the schedule argument.
 * @param {object} schedule
 * @param {number} schedule.id
 * @param {string} schedule.openTime
 * @param {string} schedule.closeTime
 * @param {number} schedule.jumps
 * @returns {Promise<object>}
 */
async function updateSchedule(schedule){
    if (+schedule.id<1 || +schedule.jumps<0 || !serviceModule.isValidString(schedule.openTime) || !serviceModule.isValidString(schedule.closeTime))
        throw 400;
    //  get old schedule info
    let oldData = serviceModule.returnSingle((await mysql.promisePool.query("SELECT * FROM `schedules` WHERE id=?",[+schedule.id]))[0]);
    // execute update
    await mysql.promisePool.query("UPDATE schedules SET openTime=? , closeTime=? , jumps=? WHERE id=?",
        [schedule.openTime,schedule.closeTime,+schedule.jumps,+schedule.id]);
    // log update
    serviceModule.loggers.update(undefined,undefined,{
        function:"Update Schedule",
        old:oldData,
        new:schedule
    });
    return schedule;
}

/**
 * for inner user
 * get from the database all the taken times and their duration in given date,
 * the return object array item structure is { timeOf , totalDuration }.
 * @param {string} name
 * @param {string|date} date
 * @returns {Promise<object[]>}
 */
async function getTakenTimes(name,date){
    if (!serviceModule.isValidString(name) || !serviceModule.isValidString(date))
        throw 400;
    let res = await mysql.promisePool.query("SELECT timeOf,totalDuration FROM appointments "+
        "WHERE businessName=? AND dateOf=? AND irregular=0 ORDER BY timeOf ASC",[name,date]);
    return res[0];
}

/**
 * have inner use
 * query the database a business matching to the one given, if there is one will return it, else return null
 * @param {string} name
 * @returns {Promise<object|null>}
 */
async function getByName(name){
    if (!serviceModule.isValidString(name))
        throw 400;  // invalid name
    let res = await mysql.promisePool.query("SELECT * FROM businesses WHERE name=?",[name]);
    return serviceModule.returnSingle(res[0]);
}

/**
 * for inner use
 * query the database for the business schedule of given day in week
 * @param {string} name
 * @param {number}day - {0-6}
 * @returns {Promise<object|null>}
 */
async function getScheduleByDay(name,day){
    if (!serviceModule.isValidString(name) || +day<0 || +day>6)
        throw 400;
    let res = await mysql.promisePool.query("SELECT * FROM schedules WHERE dayInWeek=? AND businessName=?",[+day,name]);
    return serviceModule.returnSingle(res[0]);
}

/**
 * have no use
 * query the database for the service of given id
 * @param {number} id
 * @returns {Promise<object|null>}
 */
/*
async function getServiceById(id){
    if (+id<1)
        throw 400;
    let res = await mysql.promisePool.query("SELECT * FROM services WHERE id=?",[+id]);
    return serviceModule.returnSingle(res[0]);
}
*/

/**
 *  for inner use
 *  returns the owner User info of given business
 * @param {string} name
 * @returns {Promise<object>}
 */
async function getOwner(name){
    if (!serviceModule.isValidString(name)) throw 400;
    let res = await mysql.promisePool.query("SELECT `users`.* FROM `businesses` "+
        "INNER JOIN `users` ON `businesses`.`ownerEmail` = `users`.`email` "+
        "WHERE `businesses`.`name` = ? LIMIT 1",[name]);
    return serviceModule.returnSingle(res[0]);
}

/**
 *
 * @param {string} name
 * @param {string|date} date
 * @param {boolean} message
 * @returns {Promise<boolean>}
 */
async function checkIfScheduleFull(name,date,message){
    let times = await getFreeTimes(name,date);
    if (times.length) return false;
    if (message){
        let owner = await getOwner(name);
        let dateStr = new Date(date).toDateString();
        serviceModule.sendMessage({
            subject:`Schedule Full on ${dateStr}`,
            businessName:'Tors R Us',
            receiverEmail:owner.email,
            content:`${name} - Schedule is full on ${dateStr}`,
        },true).then();
    }
    return true;
}

module.exports = {
    addBusiness,
    addService,
    getByName,
    searchByName,
    searchByServices,
    searchByTimeServices,
    getFreeTimes,
    updateSchedule,
    updateService,
    updateBusiness,
    getOwner,
    checkIfScheduleFull,
    getStatistics,
    toggleActivatedBusiness,
    toggleActivatedService
}

const mysql = require("./database");
const serviceModule = require("./service");
const appointmentModule = require("./appointmentModule");
