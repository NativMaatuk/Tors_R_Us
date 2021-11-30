import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BusinessesHttpService } from 'src/app/businesses-http.service';
import { Business, Review } from 'src/app/classes';
import { UserManagerService } from 'src/app/user-manager.service';

@Component({
  selector: 'app-info-and-reviews',
  templateUrl: './info-and-reviews.component.html',
  styleUrls: ['./info-and-reviews.component.css']
})
export class InfoAndReviewsComponent implements OnInit {

  //validation of update form
  updateForm:FormGroup;

  constructor(private userManager:UserManagerService, private businessHttp:BusinessesHttpService, private actRoute:ActivatedRoute, private router:Router ) { }
  
  public business:Business;
  public reviews:Review[];
  public selected: Review;

  // review parameters
  gaugeType = "semi";
  gaugeValue = 0;
  gaugeLabel = "users liked";
  gaugeMax = 0;
  gaugeSize = 100;
  gaugeAnimate = true;

  ngOnInit(): void {
    let name = this.actRoute.snapshot.params['name'];
    // request the business info
    this.businessHttp.getBusiness(name).subscribe(
      (res:Business)=>{
        if (!res) return;
        this.business = res;
        this.createForm();  // initiate update form
        // request all the reviews related to the business
        this.businessHttp.getReviewsByBusiness(this.business.name).subscribe(
          (res:Review[]) => {
            this.reviews = res;
            this.gaugeValue = 0;
            this.gaugeMax = this.reviews.length;
            this.reviews.forEach(review=>this.gaugeValue+=review.liked);
          }
        );
      }
    );
  }

  /**
   * initialize update business info form
   */
  createForm(){
    this.updateForm = new FormGroup({
      name:new FormControl(this.business.name),
      phone:new FormControl(this.business.phone.length == 9? `0${this.business.phone}` : this.business.phone),
      address:new FormControl(this.business.address),
      city:new FormControl(this.business.city)
    });
  }

  /**
   * submit function for update form, after the user email was validated
   * sends an http request to update the business
   */
  updateBusiness(){
    if (!this.userManager.loginCheck() || !this.business) return;
    let business:Business = new Business(this.updateForm.controls['name'].value,this.updateForm.controls['phone'].value,this.updateForm.controls['address'].value,this.updateForm.controls['city'].value,this.userManager.user.email,this.business.activated);
    // get email validation
    this.userManager.getValidation().subscribe((code)=>{
      let guess = prompt("In order to complete the update we need email validation.\nA code was sent to your email, please enter the code:");
      while (true){
        if (!guess){
          alert("Update cancelled");
          this.createForm();
          return;
        } else if (guess == code)
          break;
          else
            guess = prompt("Wrong, please enter the code:");
      }
      // request to update business
      this.businessHttp.updateBusiness(business, this.business.name).subscribe(
        (res: Business) => {
          let name = this.business.name;
          this.business = res;
          alert("Business updated successfully");
          if (this.business.name !== name) { // if changed the name, route to updated url
            this.router.navigate(['/business', this.business.name, 'manage']);
          }
        });
    });
  }

  /**
   * request to de/avtivate business, needs confirmation,
   * if the new state is deactivated than will also deactivate all active services,
   * thus cancelling all future appointments
   */
  toggleActivatedBusiness(){
    if (!this.userManager.loginCheck()) return;
    // request confirmation from owner 
    this.userManager.getValidation().subscribe(
     (code)=>{
      while (true){
        let guess = prompt("A validation code was sent to your email, please enter the code:");
        if (guess===code) // right code
          break;
        else if (!guess){ // empty guess, cancel action
          alert(`${!this.business.activated? "activation":"Deactivation"} cancelled`);
          return;
        }
        // wrong guess, try again
      }
      // reconfirmation needed via yes/no
      if (this.business.activated && !confirm("Are you sure?\nAll future appointments related to the business wil be cancelled.")) return;
      // request to de/activate business
      this.businessHttp.toggleActivatedBusiness(this.business.name,this.business.activated).subscribe(
        (res)=>{
          if (!res) return;
          this.business.activated = this.business.activated? 0:1;
          alert(`The business is now ${this.business.activated? "active":"inactive"}`);
        });
     })
  }

  /**
   * update selected review
   * @param review 
   */
  select(review:Review){
    this.selected = review;
  }

}
