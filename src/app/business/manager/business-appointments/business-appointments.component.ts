import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AppointmentsHttpService } from 'src/app/appointments-http.service';
import { BusinessesHttpService } from 'src/app/businesses-http.service';
import { Appointment, Business, Functions, Service } from 'src/app/classes';
import { UserManagerService } from 'src/app/user-manager.service';

@Component({
  selector: 'app-business-appointments',
  templateUrl: './business-appointments.component.html',
  styleUrls: ['./business-appointments.component.css']
})
export class BusinessAppointmentsComponent implements OnInit {

  public business:Business;

  public monthCalendar: Map<number,Date[]>; // the days of the month
  public weeks:number[];  // the array of weeks in the month
  public days:string[]; // days of the week in string form
  public currentDate: Date; // current month viewed
  public selected:Date; // selected date

  private _appointments: Appointment[];
  public appCalendar:Map<string,Appointment[]>;

  public get appointments(): Appointment[]{
    return this._appointments;
  }

  public set appointments(value: Appointment[]) {
    this._appointments = value;
    this.appCalendar = Appointment.toCalendar(value);
  }

  constructor(private userManager:UserManagerService, private businessHttp:BusinessesHttpService, private appointmentHttp:AppointmentsHttpService,private actRoute:ActivatedRoute) { }

  ngOnInit(): void {
    // return if there is no logged user 
    if (!this.userManager.loginCheck()) return; 
    // initialize variables
    let name = this.actRoute.snapshot.params['name'];
    this.currentDate = new Date();
    this.selected = new Date();
    this.days = Functions.getDaysArray();
    // request to get the business in question
    this.businessHttp.getBusiness(name).subscribe(
      (res:Business)=>{
        if (!res) return;
        this.business = res;
        // get the business services and schedules
        this.businessHttp.setExtras(this.business);
      });
    // request all the business appointments
    this.appointmentHttp.getByBusiness(name).subscribe(
      (res:Appointment[])=>{
      this.appointments = res;
      // request each appointment's services
      this.appointments.forEach((app)=>{
        this.appointmentHttp.getServices(app.id).subscribe(
          (services:Service[])=>app.services=services);
        });
      }
    );
    this.changeCalendar(0); // initiate calendar
  }

  /**
   * enter the date value (if not empty) into this.selected
   * @param {Date} day 
   */
  selectDate(day:Date){
    if (!day) return;
    this.selected = day;
  }

  /**
   * returns true if the given date is the selected date, else false
   * @param {Date} date 
   * @returns boolean
   */
  isSelected(date:Date):boolean{
    return date && date.getDate()==this.selected.getDate() && date.getMonth()==this.selected.getMonth() && date.getFullYear()==this.selected.getFullYear();
  }

  /**
   * update month calendar by the given offset
   * @param {number} offset 
   */
  changeCalendar(offset:number){
    this.currentDate.setMonth(this.currentDate.getMonth()+offset);
    this.monthCalendar = Functions.getMonthCalendar(this.currentDate.getFullYear(),this.currentDate.getMonth());
    Functions.padDateArray(this.monthCalendar);
    this.weeks = [... this.monthCalendar.keys()];
  }

  /**
   * request to cancel all appointments in the selected date
   */
  clearDay(){
    if (!confirm("Are you sure?\nThis cannot be undone")) return;
    let content:string = prompt("Enter the message to the clients:");
    if (!content) return;
    let key = new DatePipe("en-IL").transform(this.currentDate,"YYYY-MM-dd");
    for (let app of this.appCalendar.get(key).reverse()) {  // reverse so it will delete the irregulars first and not send an offer
      if (app.hasPassed()) continue; // if the appointment already passed
      this.appointmentHttp.deleteAppointmentMessage(app.id,content).subscribe();
    };
    // remove the appointment from client side
    this.appCalendar.set(key,
      this.appCalendar.get(key).filter((app)=>
        app.hasPassed()
      ));
  }

  /**
   * request to cancel the appointment (by its id)
   * @param {number} id 
   */
  deleteAppointment(id:number){
    if (!confirm("Are you sure?\nThis cannot be undone")) return;
    let content:string = prompt("Enter the message to the client:");
    if (!content) return;
    let key = new DatePipe("en-IL").transform(this.selected,"yyyy-MM-dd");
    let app = this.appCalendar.get(key).find((item)=> item.id==id);
    if (app.hasPassed()){
      // appointment has already passed or been completed, cannot cancel
      alert("Appointment has already passed or been completed");
      return;
    }
    // request to delete appointment
    this.appointmentHttp.deleteAppointmentMessage(id,content).subscribe(
      (res:number)=>{
        // successfully deleted, alerts the owner and remove appointment from local data
        alert("Appointment successfully deleted");
        this.removeAppointment(key,app.id)
      }
    )
  }

  /**
   * returns a string that represents currently selected month
   * @returns "MM/YYYY" date format
   */
   getH4Title():string{
    let m = this.currentDate.getMonth()+1;
    return `${m<10? "0"+m:m}/${this.currentDate.getFullYear()}`;
  }

  /**
   * returns current Date
   * @returns Date
   */
  getToday():Date{
    return new Date();
  }

  /**
   * return if there are any appointments in currently selected date
   * @returns boolean
   */
  hasAppointments(){
    let key = new DatePipe("en-IL").transform(this.selected,"YYYY-MM-dd");
    return this.appCalendar && this.appCalendar.has(key) && this.appCalendar.get(key);
  }

  /**
   * remove appointment from local calendar, by key and value
   * @param key 
   * @param id 
   */
  private removeAppointment(key:string,id:number){
    let arr = this.appCalendar.get(key).filter((app)=> app.id!=id);
    this.appCalendar.set(key,arr);
  }

  /**
   * sends a message and an email to the appointments client
   * @param id 
   */
  sendMessage(id:number){
    let key = new DatePipe("en-IL").transform(this.selected,"YYYY-MM-dd");
    let app = this.appCalendar.get(key).find(appointment=>appointment.id===id);
    let content = prompt("Enter the message:");
    if (!app || !content || !content.trim())
      return;
    let message = {
      content:`Message from '${app.businessName}' about your appointment on ${app.date.toDateString()} ${app.formatTime}: "${content}"`,
      subject:`Message from '${app.businessName}'`,
      businessName:app.businessName,
      receiverEmail:app.userEmail
    };
    this.businessHttp.sendMessage(message,true).subscribe(
      res=>alert("Message sent")
    );
  }

  /**
   * sends a message and an email to all clients in currently selected date
   */
  sendMessageToAll(){
      let content = prompt("Enter the message:");
      if (!content || !content.trim())
        return;
      let key = new DatePipe("en-IL").transform(this.selected,"YYYY-MM-dd");
      this.appCalendar.get(key).forEach(
        appointment=>{
          this.businessHttp.sendMessage({
            content:`Message from '${appointment.businessName}' about your appointment on ${appointment.date.toDateString()} ${appointment.date.toLocaleTimeString()}: "${content}"`,
            subject:`Message from '${appointment.businessName}'`,
            businessName:appointment.businessName,
            receiverEmail:appointment.userEmail
          },true).subscribe()
        }
      );
      alert("Messages Sent");
  }

}
