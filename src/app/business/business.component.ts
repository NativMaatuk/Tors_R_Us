import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AppointmentsHttpService } from '../appointments-http.service';
import { BusinessesHttpService } from '../businesses-http.service';
import { Business, Service, Functions, Review, Appointment } from '../classes';
import { UserManagerService } from '../user-manager.service';

@Component({
  selector: 'app-business',
  templateUrl: './business.component.html',
  styleUrls: ['./business.component.css']
})
export class BusinessComponent implements OnInit {

  constructor(private userManager:UserManagerService, private businessHttp:BusinessesHttpService, private appointmentHttp:AppointmentsHttpService, private actRoute:ActivatedRoute,private router:Router) { }
  // reviews parameters
  gaugeType = "semi";
  gaugeValue = 0;
  gaugeLabel = "users liked";
  gaugeMax = 0;
  gaugeSize = 100;
  gaugeAnimate = true;
  
  //parm for maps
  lat = 32.795860290527344;
  lng = 35.53097915649414;

  private datePipe:DatePipe;

  public business:Business;
  public reviews:Review[];

  public monthCalendar: Map<number,Date[]>; // the days of the month
  public weeks:number[];  // the array of weeks in the month
  public days:string[]; // days of the week in string form
  public currentDate: Date; // current month viewed
  public selected:Date; // selected date
  public freeTimes:object[];  // the free times in selected date, each item is {'timeOf':string,'duration':number}
  public selectedServices: Set<Service>;  // the selected services, will store the ids of selected services
  public totalDuration: number;
  private _today:Date;
  public get today():Date{
    return this._today;
  }

  public timeForm:FormGroup;

  ngOnInit(): void {
    // initilize isOwner - check from business manager if the current user is the owner
    // get the business data from the business manager along with the services and timetable
    if (!this.userManager.loginCheck()) return;
    let name = this.actRoute.snapshot.params['name'];
    this.userManager.refreshFavorites();
    this.days = Functions.getDaysArray();
    this.currentDate = new Date();
    this.selected = new Date();
    this.selectedServices = new Set<Service>();
    this.totalDuration = 0;
    this.changeCalendar(0);
    this._today = new Date();
    this._today.setHours(0,0,0,0);
    this.datePipe = new DatePipe("en-il");
    // fetch business and its extras from server
    this.businessHttp.getBusiness(name).subscribe(
      (res:Business)=>{ // no such business, route to 404
        if (!res || res.activated==0) {
          this.router.navigate(['/404']);
          return;
        };
        this.business=res;
        this.businessHttp.setExtras(this.business);
        this.businessHttp.getReviewsByBusiness(this.business.name).subscribe(
          (res:Review[]) => {
            this.reviews = res;
            this.gaugeValue = 0;
            this.gaugeMax = this.reviews.length;
            this.reviews.forEach(review=>this.gaugeValue+=review.liked);
          }
        );
        if (!this.selected) // init selected to current day
          this.selected = new Date();
        this.selectDate(this.selected);
      }
    );
  }

  isFavorited(): boolean{
    if (!this.business || this.userManager.favorites==null || !this.userManager.loginCheck()) return false;
    return this.userManager.favorites.has(this.business.name);
  }

  toggleFavorite(){
    if (this.isFavorited()) // if selected as favorite
      this.userManager.deleteFavorite(this.business);
    else
      this.userManager.addFavorite(this.business);
  }

  /**
   * change selected date, and get the free times in new date
   * @param {Date} day 
   */
  selectDate(day:Date){
    if (!day || day.getTime()<this._today.getTime()) return;
    this.selected = day;
    this.getFreeTimes();
    this.timeForm = new FormGroup({
      time:new FormControl()
    });
  }

  /**
   * get the free times in current selected date from the server
   */
  private getFreeTimes(){
    if (!this.business) return;
    let dateOf = this.datePipe.transform(this.selected,"yyyy-MM-dd");
    this.freeTimes = null;
    this.businessHttp.getFreeTimes(this.business.name,dateOf).subscribe(
      (res:object[])=>{
        this.freeTimes = res;
      }
    );
  }

  /**
   * check if given date is the selected date
   * @param date 
   * @returns boolean
   */
  isSelected(date:Date):boolean{
    return date && date.getDate()==this.selected.getDate() && date.getMonth()==this.selected.getMonth() && date.getFullYear()==this.selected.getFullYear();
  }

  /**
   * add / remove service from selectedServices set
   * @param service 
   */
  toggleService(service:Service): void{
    if (this.selectedServices.has(service)){
      this.selectedServices.delete(service);
      this.totalDuration -= service.duration;
    }
    else{
      this.selectedServices.add(service);
      this.totalDuration += service.duration;
    }
  }

  /**
   * change the calendar by the given offset
   * @param offset 
   */
  changeCalendar(offset:number){
    this.currentDate.setMonth(this.currentDate.getMonth()+offset);
    this.monthCalendar = Functions.getMonthCalendar(this.currentDate.getFullYear(),this.currentDate.getMonth());
    Functions.padDateArray(this.monthCalendar);
    this.weeks = [... this.monthCalendar.keys()];
  }

  /**
   *  return if the current user is the owner
   * @returns boolean
   */
  isOwner():boolean {
    return this.userManager.loginCheck() && this.business && this.business.ownerEmail===this.userManager.user.email;
  }

  /**
   * return if the given timeOf has passed
   * @param timeOf 
   * @returns boolean
   */
  hasPassed(timeOf): boolean{
    let current = new Date();
    let date = new Date(`${this.datePipe.transform(this.selected,"yyyy-MM-dd")} ${timeOf}`);
    return date.getTime() <= current.getTime();
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
   * build an appointment object and send a request to add new appointment in server
   * @param date 
   * @param timeOf 
   * @param irregular 
   */
  makeAppointment(date:Date,timeOf:string,irregular:number){
    if (!this.business || !this.userManager.loginCheck()) return;
    let dateOf = this.datePipe.transform(date,"yyyy-MM-dd");
    let app:object = {timeOf:timeOf,dateOf:dateOf,irregular:irregular,businessName:this.business.name,userEmail:this.userManager.user.email};
    let services:Service[] = Array.from(this.selectedServices);
    this.appointmentHttp.addAppointment(app,services).subscribe(
      (res:Appointment)=>{
        if (!irregular)
          alert("Appointment made");
        else
          alert("Added to waiting list, if there is an opening you will be notified via a message.")
        this.ngOnInit();
      }
    );
  }

  /**
   * navigate the user to search page of search by time and services (the toggled services)
   */
  searchTime(){
    let timeOf:string = this.timeForm.controls['time'].value;
    let dateOf:string = this.datePipe.transform(this.selected,"YYYY-MM-dd")
    let names:string = Array.from(this.selectedServices).map(item => {return item.name}).join(', ');
    this.router.navigate(['/searchByTime',names,`${dateOf} ${timeOf}`]);
  }


}
