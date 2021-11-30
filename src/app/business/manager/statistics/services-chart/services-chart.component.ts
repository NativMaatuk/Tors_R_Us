import { Component, Input, OnInit } from '@angular/core';
import { DataGraph } from 'src/app/classes';

@Component({
  selector: 'app-services-chart',
  templateUrl: './services-chart.component.html',
  styleUrls: ['./services-chart.component.css']
})
export class ServicesChartComponent implements OnInit {

  @Input() statistics: DataGraph[];

  //chart settings;

  view: any[] = [1000, 400];

  gradient: boolean = true;
  showLegend: boolean = true;
  showLabels: boolean = true;
  isDoughnut: boolean = false;
  legendPosition: string = 'below';
  legendTitle:String = "Service Counters";
  
  colorScheme = {
    domain: []
  };
  
  constructor() { }

  ngOnInit(): void {
  }

}
