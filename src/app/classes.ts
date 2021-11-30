import { DatePipe } from "@angular/common";
import { FormControl, FormGroup } from "@angular/forms";

export class Functions{

    // the create functions used to clone objects arrays, that were received from the server

    static createBusinessArray(arr:Business[]):Business[]{
        let res:Business[] = [];
        arr.forEach((item)=>res.push(Business.clone(item)));
        return res;
    }
    static createScheduleArray(arr:Schedule[]):Schedule[]{
        let res:Schedule[] = [];
        arr.forEach((item)=>res.push(Schedule.clone(item)));
        return res;
    }
    static createServiceArray(arr:Service[]):Service[]{
        let res:Service[] = [];
        arr.forEach((item)=>res.push(Service.clone(item)));
        return res;
    }
    static createMessageArray(arr:Message[]):Message[]{
        let res:Message[] = [];
        arr.forEach((item)=>res.push(Message.clone(item)));
        return res;
    }
    static createReviewArray(arr:Review[]):Review[]{
        let res:Review[] = [];
        arr.forEach((item)=>res.push(Review.clone(item)));
        return res;
    }

    /**
     * 
     * @param dateOf string - {yyyy-MM-dd} string format of date. Example: 2000-12-31
     * @param timeOf string - {HH:ii} string format of time. Example: 12:59
     * @returns Date - date variable of given date and time
     */
    static getDate(dateOf:string, timeOf:string):Date{
        return new Date(dateOf+" "+timeOf);
    }

    static dateToString(dateOf:string): string {
        let twoDigits = (num) => {return (num<10)? "0"+num:num};
        let date:Date = new Date(dateOf);
        return `${date.getFullYear()}-${twoDigits(date.getMonth()+1)}-${twoDigits(date.getDate())}`;
    }

    static getDaysArray(): string[] {
        return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    }

    /**
     * Returns an array with the dates in the given month in the given year
     * @param year number
     * @param month number
     * @returns Map<number,Date[]>
     */
    static getMonthCalendar(year:number,month:number):Map<number,Date[]>{
        let res:Map<number,Date[]> = new Map<number,Date[]>();
        let date:Date = new Date(year,month,1);
        let num, offset = date.getDay()-1;
        while (date.getMonth()==month){
            num = Math.floor((date.getDate()+offset)/7);
            if (!res.has(num))
                res.set(num,[]);
            res.get(num).push(new Date(date));
            date.setDate(date.getDate()+1);
        }
        return res;
    }

    /**
     * Returns the array with the start and end padded with null values, will be used to create a table
     * @param map map:Map<number,Date[]> - the return value of the function above
     * @returns map:Map<number,Date[]>
     */
    static padDateArray(map:Map<number,Date[]>): Map<number,Date[]>{
        let lastWeek:Date[] = map.get(map.size-1);
        let lastOffset = 6 - lastWeek[lastWeek.length-1].getDay();
        let firstOffset = map.get(0)[0].getDay();
        for (let i=0;i < firstOffset;i++)
            map.get(0).unshift(null);
        for (let i=0;i < lastOffset;i++)
            lastWeek.push(null);
        return map;
    }
}

export class User{

    constructor(public email:string,public name:string,public password:string,public phone:string, public activated:number){
    }

    static clone(user:User):User {
        return new User(user.email,user.name,user.password,user.phone,user.activated);
    }
    /*
    constructor(user:User){
        this.email=user.email;
        this.name=user.name;
        this.password=user.password;
        this.phone=user.phone;
    }
    constructor(email:string,name:string,password:string,phone:string){
        this.email=email;
        this.name=name;
        this.password=password;
        this.phone=phone;
    }
    toString():string{
        return `email ${this.email} | password ${this.password} | name ${this.name} | phone ${this.phone}`;
    }
    */

}

export class Business{

    /*
    private _schedules: Schedule[];
    private _services: Service[];

    public get schedules(): Schedule[] {
        return this._schedules;
    }

    public set schedules(schedules: Schedule[]) {
        this._schedules = [];
        schedules.forEach((item:Schedule)=>{
            this._schedules.push(Schedule.clone(item));
        });
    }

    public get services(): Service[] {
        return this._services;
    }

    public set services(services: Service[]) {
        this._services = [];
        services.forEach((item:Service)=>{
            this._services.push(Service.clone(item));
        });
    }
    */

    public schedules:Schedule[];
    public services:Service[];

    constructor(public name:string,public phone:string,public address:string,public city:string,public ownerEmail:string,public activated:number){}
    
    static clone(business:Business):Business{
        return new Business(business.name,business.phone,business.address,business.city,business.ownerEmail,business.activated);
    }

    /**
     *  used in clone testing
     * @param Business Business - business with extras (services and schedules)
     * @returns Business - business with extras
     */
    /*
    static deepClone(business:Business):Business{
        let res = new Business(business.name,business.phone,business.address,business.city,business.ownerEmail,business.activated);
        res.services = business.services;
        res.schedules = business.schedules;
        return res;
    }
    */

    /**
     * used in testing business clone
     * decode the json string given, expects the object to already have the services and schedules
     * @param json string - json encoded business object
     * @returns Business - the decoded version of given json code
     */
    /*
    static jsonDecode(json:string):Business{
        let obj:Business = JSON.parse(json);
        let res:Business = Business.clone(obj);
        res.services = obj.services;
        res.schedules = obj.schedules;
        return res;
    }
    */
}

export class Schedule{

    private _day: string;
    public get day():string{
        return this._day;
    }
    private setDay(day:number): void{
        this._day = Functions.getDaysArray()[day];
        /*
        switch (day){
            case 0:
                this._day = "Sunday";
                break;
            case 1:
                this._day = "Monday";
                break;
            case 2:
                this._day = "Tuesday";
                break;
            case 3:
                this._day = "Wednesday";
                break;
            case 4:
                this._day = "Thursday";
                break;
            case 5:
                this._day = "Friday";
                break;
            case 6:
                this._day = "Saturday";
                break;
        }
        */
    }

    constructor(public id:number,public dayInWeek:number,public openTime:string,public closeTime:string,public jumps:number,public businessName:string){
        this.setDay(this.dayInWeek);
    }
    
    static clone(schedule:Schedule):Schedule{
        return new Schedule(schedule.id,schedule.dayInWeek,schedule.openTime,schedule.closeTime,schedule.jumps,schedule.businessName);
    }

}

export class Service{

    constructor(public id:number,public name:string,public duration:number,public price:number,public businessName:string,public activated:number){}
    
    static clone(service:Service):Service{
        return new Service(service.id,service.name,service.duration,service.price,service.businessName,service.activated);
    }
}

export class Appointment{

    private _services: Service[];
    readonly formatTime:string;
    readonly formatDate:string;
    readonly date:Date;
    
    constructor(public id:number,public timeOf:string,public dateOf:string,public totalDuration:number,public totalPrice:number,public irregular:number,public completed:number,public businessName:string,public userEmail:string,public scheduleId:number,public reviewId:number){
        this.dateOf = Functions.dateToString(dateOf);
        let date = new Date(dateOf);
        this.formatDate = new DatePipe("en-IL").transform(date,"dd-MM-yyyy")
        this.formatTime = timeOf.substring(0,timeOf.lastIndexOf(':'));
        this.date = Functions.getDate(this.dateOf,(this.irregular == 1)? "24:00:00" : this.timeOf);
    }
    /*
    setServices(services:Service[]){
        this.services=[];
        services.forEach((item:Service)=>{
          this.services.push(Service.clone(item));
        });
    }
    */

    public get services(): Service[] {
        return this._services;
    }
    public set services(services: Service[]) {
        this._services=Functions.createServiceArray(services);
    }

    public hasPassed():boolean{
        let today:Date = new Date();
        console.log()
        return (this.completed || this.date.getTime()<=today.getTime())? true:false;
    }

    static clone(appointment:Appointment):Appointment{
        return new Appointment(appointment.id,appointment.timeOf,appointment.dateOf,appointment.totalDuration,appointment.totalPrice,appointment.irregular,appointment.completed,appointment.businessName,appointment.userEmail,appointment.scheduleId,appointment.reviewId);
    }

    static toCalendar(arr:Appointment[]):Map<string,Appointment[]>{
        let res:Map<string,Appointment[]> = new Map<string,Appointment[]>();
        arr.forEach((item)=>{
            if (!res.has(item.dateOf))
              res.set(item.dateOf,[]);
            res.get(item.dateOf).push(item);
        });
        return res;
    }
}

interface MessageObject{
        appointmentId:number;
        businessName?:string;
        userEmail?:string;
        offer?:string;
}

export class Message{

    readonly extras:MessageObject;   // the object of message.obj, if message type does not equal zero
    readonly date:Date;   // for GUI usage
    readonly reviewForm:FormGroup;

    constructor(public id:number,public dateOf:string,public timeOf:string,public wasRead:number,public content:string,public businessName:string,public receiverEmail:string, public messageType:number, public obj:{appointmentId,businessName,userEmail,offer}){
        this.dateOf = Functions.dateToString(dateOf);
        // this._timePassed = new Date().getTime() - Functions.getDate(this.dateOf,this.timeOf).getTime();
        // this._timePassed = Math.ceil(this._timePassed/(1000 * 3600 * 24));
        this.date = new Date(`${this.dateOf} ${this.timeOf}`);
        if (this.messageType){
            if (this.messageType==1) {    // review
                this.extras = {appointmentId:this.obj.appointmentId,businessName:this.obj.businessName,userEmail:this.obj.userEmail};
                this.reviewForm = this.createReviewForm();
            }
            else if (this.messageType==2)   // offer
                this.extras = {appointmentId:this.obj.appointmentId,offer:this.obj.offer};
        }
    }

    private createReviewForm(): FormGroup{
        return new FormGroup({
            id:new FormControl(this.extras.appointmentId),
            liked:new FormControl(),
            content:new FormControl(""),
            businessName:new FormControl(this.extras.businessName),
            userEmail:new FormControl(this.extras.userEmail)
        });
    }

    static clone(message:Message):Message{
        return new Message(message.id,message.dateOf,message.timeOf,message.wasRead,message.content,message.businessName,message.receiverEmail,message.messageType,message.obj);
    }

}

export class Review{

    constructor(public id:number,public liked:number,public content:string,public businessName:string,public userEmail:string,public appointmentId:number){

    }

    static clone(review:Review):Review{
        return new Review(review.id,review.liked,review.content,review.businessName,review.userEmail,review.appointmentId);
    }

}

export class Statistics{

    public constructor(
        public totalEarnings:number,
        public servicesCounter:DataGraph[],
        public popularService:DataGraph,
        public popularDay:number,
        public popularTime:DataGraph[],
        public monthEarnings:DataGraph[],
        public currentPrediction:number,
        public futurePrediction:number){
        
    }
}

export class DataGraph{
    public name: string;
    public value: number|string;
    public dataGraph(name:string, value:number){
        this.name = name;
        this.value = value;
    }

}