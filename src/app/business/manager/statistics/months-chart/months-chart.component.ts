import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';

import AOS from 'aos'
import { DataGraph } from 'src/app/classes';

@Component({
  selector: 'app-months-chart',
  templateUrl: './months-chart.component.html',
  styleUrls: ['./months-chart.component.css']
})
export class MonthsChartComponent implements OnInit,OnChanges {

  @Input() statistics: DataGraph[];

  // chart settings

  view: any[] = [1000, 500];
  legendTitle: string = 'Months';
  legendPosition: string = 'right'; // ['right', 'below']
  legend: boolean = true;

  RoundBarEdges: boolean = true; 

  xAxis: boolean = true;
  yAxis: boolean = true;

  yAxisLabel: string = 'Tors-R-Us';
  xAxisLabel: string = 'Month income';
  showXAxisLabel: boolean = true;
  showYAxisLabel: boolean = true;

  maxXAxisTickLength: number = 30;
  maxYAxisTickLength: number = 30;
  trimXAxisTicks: boolean = false;
  trimYAxisTicks: boolean = false;
  rotateXAxisTicks: boolean = false;

  xAxisTicks: String[] = ["Month","Month","Month","Month","Month","Month"];
  yAxisTicks: any[] = [100, 1000, 2000, 5000, 7000, 10000];

  animations: boolean = true; // animations on load

  showGridLines: boolean = true; // grid lines

  showDataLabel: boolean = true; // values on bars

  gradient: boolean = false;
  colorScheme = {
    domain: ['#704FC4', '#4B852C', '#B67A3D', '#5B6FC8', '#25706F']
  };
  schemeType: string = 'ordinal'; // 'linear' chart

  activeEntries: any[] = ['book']
  barPadding: number = 5
  tooltipDisabled: boolean = false;

  yScaleMax: number = 9000;

  roundEdges: boolean = false;

  constructor() {
   
   }

   ngOnInit(): void {
     AOS.init();  // initiate AOS
   }
   
  ngOnChanges(changes: SimpleChanges): void {
    this.getLimits(); // update chart's data
  }

  /**
   * update the charts data, by the values of the current statistics data
   */
  getLimits(): void{
    this.yAxisTicks = [];
    this.xAxisTicks = [];
    let max = 0;
    this.statistics.forEach(item=>{
      this.yAxisTicks.push(item.value);
      this.xAxisTicks.push(item.name);
      if (max===0 || item.value>max)
        max = +item.value;
    });
    max *= 1.2;
    max += 500-(max%500);
    this.yAxisTicks.push(max);
  }
}
