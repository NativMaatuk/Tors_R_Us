const express = require("express");
const router = express.Router();

/**
 * request the database to add a favorite.
 * expects userEmail and businessName, if succeed will return http 204
 * @param {string} req.body.userEmail
 * @param {string} req.body.businessName
 */
router.post("/addFavorite",(req,res)=>{
    usersModule.addToFavorite(req.body.userEmail,req.body.businessName).then((value)=>{
        res.status(204).end();
        serviceModule.loggers.creation(req,res,value);
    }).catch((err)=>serviceModule.errorHandler(err,req,res));
});

/**
 * request the database to delete a favorite.
 * expects userEmail and businessName, if succeed will return http 204
 * @param {string} req.params.email
 * @param {string} req.params.name
 */
router.delete("/deleteFavorite/:email/:name",(req,res)=>{
    usersModule.deleteFavorite(req.params.email,req.params.name).then((value)=>{
        res.status(204).end();
        serviceModule.loggers.deletion(req,res,value);
    }).catch((err)=>serviceModule.errorHandler(err,req,res));
});

/**
 * request to get from the database all favorite businesses under given email
 * @param {string} req.params.email
 */
router.get("/getFavorites/:email",(req,res)=>{
    serviceModule.queryByString("SELECT " +
        "`businesses`.*"+
        "FROM `favorites`"+
        "INNER JOIN `businesses` ON `favorites`.`businessName` = `businesses`.`name`"+
        "WHERE `favorites`.`userEmail` = ? AND `businesses`.`activated`=1",req.params.email).then((value)=>{
        res.json(value).end();
    }).catch((err)=>serviceModule.errorHandler(err,req,res));
});

/**
 * request the database to add a new user
 * expects the user info in body, if succeed will return the same object with activated 1
 * @param {object} req.body - User object
 */
router.post("/addUser",(req,res)=>{
    usersModule.addUser(req.body).then((value)=>{
        res.json(value).end();
        serviceModule.loggers.creation(req,res,value);
    }).catch((err)=>serviceModule.errorHandler(err,req,res));
});

/**
 * check if there is a user with matching email, password to those given, if so will return his info else 401 http code
 * the password will be encrypted in AES with the email as the key
 * @var crypto.AES - AES decryption
 * @param {string} req.params.email
 * @param {string} req.params.password - aes256 encrypted, the email is the key
 */
router.get("/checkLogin/:email/:password",(req,res)=>{
    // decrypt password, using AES with the email as the key
    let password = crypto.AES.decrypt(req.params.password,req.params.email).toString(crypto.enc.Utf8);
    usersModule.checkLogin(req.params.email,password).then((value)=>{
        res.json(value).end();
    }).catch((err)=>serviceModule.errorHandler(err,req,res));
});

/**
 * request from the database all messages under the given email
 * @param {string} req.params.email
 */
router.get("/getInbox/:email",(req,res)=>{
    serviceModule.queryByString("SELECT * FROM messages " +
        "WHERE (dateOf<CURRENT_DATE() OR (dateOf=CURRENT_DATE() AND timeOf<=CURRENT_TIME())) AND visibleUser=1 AND receiverEmail=? "+
        "ORDER BY dateOf DESC,timeOf DESC",req.params.email).then((value)=>{
        res.json(value).end();
    }).catch((err)=>serviceModule.errorHandler(err,req,res));
});

/**
 *  request the database to hide the message from the user
 * @param {number} req.body.id
 */
router.put("/deleteMessage",(req,res)=>{
    serviceModule.hideMessage(req.body.id,0).then(value => {
        res.status(value).end();
    }).catch(err => serviceModule.errorHandler(err,req,res));
});

/**
 * request from the database all reviews under the given email
 * @param {string} req.params.email
 */
router.get("/getReviews/:email",(req,res)=>{
    serviceModule.queryByString("SELECT * FROM reviews WHERE userEmail=? ORDER BY id DESC",req.params.email).then((value)=>{
        res.json(value).end();
    }).catch((err)=>serviceModule.errorHandler(err,req,res));
});

/**
 * request the database to update the user to activated/deactivated,
 * if the new status is deactivated then will also deactivate all owned activated businesses, and cancel all future appointments,
 * returns status 204 if all went well.
 * @param {string} req.body.email
 * @param {boolean|number}req.body.activated
 */
router.put("/toggleActivated",(req,res)=>{
    usersModule.toggleActivated(req.body.email,+req.body.activated).then((value)=>{
        res.status(204).end();
        if (+req.body.activated===0)  // if the user was deactivated
            serviceModule.loggers.activation(req,res,value);
        else
            serviceModule.loggers.deactivation(req,res,value);
    }).catch((err)=>serviceModule.errorHandler(err,req,res));
});

/**
 * request the database to update message, by given id, to read/notRead,
 * returns status 204 if all went well.
 * @param {number} req.body.id
 * @param {boolean|number} req.body.wasRead
 */
router.put("/toggleReadMessage",(req,res)=>{
    usersModule.toggleReadMessage(req.body.id,req.body.wasRead).then((value)=>{
        res.status(204).end();
    }).catch((err)=>serviceModule.errorHandler(err,req,res));
});

/**
 *  request the database to update the user, if the email is new than it will check if its taken.
 *  if all went well will return the given user argument.
 * @param {{email:string,name:string,password:string,phone:string|number}} req.body.user
 * @param {string} req.body.orgEmail
 */
router.put("/updateUser",(req,res)=>{
    usersModule.updateUser(req.body.user,req.body.orgEmail).then((value)=>{
        res.json(value);
    }).catch((err)=>serviceModule.errorHandler(err,req,res));
});

/**
 * sends an email with the code, will return the same code in result
 * @param {string} req.params.email
 */
router.get("/getValidation/:email",(req,res)=>{
    let code = "";
    // generate code
    for (let i=0;i<4;i++)
        code += Math.floor(Math.random()*10);
    // prepare and send email
    serviceModule.sendMail({
        to:req.params.email,
        subject:"Tors-R-Us validation code",
        html:`<h4>Validation code</h4><p>The code is: <b>${code}</b></p>`
    }).then(()=>res.json(code).end()).catch(err => serviceModule.errorHandler(err,req,res));
});

/**
 * query the database to update the user's password
 * @param {string} req.body.email
 * @param {string} req.body.password
 */
router.put("/updatePassword",(req,res)=>{
    usersModule.updatePassword(req.body.email,req.body.password).then((value)=>{
        // return 204, successfully updated
        res.json(value).end();
    }).catch(err => serviceModule.errorHandler(err,req,res));
});

/**
 * initiate presentation data route
 */
router.post("/initData",(req,res)=>{
    usersModule.initData().then(val=>res.status(+val).end());
})

module.exports = router;

const usersModule = require("../modules/userModule");
const serviceModule = require("../modules/service");
const crypto = require("crypto-js");
