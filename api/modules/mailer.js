const nodemailer = require("nodemailer");

/**
 * Singleton Mailer class that create a transporter to send mails via Tors.R.Us.project@gmail.com address
 */
const Mailer = (function (){
    "use strict";
    let instance;

    function Singleton(){
        // take care of singleton
        if (instance) return instance;
        instance = this;

        // create a transport
        this.transporter = nodemailer.createTransport({
            host:"smtp.gmail.com",
            port: 465,
            secure:true,
            auth:{
                user:"Tors.R.Us.project@gmail.com",
                pass:"tors_r_us"
            }
        });
    }

    // return ether instance and if there is none will  return new instance
    Singleton.getInstance = () => {return instance || new Singleton()};

    return Singleton;
}());

module.exports = new Mailer();  // exports singleton instance
