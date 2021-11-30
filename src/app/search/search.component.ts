import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BusinessesHttpService } from '../businesses-http.service';
import { Business } from '../classes';
import { UserManagerService } from '../user-manager.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {

  constructor(private userManager:UserManagerService ,private businessHttp:BusinessesHttpService, private actRoute:ActivatedRoute, private router:Router) { }

  public byName:Business[];
  public byServices:Business[];
  public byTime:object[];   // each item -> {business:Business, time:string}

  private datePipe: DatePipe;

  ngOnInit(): void {
    if (!this.userManager.loginCheck())
      return;
    this.datePipe = new DatePipe("en-IL");
    // on param change
    this.actRoute.params.subscribe(params=>{
      let name,timestamp;
      if (params['timestamp']!==undefined)  // check if search by time
        timestamp = params['timestamp'].trim();
      name = params['request'].trim();
      // normal search (name / services)
      if (timestamp===undefined){
        if (name===undefined)
          this.router.navigate(["/home"]);
        this.byName = this.byServices = null;
        // search by name http request
        this.businessHttp.searchByName(name,this.userManager.user.email).subscribe(
          (res:Business[])=>this.byName=res
        );
        // search by services http request
        this.businessHttp.searchByServices(name,this.userManager.user.email).subscribe(
          (res:Business[])=>this.byServices=res
        );
      }
      // search by time and services
      else if (timestamp!==undefined){
        let date:Date,dateOf:string,timeOf:string;
        try { // to catch if the time url string, isn't valid
          // convert given time string into valid request parameters
          date = new Date(timestamp);
          dateOf = this.datePipe.transform(date,"YYYY-MM-dd");
          timeOf = this.datePipe.transform(date,"HH:mm");
        } catch (error) { // invalid timestamp
          alert("Invalid date, time, or duration\nBack to home page");
          this.router.navigate(["/home"]);
        }
        // search by time searches http request
        this.businessHttp.searchByTimeServices(dateOf,timeOf,name,this.userManager.user.email).subscribe(
          (res:Business[])=>{
            this.byTime=res
          }
        );
      }
      else  // invalid parameters
        this.router.navigate(["/home"]);
    });
  }

}
