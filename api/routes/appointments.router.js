const express = require("express");
const router = express.Router();

/**
 *  request the database to update an irregular appointment to the offer time,
 *  if the time is taken, the appointment has passed, will return http code 403, else will return http code 204 (succeed)
 *  @param {number} req.body.appId
 *  @param {time} req.body.offer
 */
router.put("/acceptOffer",(req,res)=>{
    appointmentModule.acceptOffer(req.body.appId,req.body.offer).then(value => {
        if (value===204)
            res.status(204).end();
        else
            res.status(422).end();
    }).catch(err=>serviceModule.errorHandler(err,req,res));
});

/**
 *  request the database to add a new appointment, and create its services connections,
 *  if the time is already taken will return http 403, if succeeded will send an email, set a reminder, and return the appointment.
 *  @param {{time,date,boolean,string,string}} req.body.appointment
 *  @param {object[]} req.body.services - the appointment services
 */
router.post("/addAppointment",(req,res)=>{
    appointmentModule.addAppointment(req.body.appointment,req.body.services).then(value => {
        res.json(value).end();
        serviceModule.loggers.creation(req,res,value);
    }).catch(err=>serviceModule.errorHandler(err,req,res));
});

/**
 *  request to add a new review to the database, if six hours have passed since the appointment will return http 418,
 *  if there is already a review for the appointment will return http 406, else return http 204.
 * @param {{number,boolean,string,string,string}} req.body - the review
 */
router.post("/addReview",(req,res)=>{
    appointmentModule.addReview(req.body).then(value => {
        res.status(204).end();
        serviceModule.loggers.creation(req,res,value);
    }).catch(err=>serviceModule.errorHandler(err,req,res));
});

/**
 *  returns all the appointments of given business
 * @param {string} req.params.name
 */
router.get("/getByBusiness/:name",(req,res)=>{
    appointmentModule.getByBusiness(req.params.name).then(value => {
        res.json(value).end();
    }).catch(err=>serviceModule.errorHandler(err,req,res));
});

/**
 *  returns all the appointments of given business, narrow the search by date
 * @param {string} req.params.name
 * @param {date} req.params.date
 */
router.get("/getByBusiness/:name/:date",(req,res)=>{
    appointmentModule.getByBusinessDate(req.params.name,req.params.date).then(value => {
        res.json(value).end();
    }).catch(err=>serviceModule.errorHandler(err,req,res));
});

/**
 *  return all the appointments under the given email
 * @param {string} req.params.email
 */
router.get("/getByUser/:email",(req,res)=>{
    appointmentModule.getByUser(req.params.email).then(value => {
        res.json(value).end();
    }).catch(err=>serviceModule.errorHandler(err,req,res));
});

/**
 *  return all the services related to the appointment via its id
 * @param {number} req.params.id
 */
router.get("/getServices/:id",(req,res)=>{
    appointmentModule.getServices(req.params.id).then(value => {
        res.json(value).end();
    }).catch(err=>serviceModule.errorHandler(err,req,res));
});

/**
 * delete user appointment and sends offers to all in waiting list that can fit into the open slot
 * @param {number} req.params.id
 */
router.delete("/deleteAppointment/:id",(req,res)=>{
    appointmentModule.deleteAppointment(req.params.id,null).then(value => {
        res.status(204).end();
        serviceModule.loggers.deletion(req,res,value);
    }).catch(err=>serviceModule.errorHandler(err,req,res));
});

/**
 * delete user appointment and sends offers to all in waiting list that can fit into the open slot,
 * will also send a message to the appointment's user with given content
 * @param {number} req.params.id
 * @param {string} req.params.message
 */
router.delete("/deleteAppointment/:id/:message",(req,res)=>{
    appointmentModule.deleteAppointment(req.params.id,req.params.message).then(value => {
        res.status(204).end();
        serviceModule.loggers.deletion(req,res,value);
    }).catch(err=>serviceModule.errorHandler(err,req,res));
});

module.exports = router;

const appointmentModule = require("../modules/appointmentModule");
const serviceModule = require("../modules/service");
