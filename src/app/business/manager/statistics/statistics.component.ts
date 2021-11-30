import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BusinessesHttpService } from 'src/app/businesses-http.service';
import { Business, DataGraph, Functions, Service, Statistics } from 'src/app/classes';

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.css']
})
export class StatisticsComponent implements OnInit {

  constructor(private businessHttp:BusinessesHttpService,private actRoute:ActivatedRoute) { }
 
  public business:Business;
  public servicesArr:Service[];
  public statistics:Statistics;
  public result: DataGraph;
  stat:any[];
  forecast:any[];
  
  ngOnInit(): void {
   let name = this.actRoute.snapshot.params['name'];
   // request the business in question
   this.businessHttp.getBusiness(name).subscribe(
     (res:Business)=>{
       if (!res) return;
       this.business = res;
       // request the services
      this.businessHttp.getServices(name).subscribe(
        arr=>{
          this.servicesArr=arr;
          // request the current statistics
          this.businessHttp.getStatistics(name).subscribe(
            (res:Statistics)=>{
              this.statistics = res;
              // format the service counters to have the names instead of the ids
              for (let i=0;i<this.statistics.servicesCounter.length;i++)
                this.statistics.servicesCounter[i].name = this.servicesArr.find(ser=>ser.id===+this.statistics.servicesCounter[i].name).name
              // format the popular times to have string values instead of number values (0-6)
              for (let i=0;i<this.statistics.popularTime.length;i++){
                let str:string = this.statistics.popularTime[i].value.toString();
                this.statistics.popularTime[i].name = Functions.getDaysArray()[+this.statistics.popularTime[i].name];
                this.statistics.popularTime[i].value = str.substring(0,str.lastIndexOf(':'));
              }
              // fomating the other non-charted statistic data
              this.stat =  [
                {name:"Popular Service",parm:this.statistics.popularService!==null?(
                  this.servicesArr.find(ser=>ser.id===+this.statistics.popularService.name).name  // get the popular service name by its id
                ):-1},
                {name:"Popular Day",parm:this.statistics.popularDay!==null? Functions.getDaysArray()[this.statistics.popularDay]:-1} //Popular Day
              ];
              if(this.statistics.currentPrediction){
                this.stat.unshift({name:"Next Month",parm:`${this.statistics.futurePrediction}\n(prediction)`});
                this.stat.unshift({name:"Current Month",parm:`${this.statistics.currentPrediction}\n(prediction)`});
              }
              else{
                this.stat.unshift({name:"Next Month",parm:"Insufficient Data"});
                this.stat.unshift({name:"Current Month",parm:"Insufficient Data"});
              }
              this.stat.unshift({name:"Total Earnings",parm:this.statistics.totalEarnings? this.statistics.totalEarnings : 0});
            }
          );
        }
      );
     }
   )
  }

}
