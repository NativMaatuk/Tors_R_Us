DROP DATABASE IF EXISTS projectDB;
CREATE DATABASE projectDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE projectDB;

/* ------------ Tables ------------ */
CREATE TABLE users(
	email VARCHAR(50) NOT NULL,
	name VARCHAR(50) NOT NULL,
	password VARCHAR(50) NOT NULL,
	phone VARCHAR(10),
	activated INT NOT NULL,	/* 0 - deactivated, 1 - activated */
	PRIMARY KEY(email)
) ENGINE = INNODB;

CREATE TABLE businesses(
	name VARCHAR(50) NOT NULL,
	phone VARCHAR(10),
	address VARCHAR(50) NOT NULL,
	city VARCHAR(50) NOT NULL,
	ownerEmail VARCHAR(50) NOT NULL,	/* 'own' connection */
	activated INT NOT NULL,	/* 0 - deactivated, 1 - activated */
	PRIMARY KEY(name),
	FOREIGN KEY (ownerEmail)
	REFERENCES users(email) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = INNODB;

CREATE TABLE services(
	id INT NOT NULL AUTO_INCREMENT,
	name VARCHAR(50) NOT NULL,
	duration INT NOT NULL,
	price INT NOT NULL,
	businessName VARCHAR(50) NOT NULL,	/* 'offers' connection */
	activated INT NOT NULL,
	primary KEY(id),
	FOREIGN KEY (businessName)
	REFERENCES businesses(name) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = INNODB;

CREATE TABLE schedules(
	id INT NOT NULL AUTO_INCREMENT,
	dayInWeek INT NOT NULL,	/* 0-6 */
	openTime TIME NOT NULL,
	closeTime TIME NOT NULL,
	jumps INT NOT NULL,
	businessName VARCHAR(50) NOT NULL, /* 'have' connection */
	PRIMARY KEY(id),
	FOREIGN KEY (businessName)
	REFERENCES businesses(name) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = INNODB;

CREATE TABLE appointments(
	id INT NOT NULL AUTO_INCREMENT,
	timeOf TIME NOT NULL,
	dateOf DATE NOT NULL,	/* new column for easy access to the date */
	totalDuration INT,		/* how long the appointment takes in minutes */
	totalPrice INT,
	irregular INT NOT NULL,
	completed INT NOT NULL,		/* new column for easy access to check if completed */
	businessName VARCHAR(50) NOT NULL, /* 'Made at' connection */
	userEmail VARCHAR(50) NOT NULL,		/* 'make' connection */
	scheduleId INT NOT NULL,
	PRIMARY KEY(id),
	FOREIGN KEY (businessName)
	REFERENCES businesses(name) ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY (userEmail)
	REFERENCES users(email) ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY (scheduleId)
	REFERENCES schedules(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = INNODB;

CREATE TABLE reviews(
	id INT NOT NULL ,	/* Will be the same id as the appointment */
	liked INT,
	content TEXT,
	businessName VARCHAR(50) NOT NULL, /* 'have' connection */
	userEmail VARCHAR(50) NOT NULL,		/* 'write' connection */
	appointmentId INT NOT NULL UNIQUE,	/* review <- -> appointment connection */
	PRIMARY KEY(id),
	FOREIGN KEY (businessName)
	REFERENCES businesses(name) ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY (userEmail)
	REFERENCES users(email) ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY (appointmentId)
	REFERENCES appointments(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = INNODB;

/* Adds the reviewId foreign key */
ALTER TABLE appointments
ADD COLUMN reviewId INT AFTER userEmail,	/* review <- -> appointment connection */
ADD FOREIGN KEY (reviewId)
REFERENCES reviews(id);

CREATE TABLE messages(
	id INT NOT NULL AUTO_INCREMENT,
	dateOf DATE NOT NULL,
	timeOf TIME NOT NULL,
	wasRead INT NOT NULL,	/* 1 or 0 */
	content TEXT NOT NULL,
	subject TEXT NOT NULL,
	businessName varchar(50) NOT NULL,
	receiverEmail VARCHAR(50) NOT NULL,		/* 'receive' connection */
	messageType INT NOT NULL,	/* 0 - regular, 1 - review, 2 - appointment offer */
	visibleUser INT NOT NULL,	/* 0|1 - in/visible to user */
	visibleBusiness INT NOT NULL,	/* 0|1 - in/visible to business */
	obj JSON,	/* have json content if type!=0 */
	PRIMARY KEY(id),
	FOREIGN KEY (businessName)
	REFERENCES businesses(name) ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY (receiverEmail)
	REFERENCES users(email) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = INNODB;

CREATE TABLE favorites(	/* users <-- --> businesses */
	businessName VARCHAR(50) NOT NULL,
	userEmail VARCHAR(50) NOT NULL,
	FOREIGN KEY (businessName)
	REFERENCES businesses(name) ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY (userEmail)
	REFERENCES users(email) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = INNODB;

CREATE TABLE appointmentServices(	/* appointments <-- --> services */
	appointmentId INT NOT NULL,
	serviceId INT NOT NULL,
	FOREIGN KEY (appointmentId)
	REFERENCES appointments(id) ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY (serviceId)
	REFERENCES services(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = INNODB;

/* ------------ Tors R Us values ------------ */
INSERT INTO `users` (email,name,password,phone,activated) VALUES ('Tors R Us','Tors R Us','','',0);
INSERT INTO `businesses` (name,ownerEmail,address,city,phone,activated) VALUES ('Tors R Us','Tors R Us','','','',0);

/* ------------ Functions ------------ */

/* returns the schedule's id of business in the date given */
CREATE FUNCTION getSchedule(
    businessName VARCHAR(50),
    dateOf DATE
) RETURNS INT DETERMINISTIC RETURN(
    SELECT
        `schedules`.`id`
    FROM
        `schedules`
    WHERE
        `schedules`.`businessName` = businessName AND `schedules`.`dayInWeek` =(DAYOFWEEK(dateOf) -1));

/* Returns timeOf + totalDuration (minutes) */
CREATE FUNCTION getEndTime(dateOf DATE, timeOf TIME, totalDuration INT) RETURNS TIME DETERMINISTIC
RETURN DATE_ADD(TIMESTAMP(dateOf,timeOf),INTERVAL totalDuration MINUTE);

/* returns if there is a review to an appointment by it's id, 1 or 0 */
CREATE FUNCTION hasReview(id INT) RETURNS INT RETURN(
    SELECT
        COUNT(`reviews`.`id`)
    FROM
        `reviews`
    WHERE
        `reviews`.`appointmentId` = id
);

/* returns 1 if a business offer a service with similler name else 0*/
CREATE FUNCTION hasLikeService(
    businessName VARCHAR(50),
    serviceName VARCHAR(50)
) RETURNS INT RETURN(
    SELECT
        COUNT(*)
    FROM
        `services`
    WHERE
        `services`.`businessName` = businessName AND `services`.`activated` = 1 AND `services`.`name` LIKE CONCAT("%", serviceName, "%")
);

/* returns the total earnings of a business in given year month, if no data was found will return zero, will be used for calculating statistics */
CREATE FUNCTION getYearMonthEarnings(
    businessName VARCHAR(50),
    dateOf DATE
) RETURNS INT RETURN COALESCE(
    (
        SELECT
            SUM(`appointments`.`totalPrice`) AS res
        FROM
            `appointments`
        WHERE
            `appointments`.`businessName` = businessName
        	AND `appointments`.`completed` = 1
        	AND YEAR(`appointments`.`dateOf`) = YEAR(dateOf)
        	AND MONTH(`appointments`.`dateOf`) = MONTH(dateOf)
    ),0);

/* returns how many appointments are in the argument's time range */
DELIMITER ///
CREATE FUNCTION isTaken(
    businessName VARCHAR(50),
    dateOf DATE,
    timeOf TIME,
    totalDuration INT
) RETURNS INT BEGIN
    DECLARE
        endTime TIME ;
    SET
        endTime = getEndTime(dateOf, timeOf, totalDuration) ;
    RETURN (
        SELECT COUNT(*) FROM `appointments` WHERE
        `appointments`.`businessName`=businessName AND
        `appointments`.`dateOf`=dateOf AND
        	(
            	`appointments`.`timeOf`=timeOf OR
                (`appointments`.`timeOf`<timeOf AND
                 getEndTime(`appointments`.`dateOf`,`appointments`.`timeOf`,`appointments`.`totalDuration`)>timeOf) OR
                (`appointments`.`timeOf`>timeOf AND `appointments`.`timeOf`<endTime)
            )
        );
END ///

/* ------------ Triggers ------------ */

/* auto creates the schedules when inserting a new business */
DELIMITER ///
CREATE TRIGGER addSchedules AFTER INSERT ON
    `businesses` FOR EACH ROW
BEGIN
    INSERT INTO `schedules`(
        dayInWeek,
        openTime,
        closeTime,
		jumps,
        businessName
    )
VALUES(0, '', '', 0, NEW.name),(1, '', '', 0, NEW.name),(2, '', '', 0, NEW.name),(3, '', '', 0, NEW.name),(4, '', '', 0, NEW.name),(5, '', '', 0, NEW.name),(6, '', '', 0, NEW.name);
END; ///

/* Add a reminder message upon new non irregular appointment */
DELIMITER ///
CREATE TRIGGER addReminder AFTER INSERT ON
    `appointments` FOR EACH ROW
BEGIN
    DECLARE
        stamp DATETIME ;
    SET
        stamp = DATE_ADD(
            TIMESTAMP(NEW.dateOf,NEW.timeOf),
            INTERVAL -15 MINUTE
        ) ; IF NEW.irregular = 0 THEN
    INSERT INTO `messages`(
        dateOf,
        timeOf,
        wasRead,
        content,
		subject,
		messageType,
        businessName,
        receiverEmail
    )
VALUES(
    DATE_FORMAT(stamp,"%Y-%m-%d"),
    DATE_FORMAT(stamp,"%H:%i:%s"),
    0,
    CONCAT(
        "Reminder: You have an appointment today at \"",
        NEW.businessName,
        "\" in ",
        NEW.timeOf
    ),
	"Reminder",
	0,
    "Tors R Us",
    NEW.userEmail
) ;
END IF ;
END ; ///

/* upon updating an appointment to non irregular will create a reminder message */
DELIMITER ///
CREATE TRIGGER updateReminder AFTER UPDATE
ON
    `appointments` FOR EACH ROW
BEGIN
    DECLARE
        stamp DATETIME ;
    SET
        stamp = DATE_ADD(
            TIMESTAMP(NEW.dateOf, NEW.timeOf),
            INTERVAL -15 MINUTE
        ) ; IF OLD.irregular = 1 AND NEW.irregular = 0 THEN
    INSERT INTO `messages`(
        dateOf,
        timeOf,
        wasRead,
        content,
		subject,
		messageType,
        businessName,
        receiverEmail
    )
VALUES(
    DATE_FORMAT(stamp, "%Y-%m-%d"),
    DATE_FORMAT(stamp, "%H:%i:%s"),
    0,
    CONCAT(
        "Reminder: You have an appointment today at \"",
        NEW.businessName,
        "\" in ",
        NEW.timeOf
    ),
	"Reminder",
	0,
    "Tors R Us",
    NEW.userEmail
) ;
END IF ;
END ; ///

/* upon deleting a non irregular appointment will also delete the message */
DELIMITER ///
CREATE TRIGGER deleteReminder AFTER DELETE
ON
    `appointments` FOR EACH ROW
BEGIN
    DECLARE
        stamp DATETIME ;
    SET
        stamp = DATE_ADD(
            TIMESTAMP(OLD.dateOf, OLD.timeOf),
            INTERVAL -15 MINUTE
        ) ; IF OLD.irregular = 0 THEN
    DELETE
FROM
    `messages`
WHERE
    businessName = 'Tors R Us' AND receiverEmail = OLD.userEmail AND content = CONCAT(
        "Reminder: You have an appointment today at \"",
        OLD.businessName,
        "\" in ",
        OLD.timeOf
    ) AND dateOf = DATE_FORMAT(stamp, "%Y-%m-%d") AND timeOf = DATE_FORMAT(stamp, "%H:%i:%s") ;
END IF ;
END ; ///

/* Add review message on toggling completed appointment */
DELIMITER ///
CREATE TRIGGER addReviewMessage AFTER UPDATE
ON
    `appointments` FOR EACH ROW
BEGIN
    IF OLD.completed = 0 AND NEW.completed = 1 AND NEW.irregular = 0 THEN
    INSERT INTO `messages`(
        dateOf,
        timeOf,
        wasRead,
        content,
		subject,
		messageType,
		obj,
        businessName,
        receiverEmail
    )
VALUES(
    CURRENT_DATE(),
    CURRENT_TIME(),
    0,
    CONCAT(
        "Review: After your appointment on ",
		NEW.dateOf,
		" ",
		NEW.timeOf,
		" If you would you like to give a review to \"",
        NEW.businessName,
        "\" Click the button:"
    ),
	"Review",
	1,
	JSON_OBJECT('appointmentId',NEW.id,'businessName',NEW.businessName,'userEmail',NEW.userEmail),
    "Tors R Us",
    NEW.userEmail
) ;
END IF ;
END ; ///

/* Checks if the time is taken before inserting */
DELIMITER ///
CREATE TRIGGER checkIfTaken BEFORE INSERT ON `appointments` FOR EACH ROW
BEGIN
	IF (TIME_FORMAT(NEW.timeOf,'%H:%i')!='25:00' AND isTaken(NEW.businessName,NEW.dateOf,NEW.timeOf,NEW.totalDuration)>0)
    THEN
    	SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The time is already taken';
    END IF;
END ///

/* Checks if the time is taken before updating */
DELIMITER ///
CREATE TRIGGER checkOffer BEFORE UPDATE ON `appointments` FOR EACH ROW
BEGIN
	IF (TIME_FORMAT(OLD.timeOf,'%H:%i')='25:00' AND TIME_FORMAT(NEW.timeOf,'%H:%i')!='25:00' AND isTaken(NEW.businessName,NEW.dateOf,NEW.timeOf,NEW.totalDuration)>0)
    THEN
    	SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The time is already taken';
    END IF;
END ///

/* upon updating service price and duration will update the totals of all future appointments related to it */
DELIMITER ;
CREATE TRIGGER onUpdateService AFTER UPDATE
ON
    `services` FOR EACH ROW
UPDATE
    `appointments`
INNER JOIN `appointmentservices` ON `appointmentservices`.`appointmentId` = `appointments`.`id`
SET
    `appointments`.`totalDuration` = `appointments`.`totalDuration` +(NEW.`duration` - OLD.`duration`),
    `appointments`.`totalPrice` = `appointments`.`totalPrice` +(NEW.`price` - OLD.`price`)
WHERE
    `appointmentservices`.`serviceId` = NEW.`id` AND TIMESTAMP(
        `appointments`.`dateOf`,
        `appointments`.`timeOf`
    ) > CURRENT_TIMESTAMP();

/* if the appointment already have a review will throw error */
DELIMITER ///
CREATE TRIGGER checkHasReview BEFORE INSERT ON `reviews` FOR EACH ROW
BEGIN
	IF (hasReview(NEW.id)>0)
    THEN
    	SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The appointment already have a review';
    END IF;
END ///

/* Auto set the id same as the appointment's */
DELIMITER ;
CREATE TRIGGER reviewGiveId BEFORE INSERT ON
    `reviews` FOR EACH ROW
	SET NEW.id = NEW.appointmentId;

/* set the appointment's reviewId same as its review */
DELIMITER ;
CREATE TRIGGER updateAppointmentReviewId AFTER INSERT ON
    `reviews` FOR EACH ROW
		UPDATE `appointments` SET `appointments`.`reviewId` = NEW.appointmentId WHERE `appointments`.`id` = NEW.appointmentId;

/* initialize the visible columns of the message */
DELIMITER ;
CREATE TRIGGER setVisibleMessage BEFORE INSERT ON `messages` FOR EACH ROW
SET NEW.`visibleUser`=1 , NEW.`visibleBusiness`=1;