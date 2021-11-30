import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { User } from 'src/app/classes';
import { UserManagerService } from 'src/app/user-manager.service';

@Component({
  selector: 'app-user-info',
  templateUrl: './user-info.component.html',
  styleUrls: ['./user-info.component.css']
})
export class UserInfoComponent implements OnInit {


  form:FormGroup;

  constructor(private userManager:UserManagerService, private router:Router) { }

  ngOnInit(): void {
    if (!this.userManager.loginCheck()){
      return; // return if no logged user
    };
    this.createForm();  // init update info form
  }

  /**
   * initalize update info form
   */
  private createForm(){
    this.form = new FormGroup({
      name:new FormControl(this.getUser().name),
      email:new FormControl(this.getUser().email),
      phone:new FormControl(this.getUser().phone),
      password:new FormControl(this.getUser().password),
    });
  }

  /**
   * calls userManager logout()
   */
  logout(){
    this.userManager.logout();
  }

  /**
   * returns true if there is a logged user, else returns false
   * @returns boolean
   */
  loginCheck(): boolean{
    return this.userManager.loginCheck();
  }

  /**
   * return currently logged user
   * @returns User
   */
  getUser(): User{
    return this.userManager.user;
  }

  /**
   * submit function for update info form,
   * sends an HTTP request to update user's info
   * if all went well will update user's info in client side
   */
  onSubmit(){
    if (!this.userManager.loginCheck()) return;
    let user:User = new User(this.form.controls['email'].value,this.form.controls['name'].value,this.form.controls['password'].value,this.form.controls['phone'].value,1);
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
      this.userManager.updateUser(user);
    })
  }

  /**
   * calls toggleActivatedUser() in user-manager service
   */
  toggleActivatedUser(){
    if (!this.loginCheck()) return;
    this.userManager.toggleActivatedUser(this.getUser());
  }
  
}
