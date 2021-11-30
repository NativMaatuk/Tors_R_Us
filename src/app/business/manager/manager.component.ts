import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BusinessesHttpService } from 'src/app/businesses-http.service';
import { Business } from 'src/app/classes';
import { UserManagerService } from 'src/app/user-manager.service';

@Component({
  selector: 'app-manager',
  templateUrl: './manager.component.html',
  styleUrls: ['./manager.component.css']
})
export class ManagerComponent implements OnInit {

  constructor(private userManager:UserManagerService, private businessHttp:BusinessesHttpService,private router:Router, private actRoute:ActivatedRoute) { }

  businessName:string;
  business:Business;

  ngOnInit(): void {
    // check if user is the owner, if not will route user to 404
    if (!this.userManager.loginCheck()) return; // return if there is no logged user
    this.businessName = this.actRoute.snapshot.params['name'];
    // request the business in question
    this.businessHttp.getBusiness(this.businessName).subscribe((res:Business)=>{
      if (!res || res.ownerEmail!=this.userManager.user.email)
        this.router.navigate(['/404']); // route to 404 if not the owner
      else
        this.business = res;
    });
  }

}
