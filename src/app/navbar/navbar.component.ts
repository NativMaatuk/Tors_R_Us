import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { User } from '../classes';
import { UserManagerService } from '../user-manager.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {

  constructor(private userManager:UserManagerService,private router:Router) { }

  public searchForm: FormGroup;

  ngOnInit(): void {
    if (!this.loginCheck()) // if no logged user
      this.userManager.logoutWarning(); // display alert
    this.searchForm = new FormGroup({ // initialize search form
      request: new FormControl("")
    });
  }

  /**
   * returns currently logged user
   * @returns User
   */
  getUser():User{
    return this.userManager.user;
  }

  /**
   * returns true if there is a logged user, else returns false
   * @returns boolean
   */
  loginCheck(){
    return this.userManager.loginCheck();
  }

  /**
   * route user to search page (by name/services) with the search field value
   */
  search(){
    let str:string = this.searchForm.controls['request'].value;
    if (!str)
      return;
    else
      this.router.navigate(['/search',str]);
  }

  /**
   * returns true if the search field has a valid value, else false
   * @returns boolean
   */
  isSearchValid(){
    let str:string = this.searchForm.controls['request'].value.replace(/[,]/g,'');
    str = str.trim();
    return this.searchForm.valid && str;
  }

}
