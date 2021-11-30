import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { BusinessesHttpService } from 'src/app/businesses-http.service';
import { Business } from 'src/app/classes';
import { UserManagerService } from 'src/app/user-manager.service';

@Component({
  selector: 'app-owned-businesses',
  templateUrl: './owned-businesses.component.html',
  styleUrls: ['./owned-businesses.component.css']
})
export class OwnedBusinessesComponent implements OnInit {

  constructor(private userManager:UserManagerService,private businessHttp:BusinessesHttpService) { }

  private _owned: Business[];
  public get owned(): Business[] {
    return this._owned;
  }

  form:FormGroup;

  ngOnInit(): void {
    if (!this.userManager.loginCheck()) return; // return if no logged user
    // get all logged user's businesses
    this.businessHttp.getOwned(this.userManager.user.email).subscribe((res:Business[])=>this._owned = res);
    this.createForm();  // initialize new business form
  }

  /**
   * initialize new business form
   */
  private createForm(){
    this.form = new FormGroup({
      name:new FormControl(),
      address:new FormControl(),
      city:new FormControl(),
      phone:new FormControl()
    });
  }

  /**
   * submit function for new business form
   * request the server to add a new business,
   * if all went well will alert the user
   */
  onSubmit(){
    if (!this.userManager.loginCheck()) return;
    let business = new Business(this.form.controls['name'].value,this.form.controls['phone'].value,this.form.controls['address'].value,this.form.controls['city'].value,this.userManager.user.email,1);
    this.businessHttp.addBusiness(business).subscribe((res:Business)=>{
      this._owned.push(res);
      alert("Business added");
    });
  }

}
