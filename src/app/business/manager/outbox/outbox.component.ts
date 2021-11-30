import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BusinessesHttpService } from 'src/app/businesses-http.service';
import { Business, Message } from 'src/app/classes';

@Component({
  selector: 'app-outbox',
  templateUrl: './outbox.component.html',
  styleUrls: ['./outbox.component.css']
})
export class OutboxComponent implements OnInit {


  constructor(public businessHttp:BusinessesHttpService, public actRoute:ActivatedRoute) { }
  
  public business: Business;
  public messages: Message[];
  public selected: Message;

  ngOnInit(): void {
    let name = this.actRoute.snapshot.params['name'];
    // request the business in question
    this.businessHttp.getBusiness(name).subscribe(
      (res:Business)=>{
        if (!res) return;
        this.business = res;
        // request all the messages related to the business
        this.businessHttp.getOutbox(name).subscribe((res:Message[])=>{
          this.messages=res;
        });
      }
    );
  }

  /**
   * update selected message
   * @param message 
   */
  select(message:Message){
    this.selected = message;
  }

  /**
   * request to "delete" message
   * @param id 
   * @returns 
   */
  deleteMessage(id:number){
    // need yes/no confirmation
    if (!confirm("Are you sure?\nThis can not be undone.")) return;
    // request to "delete" message
    this.businessHttp.deleteMessage(id).subscribe(
      val=>{
        this.selected=null;
        // remove message from local data
        this.messages = this.messages.filter(msg=>msg.id!==id);
        alert("Message successfully deleted");
      });
  }

}
