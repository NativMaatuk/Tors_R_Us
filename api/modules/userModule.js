
/**
 *  request to add a new favorite, if succeed will return 204, else throws error
 * @param {string} userEmail
 * @param {string} businessName
 * @returns {Promise<number>}
 */
async function addToFavorite(userEmail,businessName){
    if (!serviceModule.isValidString(userEmail) || !serviceModule.isValidString(businessName))
        throw 400;
    await mysql.promisePool.query("INSERT INTO favorites (businessName,userEmail) VALUES (?,?)",[businessName,userEmail]);
    return 204;
}

/**
 * request the database to the delete a favorite, return 204 if succeed or error
 * @param {string} userEmail
 * @param {string} businessName
 * @returns {Promise<number>}
 */
async function deleteFavorite(userEmail,businessName){
    if (!serviceModule.isValidString(userEmail) || !serviceModule.isValidString(businessName))
        throw 400;
    await mysql.promisePool.query("DELETE FROM favorites WHERE businessName=? AND userEmail=?",[businessName,userEmail]);
    return 204;
}

/**
 *  request the database to add a new user, if already exists will throw 409, if succeed will return the same object with activated 1
 * @param {object} user
 * @param {string} user.email
 * @param {string} user.name
 * @param {string} user.password
 * @param {string} user.phone - number (string)
 * @param {number} user.activated {1}
 * @returns {Promise<object>}
 */
async function addUser(user){
    if (!serviceModule.isValidString(user.email) || !serviceModule.isValidString(user.name) || !serviceModule.isValidString(user.password) ||isNaN(user.phone))
        throw 400;  // invalid user data
    // convert the email to lowerCase
    user.email = user.email.toLowerCase();
    if (await getByEmail(user.email))
        throw 409   // email already taken
    await mysql.promisePool.query("INSERT INTO users (email,name,password,phone,activated) VALUES (?,?,?,?,1)",[user.email,user.name,user.password,user.phone]);
    user.activated = 1;
    return user;
}

/**
 *  request the database a user with matching email, password, if one was found will return it, else throw 401 (invalid email or password)
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} | http 401
 */
async function checkLogin(email,password){
    if (!serviceModule.isValidString(email) || !serviceModule.isValidString(password))
        throw 400;  // invalid data
    // convert the email to lowerCase
    email = email.toLowerCase();
    let res = await mysql.promisePool.query("SELECT * FROM users WHERE email=? AND BINARY password=? LIMIT 1",[email,password]);
    res = serviceModule.returnSingle(res[0]);
    if (res!==null)
        return res; // user found, login successful
    throw 401;  // invalid email or password
}

/**
 * for inner use
 * request from the server the user info by his email, will return a user as object or null if not found
 * @param {string} email
 * @returns {Promise<object>}
 */
async function getByEmail(email){
    if (!serviceModule.isValidString(email))
        throw 400;  // invalid email
    let res = await mysql.promisePool.query("SELECT * FROM users WHERE email=?",[email]);
    return serviceModule.returnSingle(res[0]);   // user | null
}

/**
 * request the database to update the user to activated/deactivated,
 * if the new status is deactivated then will also deactivate all owned activated businesses, and cancel all future appointments,
 * returns 204 if all went well.
 * @param {string} email
 * @param {number} activated {0,1}
 * @returns {Promise<number>}
 */
async function toggleActivated(email,activated){
    if (!serviceModule.isValidString(email) || !serviceModule.isValidBoolean(activated))
        throw 400;  // invalid email or activated value
    activated = (+activated)? 0:1;  // flip the value
    await mysql.promisePool.query("UPDATE users SET activated = ? WHERE email = ?",[activated,email]);
    if (!activated){
        // deactivate owned businesses, deactivate active services and cancel their future appointments
        let sqlRes = await serviceModule.queryByString("SELECT name FROM businesses WHERE ownerEmail=? AND activated=1",email);
        for (let tmp of sqlRes)
            businessModule.toggleActivatedBusiness(tmp.name,1).then();

        // delete future appointments
        let apps = await mysql.promisePool.query("SELECT `appointments`.* FROM `appointments` "+
            "WHERE `appointments`.`userEmail` = ? AND TIMESTAMP(`appointments`.`dateOf`,`appointments`.`timeOf`)>CURRENT_TIMESTAMP() "+
            "ORDER BY `appointments`.`irregular` DESC",[email]);
        for (let app of apps[0])
            appointmentModule.deleteAppointment(app.id,null).then();
    }

    // sends an email
    let subject = `${activated? "Activated":"Deactivated"} user '${email}'`;
    serviceModule.sendMail({
        to: email,
        subject:subject,
        html:serviceModule.getHTML(subject,`Your User '${email}' has been ${activated? "Activated":"Deactivated"}.`)
    }).then();

    return 204;
}

/**
 * request the database to update the message, by id given, wasRead to the one given.
 * if succeed will return 204
 * @param {number} id
 * @param {boolean|number} wasRead - {0,1}
 * @returns {Promise<number>}
 */
async function toggleReadMessage(id,wasRead){
    if (+id<1 || !serviceModule.isValidBoolean(wasRead))
        throw 400;  // invalid id or wasRead value
    await mysql.promisePool.query("UPDATE messages SET wasRead=? WHERE id=?",[wasRead,id]);
    // log update read message
    serviceModule.loggers.update(undefined,undefined,{
        function:"Toggle Read Message",
        messageId:id
    });
    return 204; // the message was updated successfully
}

/**
 *  request the database to update the user, if the email is new than it will check if its taken.
 *  if all went well will return the given user argument
 * @param {object} user
 * @param {string} user.email
 * @param {string} user.name
 * @param {string} user.password
 * @param {string} user.phone - number (string)
 * @param {string} orgEmail
 * @returns {Promise<object>}
 */
async function updateUser(user,orgEmail){
    if (!serviceModule.isValidString(user.email) || !serviceModule.isValidString(user.name) || !serviceModule.isValidString(user.password) || isNaN(user.phone) || !serviceModule.isValidString(orgEmail))
        throw 400;  // invalid user data or orgEmail
    // convert the email to lowerCase
    user.email = user.email.toLowerCase();
    if (user.email!==orgEmail && await getByEmail(user.email))
        throw 409;  // new email is taken
    // get the old user info
    let oldData = serviceModule.returnSingle((await mysql.promisePool.query("SELECT * FROM `users` WHERE email=?",[orgEmail]))[0]);
    if (oldData==null)
        throw 422;  // no such user
    // execute update
    await mysql.promisePool.query("UPDATE users SET email=? , name=? , password=? , phone=? WHERE email=?",[user.email,user.name,user.password,user.phone,orgEmail]);
    // log update
    serviceModule.loggers.update(undefined,undefined,{
        function:"Update User",
        old:oldData,
        new:user
    });
    return user;    // the updated user, same as the argument
}

/**
 * query the database to update the password for the user with the matching email
 * @param {string} email 
 * @param {string} password 
 * @returns 204
 */
async function updatePassword(email, password){
    if (!serviceModule.isValidString(email) || !serviceModule.isValidString(password))
        throw 400;

    // convert the email to lowerCase
    email = email.toLowerCase();
    // get the old password, to log later
    let oldPassword = serviceModule.returnSingle((await mysql.promisePool.query("SELECT `users`.`password` as 'pass' FROM `users` WHERE `users`.`email` = ?",email))[0]);
    if (oldPassword == null)
        return 401;

    // query the database
    await mysql.promisePool.query("UPDATE users SET password=? WHERE email=?",[password,email]);
    
    // log update
    serviceModule.loggers.update(undefined,undefined,{
        function:"UpdatePassword",
        email:email,
        oldPassword:oldPassword,
        newPassword:password
    });

    return 204;
}

/**
 * initiate database example values, for the presentation
 * @returns {Promise<number>}
 */
async function initData(){
    try{
        // users
        await addUser({email:"ron@example.com",name:"Ron",password:"Abc123",activated:1,phone:"0501234567"});
        await addUser({email:"bob@example.com",name:"Bob",password:"Abc123",activated:1,phone:"0501234567"});
        await addUser({email:"jon@example.com",name:"Jon",password:"Abc123",activated:1,phone:"0501234567"});
        await addUser({email:"hannah@example.com",name:"Hannah",password:"Abc123",activated:1,phone:"0501234567"});
        await addUser({email:"jeremy@example.com",name:"Jeremy",password:"Abc123",activated:1,phone:"0501234567"});
        console.log("added users");

        // businesses
        // Rons businesses - hair salons
        await businessModule.addBusiness({name:"Rons Salon",address:"Ron Street 1",city:"Ronville",ownerEmail:"ron@example.com",activated:1,phone:"0501234567"});
        await businessModule.addBusiness({name:"Barbershop de la Vila",address:"Ron Street 2",city:"Ronville",ownerEmail:"ron@example.com",activated:1,phone:"0501234567"});
        // Bobs businesses - accounting
        await businessModule.addBusiness({name:"Bobs Accounts",address:"Bob Street 1",city:"Bobville",ownerEmail:"bob@example.com",activated:1,phone:"0501234567"});
        await businessModule.addBusiness({name:"Bobs Money",address:"Bob Street 1",city:"Bobville",ownerEmail:"bob@example.com",activated:1,phone:"0501234567"});
        // Jons businesses - karaoke and food
        await businessModule.addBusiness({name:"Jimmy Karaoke",address:"Jon Street 1",city:"Jonville",ownerEmail:"jon@example.com",activated:1,phone:"0501234567"});
        await businessModule.addBusiness({name:"Jimmy Grills",address:"Jon Street 1",city:"Jonville",ownerEmail:"jon@example.com",activated:1,phone:"0501234567"});
        // Hannahs businesses - hair salons
        await businessModule.addBusiness({name:"Pro-Hair",address:"Hannah Street 1",city:"Ronville",ownerEmail:"hannah@example.com",activated:1,phone:"0501234567"});
        await businessModule.addBusiness({name:"Running With Scissors",address:"Hannah Street 2",city:"Bobville",ownerEmail:"hannah@example.com",activated:1,phone:"0501234567"});
        // Jeremys businesses - Lawyers
        await businessModule.addBusiness({name:"Themis Scale",address:"Jeremy Street 1",city:"Jonville",ownerEmail:"jeremy@example.com",activated:1,phone:"0501234567"});
        await businessModule.addBusiness({name:"Eunomias Law",address:"Jeremy Street 2",city:"Bobville",ownerEmail:"jeremy@example.com",activated:1,phone:"0501234567"});
        console.log("added businesses");

        // updating schedules to 0800 - 1800 | 20
        let names = ["Rons Salon","Barbershop de la Vila","Bobs Accounts","Bobs Money","Jimmy Karaoke","Jimmy Grills",
            "Pro-Hair","Running With Scissors","Themis Scale","Eunomias Law"];
        for (let name of names)
            await mysql.promisePool.query("UPDATE schedules SET openTime=? , closeTime=? , jumps=? WHERE dayInWeek!=6 AND businessName=?",
                ['08:00','18:00',20,name]);
        console.log("updated schedules");

        // add services
        // Rons Salon
        await businessModule.addService({name:"Haircut",price:55,duration:25,businessName:"Rons Salon"});
        await businessModule.addService({name:"Hairwash",price:20,duration:10,businessName:"Rons Salon"});
        await businessModule.addService({name:"Highlights",price:80,duration:30,businessName:"Rons Salon"});
        await businessModule.addService({name:"Colouring",price:120,duration:65,businessName:"Rons Salon"});
        // Barbershop de la Vila
        await businessModule.addService({name:"Haircut",price:55,duration:25,businessName:"Barbershop de la Vila"});
        await businessModule.addService({name:"Hairwash",price:20,duration:10,businessName:"Barbershop de la Vila"});
        await businessModule.addService({name:"Highlights",price:80,duration:30,businessName:"Barbershop de la Vila"});
        await businessModule.addService({name:"Colouring",price:120,duration:65,businessName:"Barbershop de la Vila"});
        // Bobs Accounts
        await businessModule.addService({name:"Audit",price:320,duration:120,businessName:"Bobs Accounts"});
        await businessModule.addService({name:"Consolation",price:200,duration:60,businessName:"Bobs Accounts"});
        // Bobs Money
        await businessModule.addService({name:"Consolation",price:200,duration:60,businessName:"Bobs Money"});
        await businessModule.addService({name:"2K Loan",price:2000,duration:30,businessName:"Bobs Money"});
        await businessModule.addService({name:"5K Loan",price:5000,duration:30,businessName:"Bobs Money"});
        await businessModule.addService({name:"10K Loan",price:10000,duration:30,businessName:"Bobs Money"});
        // Jimmy Karaoke
        await businessModule.addService({name:"Half an hour session",price:80,duration:30,businessName:"Jimmy Karaoke"});
        await businessModule.addService({name:"One hour session",price:160,duration:60,businessName:"Jimmy Karaoke"});
        await businessModule.addService({name:"One and an half hour session",price:240,duration:90,businessName:"Jimmy Karaoke"});
        await businessModule.addService({name:"Two hours session",price:320,duration:120,businessName:"Jimmy Karaoke"});
        // Jimmy Grills
        await businessModule.addService({name:"Half an hour session",price:80,duration:30,businessName:"Jimmy Grills"});
        await businessModule.addService({name:"One hour session",price:160,duration:60,businessName:"Jimmy Grills"});
        await businessModule.addService({name:"One and an half hour session",price:240,duration:90,businessName:"Jimmy Grills"});
        await businessModule.addService({name:"Two hours session",price:320,duration:120,businessName:"Jimmy Grills"});
        // Pro-Hair
        await businessModule.addService({name:"Pro-Haircut",price:85,duration:25,businessName:"Pro-Hair"});
        await businessModule.addService({name:"Pro-Hairwash",price:50,duration:10,businessName:"Pro-Hair"});
        await businessModule.addService({name:"Pro-Highlights",price:110,duration:30,businessName:"Pro-Hair"});
        await businessModule.addService({name:"Pro-Coloring",price:150,duration:65,businessName:"Pro-Hair"});
        // Running With Scissors
        await businessModule.addService({name:"Half an hour run",price:60,duration:30,businessName:"Running With Scissors"});
        await businessModule.addService({name:"One hour run",price:120,duration:60,businessName:"Running With Scissors"});
        await businessModule.addService({name:"One and an half hour run",price:180,duration:90,businessName:"Running With Scissors"});
        await businessModule.addService({name:"Two hours run",price:240,duration:120,businessName:"Running With Scissors"});
        // Themis Scale
        await businessModule.addService({name:"Consolation",price:180,duration:30,businessName:"Themis Scale"});
        // Eunomias Law
        await businessModule.addService({name:"Consolation",price:180,duration:30,businessName:"Eunomias Law"});
        console.log("added services");

        // add appointments and reviews
        let getTimeFormat = (date) => {return `${serviceModule.twoDigits(date.getHours())}:${serviceModule.twoDigits(date.getMinutes())}`;};
        let now = new Date();
        let currentDate = serviceModule.getDateFormat(now);
        now.setMinutes(now.getMinutes() - 30);
        let currentTime = getTimeFormat(now);
        await appointmentModule.addAppointment(
            {
                "userEmail": "bob@example.com",
                "irregular":0,
                "dateOf":currentDate,
                "timeOf":currentTime,
                "businessName": "Rons Salon"
            },
            [
                {"id":1,"duration":10,"price":10},
                {"id":2,"duration":20,"price":20}
            ]);
        now.setMinutes(now.getMinutes() - 30);
        currentTime = getTimeFormat(now);
        await appointmentModule.addAppointment(
            {
                "userEmail": "bob@example.com",
                "irregular":0,
                "dateOf":currentDate,
                "timeOf":currentTime,
                "businessName": "Rons Salon"
            },
            [
                {"id":1,"duration":10,"price":10},
                {"id":2,"duration":20,"price":20}
            ]);
        now.setMinutes(now.getMinutes() - 30);
        currentTime = getTimeFormat(now);
        await appointmentModule.addAppointment(
            {
                "userEmail": "bob@example.com",
                "irregular":0,
                "dateOf":currentDate,
                "timeOf":currentTime,
                "businessName": "Rons Salon"
            },
            [
                {"id":1,"duration":10,"price":10},
                {"id":2,"duration":20,"price":20}
            ]);
        let review = {
            "id":1,
            "liked":1,
            "content":"Very Good",
            "businessName":"Rons Salon",
            "userEmail":"bob@example.com"
        };
        await appointmentModule.addReview(review);
        review.id += 1;
        review.content = "so and so, overall it was ok";
        await appointmentModule.addReview(review);
        review.id += 1;
        review.liked = 0;
        review.content = "meh";
        await appointmentModule.addReview(review);
        // add old appointments
        now.setMonth(now.getMonth() - 1);
        currentDate = serviceModule.getDateFormat(now);
        await appointmentModule.addAppointment(
            {
                "userEmail": "bob@example.com",
                "irregular":0,
                "dateOf":currentDate,
                "timeOf":currentTime,
                "businessName": "Rons Salon"
            },
            [
                {"id":1,"duration":10,"price":75},
                {"id":2,"duration":20,"price":75}
            ]);
        now.setMonth(now.getMonth() - 1);
        currentDate = serviceModule.getDateFormat(now);
        now.setMinutes(now.getMinutes() - 30);
        currentTime = getTimeFormat(now);
        await appointmentModule.addAppointment(
            {
                "userEmail": "bob@example.com",
                "irregular":0,
                "dateOf":currentDate,
                "timeOf":currentTime,
                "businessName": "Rons Salon"
            },
            [
                {"id":1,"duration":10,"price":50},
                {"id":2,"duration":20,"price":50}
            ]);
        now.setMonth(now.getMonth() - 1);
        currentDate = serviceModule.getDateFormat(now);
        now.setMinutes(now.getMinutes() - 30);
        currentTime = getTimeFormat(now);
        await appointmentModule.addAppointment(
            {
                "userEmail": "bob@example.com",
                "irregular":0,
                "dateOf":currentDate,
                "timeOf":currentTime,
                "businessName": "Rons Salon"
            },
            [
                {"id":1,"duration":10,"price":25},
                {"id":2,"duration":20,"price":25}
            ]);
        
        console.log("added appointments");
    } catch (e) {
        console.log("Something went wrong: "+e);
        return 401;
    }
    return 204;
}

module.exports ={
    addToFavorite,
    deleteFavorite,
    addUser,
    checkLogin,
    toggleActivated,
    toggleReadMessage,
    updateUser,
    updatePassword,
    initData
}

const mysql = require("./database");
const serviceModule = require("./service");
const businessModule = require("./businessModule");
const appointmentModule = require("./appointmentModule");
