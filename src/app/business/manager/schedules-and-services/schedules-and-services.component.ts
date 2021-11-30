import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BusinessesHttpService } from 'src/app/businesses-http.service';
import { Business, Schedule, Service } from 'src/app/classes';
import { UserManagerService } from 'src/app/user-manager.service';

@Component({
  selector: 'app-schedules-and-services',
  templateUrl: './schedules-and-services.component.html',
  styleUrls: ['./schedules-and-services.component.css']
})
export class SchedulesAndServicesComponent implements OnInit {

  constructor(private userManager:UserManagerService, private businessHttp:BusinessesHttpService, private actRoute:ActivatedRoute) { }

  business:Business;
  scheduleForms:FormGroup[];
  serviceForms:FormGroup[];
  newService:FormGroup;

  ngOnInit(): void {
    let name = this.actRoute.snapshot.params['name'];
    // request the business in question
    this.businessHttp.getBusiness(name).subscribe(
      (res:Business)=>{
        if (!res) return;
        this.business = res;
        // request the schedules
        this.businessHttp.getSchedules(this.business.name).subscribe(
          (schedules:Schedule[])=>{
            this.business.schedules = schedules;
            this.createSchedulesForm(); // initiate update schedule forms
          }
        );
        // request the services
        this.businessHttp.getServices(this.business.name).subscribe(
          (services:Service[])=>{
            this.business.services = services;
            this.createServicesForm();  // initiate update service forms
          }
        );
        // initialize new service form
        this.newService = new FormGroup({
          name:new FormControl(),
          price:new FormControl(),
          duration:new FormControl(),
        });
      }
    )
  }

  /**
   * initialize the update service form for each service
   */
  private createServicesForm(){
    this.serviceForms = [];
    for (let i = 0; i < this.business.services.length; i++)
      this.serviceForms[i] = new FormGroup({
        id:new FormControl(this.business.services[i].id),
        name:new FormControl(this.business.services[i].name),
        duration:new FormControl(this.business.services[i].duration),
        price:new FormControl(this.business.services[i].price),
        activated:new FormControl(this.business.services[i].activated)
      });
  }

  /**
   * initialize the update schedule form for each schedule
   */
  private createSchedulesForm(){
    this.scheduleForms = [];
    for (let i = 0; i < this.business.schedules.length; i++)
      this.scheduleForms[i] = new FormGroup({
        ind:new FormControl(i),
        id:new FormControl(this.business.schedules[i].id),
        openTime:new FormControl(this.business.schedules[i].openTime),
        closeTime:new FormControl(this.business.schedules[i].closeTime),
        jumps:new FormControl(this.business.schedules[i].jumps),
      });
  }
  
  /**
   * submit function for update schedule form,
   * request the server to update schedule,
   * if successful will update local data 
   * @param form 
   * @param ind 
   */
  scheduleUpdate(form:FormGroup,ind:number){
    let schedule:Schedule = new Schedule(form.controls['id'].value,this.business.schedules[ind].dayInWeek,form.controls['openTime'].value,form.controls['closeTime'].value,form.controls['jumps'].value,this.business.schedules[ind].businessName);
    this.businessHttp.updateSchedule(schedule).subscribe(
      (res:Schedule)=>{
        this.business.schedules[ind]=res;
      }
    )
  }
  
  /**
   * reset schedule form,
   * request the server to update schedule with the values:
   * openTime = closeTime = 00:00, jumps = 0,
   * if successful will update local data 
   * @param ind 
   */
  resetSchedule(ind:number){
    let schedule:Schedule = new Schedule(this.business.schedules[ind].id,this.business.schedules[ind].dayInWeek,"00:00","00:00",0,this.business.schedules[ind].businessName);
    this.businessHttp.updateSchedule(schedule).subscribe(
      (res:Schedule)=>{
        this.business.schedules[ind]=res;
        this.scheduleForms[ind].patchValue({
          openTime:"00:00:00",
          closeTime:"00:00:00",
          jumps:0
        });
      }
    )
  }

  /**
   * returns the update form of the service by its id
   * @param id 
   * @returns FormGroup
   */
  getServiceForm(id:number){
    for (let tmp of this.serviceForms)
      if (tmp.controls['id'].value==id) return tmp;
    return null;
  }

  /**
   * submit function for new service form,
   * request the server to add a new service,
   * if successful will add the service to local data, and will create its update form
   */
  addService(){
    let service:object = {name:this.newService.controls['name'].value,duration:this.newService.controls['duration'].value,price:this.newService.controls['price'].value,businessName:this.business.name};
    this.businessHttp.addService(service).subscribe(
      (res:Service)=>{
        alert("Service successfully added");
        this.business.services.push(res);
        // initialize service update form
        this.serviceForms.push(new FormGroup({
          id:new FormControl(res.id),
          name:new FormControl(res.name),
          duration:new FormControl(res.duration),
          price:new FormControl(res.price)
        }));
        this.newService.reset();  // reset new service form
      }
    );
  }

  /**
   * de/activate service function,
   * to proceed will need a code confirmation,
   * if the new state is deactivate, all future appointments related to the service will be cancelled
   * @param service 
   * @returns 
   */
  toggleActivatedService(service:Service){
    if (!this.userManager.loginCheck()) return;
    // request confirmation by code 
    this.userManager.getValidation().subscribe(
      (code)=>{
       while (true){
         let guess = prompt("A validation code was sent to your email, please enter the code:");
         if (guess===code)
           break;
         else if (!guess){
           alert(`${!this.business.activated? "activation":"Deactivation"} cancelled`);
           return;
         }
       }
      // additional confirmation by yes/no
      if (service.activated && !confirm("Are you sure?\nAll future appointments related to the service will be cancelled.")) return;
      // request the server to update activated state
      this.businessHttp.toggleActivatedService(service.id,service.activated).subscribe(
        (res:boolean)=>{
          if (!res) return;
          // update state in local data
          for (let i=0;i<this.business.services.length;i++)
            if (this.business.services[i].id==service.id)
              this.business.services[i].activated = service.activated? 0:1;
              alert(`The service is now ${service.activated? "active":"inactive"}`);
        });
    });
  }

  /**
   * submit function for update service form,
   * request the server to update service,
   * if successful will update local data 
   * @param id 
   * @param activated 
   */
  updateService(id:number,activated:number){
    let form = this.getServiceForm(id);
    if (!form) return;
    let service = new Service(form.controls['id'].value,form.controls['name'].value,form.controls['duration'].value,form.controls['price'].value,this.business.name,activated);
    this.businessHttp.updateService(service).subscribe(
      (res:Service)=>{
        let tmp:Service = this.business.services.find((item)=>item.id==id);
        tmp.name = form.controls['name'].value;
        tmp.price = form.controls['price'].value;
        tmp.duration = form.controls['duration'].value;
        alert("Service updated successfully");
      });
  }

}
