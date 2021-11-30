const express = require("express");
const router = express.Router();

/**
 *  request the database to add given business, if succeed will return the same object with activated = 1.
 * @param {object} req.body - Business
 */
router.post("/addBusiness",(req,res)=>{
    businessModule.addBusiness(req.body).then((value)=>{
        res.json(value).end();
        serviceModule.loggers.creation(req,res,value);
    }).catch((err)=>serviceModule.errorHandler(err,req,res));
});

/**
 *  request the database to add a new service, if succeed will return the object with the inserted id and activated = 1
 * @param {object} req.body - Service
 */
router.post("/addService",(req,res)=>{
    businessModule.addService(req.body).then((value)=>{
        res.json(value).end();
        serviceModule.loggers.creation(req,res,value);
    }).catch((err)=>serviceModule.errorHandler(err,req,res));
});

/**
 * request from database all the business owned by given user's email
 * @param {string} req.params.email
 */
router.get("/getByOwner/:email",(req,res)=>{
    serviceModule.queryByString("SELECT * FROM businesses WHERE ownerEmail=?",req.params.email).then((value)=>{
        res.json(value).end();
    }).catch((err)=>serviceModule.errorHandler(err,req,res));
});

/**
 * request from database all the business owned by given user's email
 * @param {string} req.params.name
 */
router.get("/getByName/:name",(req,res)=>{
    businessModule.getByName(req.params.name).then((value)=>{
        res.json(value).end();
    }).catch((err)=>serviceModule.errorHandler(err,req,res));
});

/**
 * request from database all messages under the given business name
 * @param {string} req.params.name
 */
router.get("/getOutbox/:name",(req,res)=>{
    serviceModule.queryByString("SELECT messages.*, users.name AS 'receiverName' FROM `messages` " +
        "INNER JOIN `users` ON users.email = messages.receiverEmail " +
        "WHERE (dateOf < CURRENT_DATE() OR (dateOf = CURRENT_DATE() AND timeOf <= CURRENT_TIME())) AND visibleBusiness=1 AND businessName = ? " +
        "ORDER BY dateOf DESC,timeOf DESC",req.params.name).then((value)=>{
        res.json(value).end();
    }).catch((err)=>serviceModule.errorHandler(err,req,res));
});

/**
 *  request the database to hide the message from the business
 * @param {number} req.body.id
 */
router.put("/deleteMessage",(req,res)=>{
    serviceModule.hideMessage(req.body.id,1).then(value => {
        res.status(value).end();
    }).catch(err => serviceModule.errorHandler(err,req,res));
});

/**
 * request from database all reviews under the given business name
 * @param {string} req.params.name
 */
router.get("/getReviews/:name",(req,res)=>{
    serviceModule.queryByString("SELECT * FROM reviews WHERE businessName=? ORDER BY id DESC",req.params.name).then((value)=>{
        res.json(value).end();
    }).catch((err)=>serviceModule.errorHandler(err,req,res));
});

/**
 * request from the database all the schedules related to the business, unless name = "tors r us", will return Schedule[7]
 * @param {string} req.params.name
 */
router.get("/getSchedules/:name",(req,res)=>{
    serviceModule.queryByString("SELECT * FROM schedules WHERE businessName=? ORDER BY dayInWeek ASC",req.params.name).then((value)=>{
        res.json(value).end();
    }).catch((err)=>serviceModule.errorHandler(err,req,res));
});

/**
 * request from the database all the schedules related to the business, unless name = "tors r us", will return Schedule[7]
 * @param {string} req.params.name
 */
router.get("/getServices/:name",(req,res)=>{
    serviceModule.queryByString("SELECT * FROM services WHERE businessName=?",req.params.name).then((value)=>{
        res.json(value).end();
    }).catch((err)=>serviceModule.errorHandler(err,req,res));
});

/**
 *  request from the database all business with similar name to the one given, and not related to the given email
 * @param {string} req.params.name
 * @param {string} req.params.userEmail
 */
router.get("/searchByName/:name/:userEmail",(req,res)=>{
    businessModule.searchByName(req.params.name, req.params.userEmail).then((value => {
        res.json(value).end();
    })).catch((err)=>serviceModule.errorHandler(err,req,res));
})
/**
 *  request from the database all business that offer services similar to the ones given, and not related to the given email
 * @param {string} req.params.names
 * @param {string} req.params.userEmail
 */
router.get("/searchByServices/:names/:userEmail",(req,res)=>{
    businessModule.searchByServices(req.params.names,req.params.userEmail).then((value => {
        res.json(value).end();
    })).catch((err)=>serviceModule.errorHandler(err,req,res));
})

/**
 * narrow the services search by a time, max difference is one hour
 * @param {string} req.params.names
 * @param {string} req.params.userEmail
 * @param {time} req.params.time
 * @param {string} req.params.date
 */
router.get("/searchByTimeServices/:names/:userEmail/:date/:time",(req,res)=>{
    businessModule.searchByTimeServices(req.params.names,req.params.userEmail,req.params.date,req.params.time).then((value => {
        res.json(value).end();
    })).catch((err)=>serviceModule.errorHandler(err,req,res));
})

/**
 * request the database to add a new message, without sending an mail
 * @param {object} req.body - contains Message json
 * @param {string} req.params.sendMail
 */
router.post("/sendMessage",(req,res)=>{
    serviceModule.sendMessage(req.body,false).then((value => {
        res.status((value===204)? 204:422).end();
        serviceModule.loggers.creation(req,res,value);
    })).catch((err)=>serviceModule.errorHandler(err,req,res));
})

/**
 * request the database to add a new message, and sends an email to the receiver address if semMail true
 * @param {object} req.body - contains Message json
 * @param {boolean} req.req.sendMail
 */
router.post("/sendMessage/:sendMail",(req,res)=>{
    serviceModule.sendMessage(req.body,req.params.sendMail).then((value => {
        res.status((value===204)? 204:422).end();
        serviceModule.loggers.creation(req,res,value);
    })).catch((err)=>serviceModule.errorHandler(err,req,res));
})

/**
 * returns all the free time in the given date of the business with their duration,
 * if the schedule jump on the date is zero, the business is closed and will return an empty array
 * @param {string} req.params.name
 * @param {string} req.params.date
 */
router.get("/getFreeTimes/:name/:date",(req,res)=>{
    businessModule.getFreeTimes(req.params.name,req.params.date).then((value => {
        res.json(value).end();
    })).catch((err)=>serviceModule.errorHandler(err,req,res));
})

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
 * @param {string} req.params.name
 */
router.get("/getStatistics/:name",(req,res)=>{
    businessModule.getStatistics(req.params.name).then(value => {
        res.json(value).end();
    }).catch(err=>serviceModule.errorHandler(err,req,res));
})

/**
 *  request the database to update a business, if succeed will return the argument service.
 * @param {object} req.body.business - contains Business data
 * @param {string} req.body.orgName - contains Business data
 */
router.put("/updateBusiness",(req,res)=>{
    businessModule.updateBusiness(req.body.business,req.body.orgName).then((value => {
        res.json(value).end();
    })).catch((err)=>serviceModule.errorHandler(err,req,res));
})

/**
 *  request the database to update a service, if succeed will return the argument service.
 * @param {object} req.body - contains Service data
 */
router.put("/updateService",(req,res)=>{
    businessModule.updateService(req.body).then((value => {
        res.json(value).end();
    })).catch((err)=>serviceModule.errorHandler(err,req,res));
})

/**
 * request the database to update a schedule, will return the same object if succeed.
 * @param {object} req.body - contains Schedule data
 */
router.put("/updateSchedule",(req,res)=>{
    businessModule.updateSchedule(req.body).then((value => {
        res.json(value).end();
    })).catch((err)=>serviceModule.errorHandler(err,req,res));
})

/**
 * activate / deactivate the service by given id and current activated state,
 * if the new state is 0 (deactivated) will also cancel all future appointments related to the service,
 * return http 204 if succeed.
 * @param {string} req.body.name
 * @param {number} req.body.activated
 */
router.put("/toggleActivatedBusiness",(req,res)=>{
    businessModule.toggleActivatedBusiness(req.body.name,+req.body.activated).then((value => {
        res.status(204).end();
        if (+req.body.activated===0)  // if the user was deactivated
            serviceModule.loggers.activation(req,res,value);
        else
            serviceModule.loggers.deactivation(req,res,value);
    })).catch((err)=>serviceModule.errorHandler(err,req,res));
})

/**
 * activate / deactivate the service by given id and current activated state,
 * if the new state is 0 (deactivated) will also cancel all future appointments related to the service,
 * return http 204 if succeed.
 * @param {number} req.body.id
 * @param {number} req.body.activated
 */
router.put("/toggleActivatedService",(req,res)=>{
    businessModule.toggleActivatedService(+req.body.id,+req.body.activated).then((value => {
        res.status(204).end();
        if (+req.body.activated===0)  // if the user was deactivated
            serviceModule.loggers.activation(req,res,value);
        else
            serviceModule.loggers.deactivation(req,res,value);
    })).catch((err)=>serviceModule.errorHandler(err,req,res));
})


module.exports = router;

const businessModule = require("../modules/businessModule");
const serviceModule = require("../modules/service");
