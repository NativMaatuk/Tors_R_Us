import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AppointmentsHttpService } from '../appointments-http.service';
import { Appointment, Functions, Service } from '../classes';
import { UserManagerService } from '../user-manager.service';

@Component({
  selector: 'app-user-appointments',
  templateUrl: './user-appointments.component.html',
  styleUrls: ['./user-appointments.component.css']
})
export class UserAppointmentsComponent implements OnInit {

  constructor(private userManager:UserManagerService,private appointmentHttp:AppointmentsHttpService) { }

  public monthCalendar: Map<number,Date[]>; // the days of the month
  public weeks:number[];  // the array of weeks in the month
  public days:string[]; // days of the week in string form
  public currentDate: Date; // current month viewed
  public selected:Date;

  private _appointments: Appointment[];
  public appCalendar:Map<string,Appointment[]>; // the appointments in calendar form

  public get appointments(): Appointment[] {
    return this._appointments;
  }

  public set appointments(value: Appointment[]) {
    this._appointments = value;
    this.appCalendar = Appointment.toCalendar(value);
  }

  ngOnInit(): void {
    if (!this.userManager.loginCheck()) return; // return if no logged user
    this.currentDate = new Date();
    this.selected = new Date();
    // request all the user's appointments
    this.appointmentHttp.getByUser(this.userManager.user.email).subscribe((res:Appointment[])=>{
      this.appointments=res;
      // get each appointment's services
      this.appointments.forEach((app)=>{
        this.appointmentHttp.getServices(app.id).subscribe(
          (services:Service[])=>app.services=services);
        });
    });
    this.days = Functions.getDaysArray();
    this.changeCalendar(0); // initiate calendar
  }

  /**
   * save given Date, if not empty, in this.selected
   * @param {Date} day 
   * @returns void
   */
  selectDate(day:Date){
    if (!day) return;
    this.selected = day;
  }

  /**
   * return boolean value, if given Date matches this.selected
   * @param {Date} date 
   * @returns Boolean
   */
  isSelected(date:Date):boolean{
    return date && date.getDate()==this.selected.getDate() && date.getMonth()==this.selected.getMonth() && date.getFullYear()==this.selected.getFullYear();
  }

  /**
   * move the month calendar by given offset
   * @param {number} monthDiff 
   */
  changeCalendar(offset:number): void{
    this.currentDate.setMonth(this.currentDate.getMonth()+offset);
    this.monthCalendar = Functions.getMonthCalendar(this.currentDate.getFullYear(),this.currentDate.getMonth());
    Functions.padDateArray(this.monthCalendar);
    this.weeks = [... this.monthCalendar.keys()];
  }

  /**
   * request to send an http request to delete an appointment,
   * after users confimation
   * @param {number} id 
   * @returns void
   */
  deleteAppointment(id:number){
    if (!confirm("Are you sure?\nYou cannot undo this")) return;
    let key = new DatePipe("en-IL").transform(this.selected,"yyyy-MM-dd");
    let app = this.appCalendar.get(key).find((item)=> item.id==id);
    if (app.hasPassed()){
      alert("Appointment already passed");
      return;
    }
    // request to delete appointment
    this.appointmentHttp.deleteAppointment(id).subscribe(
      (res:number)=>{
        this.removeAppointment(key,id);
        alert("Appointment was successfully deleted");
      }
    )
  }

  /**
   * Because the value does not auto updated
   * @returns "MM/YYYY" date format
   */
  getH4Title():string{
    let m = this.currentDate.getMonth()+1;
    return `${m<10? "0"+m:m}/${this.currentDate.getFullYear()}`;
  }

  /**
   * return if there are appointments in this.selected date
   * @returns boolean
   */
  hasAppointments(){
    let key = new DatePipe("en-IL").transform(this.selected,"yyyy-MM-dd");
    return this.appCalendar && this.appCalendar.has(key) && this.appCalendar.get(key);
  }

  /**
   * get current Date
   * @returns Date
   */
  getToday():Date{
    return new Date();
  }

  /**
   * remove appointment from appCalendar by key and it's id
   * @param {string} key - date format 
   * @param {number} id 
   */
  private removeAppointment(key:string,id:number){
    let arr = this.appCalendar.get(key).filter((item)=> item.id!=id);
    this.appCalendar.set(key,arr);
  }
  
}
