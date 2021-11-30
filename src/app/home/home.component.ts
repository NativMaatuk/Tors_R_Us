import { Component, OnInit } from '@angular/core';
import { AppointmentsHttpService } from '../appointments-http.service';
import { BusinessesHttpService } from '../businesses-http.service';
import { Appointment, Business, Service } from '../classes';
import { UserManagerService } from '../user-manager.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  constructor(private userManager:UserManagerService,private appointmentHttp:AppointmentsHttpService, private businessHttp:BusinessesHttpService) { }

  private _owned:Business[];
  public get owned():Business[]{
    return this._owned;
  }

  private _appointments:Appointment[];
  public get appointments():Appointment[]{
    return this._appointments;
  }

  private _history:Appointment[];
  public get history():Appointment[]{
    return this._history;
  }

  private _future:Appointment[];
  public get future():Appointment[]{
    return this._future;
  }

  ngOnInit(): void {
    if (!this.userManager.loginCheck())
      return; // no user loged in
    // fetch the owned businesses
    this.businessHttp.getOwned(this.userManager.user.email).subscribe(
      (arr:Business[])=> this._owned = arr
    );
    // fetch all user's appointments
    this.appointmentHttp.getByUser(this.userManager.user.email).subscribe(
      (res:Appointment[])=>{
        this._history = [];
        this._future = [];
        this._appointments = res;
        this._appointments.forEach((item)=>{
          // fetch each appointment's services
          this.appointmentHttp.getServices(item.id).subscribe((serArr:Service[])=>item.services=serArr);
          if (item.hasPassed()) // appointment has passed, add to history
            this._history.push(item);
          else  // appointment hasn't passed, add to future
            this._future.push(item);
        });
        if (this._history.length>10)  // short list to only last 10
          this._history = this._history.slice(this._history.length-10,this._history.length);
        if (this._future.length>10) // short list to only future 10
          this._future = this._future.slice(0,10);
        this._history = this._history.reverse();
      }
    );
    // refresh favorite businesses in user manager service
    this.userManager.refreshFavorites();
  }

  getFavorites():Map<string,Business>{
    return this.userManager.favorites;
  }

}
