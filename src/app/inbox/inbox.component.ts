import { Component, OnInit } from '@angular/core';
import { UserManagerService } from '../user-manager.service';
import { AppointmentsHttpService } from '../appointments-http.service';
import { FormGroup } from '@angular/forms';
import { Message, Review } from '../classes';

@Component({
  selector: 'app-inbox',
  templateUrl: './inbox.component.html',
  styleUrls: ['./inbox.component.css']
})
export class InboxComponent implements OnInit {

  constructor(private userManager:UserManagerService,private appointmentHttp:AppointmentsHttpService) { }

  private _selected: Message;
  
  public get selected(): Message {
    return this._selected;
  }

  ngOnInit(): void {
    // refresh inbox in user manager service
    this.userManager.refreshInbox();
  }

  getMessages(){
    return this.userManager.inbox;
  }

  /**
   * select a message, save the selected message in this.selected
   * @param message 
   */
  select(message:Message){ 
    this._selected = message;
    if (!message.wasRead)
      this.userManager.toggleWasRead(message);
  }

  /**
   * add a review via review message,
   * will send an addReview http request to server
   * @param form 
   */
  addReview(form:FormGroup){
    let review:Review = new Review(form.controls['id'].value,+form.controls['liked'].value,form.controls['content'].value,form.controls['businessName'].value,form.controls['userEmail'].value,form.controls['id'].value);
    this.appointmentHttp.addReview(review).subscribe(
      (res)=>alert("Review added")
    );
  }

  /**
   * accept time offer via offer message,
   * will send an acceptOffer http request to server
   * @param appointmentId 
   * @param offer 
   */
  offerBtn(appointmentId:number,offer:string){
    this.appointmentHttp.acceptOffer(appointmentId,offer).subscribe(
      (res)=>{
        alert("Offer Accepted");
      }
    )
  }

  /**
   * send a delete message request to server,
   * if succeed will hide message from the user
   * @param id 
   * @returns 
   */
  deleteMessage(id:number){
    if (!confirm("Are you sure?\nThis can not be undone.")) return;
    this.userManager.deleteMessage(id);
    this._selected=null;
  }

}
