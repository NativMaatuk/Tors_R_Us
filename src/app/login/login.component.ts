import { Component, OnInit } from '@angular/core';
import {FormGroup,FormControl} from '@angular/forms';
import { UserManagerService } from '../user-manager.service';
import { UsersHttpService } from '../users-http.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  login:FormGroup;

  constructor(private userManager:UserManagerService, private usersHttp:UsersHttpService) { }

  ngOnInit(): void {
    // delete exsisting user in localStorage
    if (localStorage.getItem("user"))
      localStorage.removeItem("user");
    this.createForm();  // initialize login form
  }

  /**
   * initialize login form
   */
  createForm(){
    this.login = new FormGroup({
      email: new FormControl(),
      password: new FormControl()
    });
  }

  /**
   * submit login form, will send an http request to check if the data is valid,
   * if so will log user, and route him to home page
   * @param form 
   */
  onSubmit(form){
    //console.log(form);
    this.userManager.requestLogin(this.login.controls['email'].value,this.login.controls['password'].value);
  }

  /**
   * return true if the control's value is valid and if the value has been touched or ditied.
   * else return false
   * @param control 
   * @returns 
   */
  isValid(control){
    return !control.valid && (control.dirty || control.touched);
  }

  /**
   * after validating given email, receives and update a new password for the given email
   */
  forgotPassword(){
    let emailRegex = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
    let email: string;
    // get the email
    while (true) {
      // get email
      email = prompt("Please enter your email:");
      // check if empty or null
      if (!email)
        return;
      // if invalid, display alert
      if (!email.match(emailRegex))
        alert("Invalid Email");
      else
        break;
    } 
    // get validation code
    this.usersHttp.getValidation(email.toLowerCase()).subscribe((code)=>{
        let guess, password:string, repeatPassword:string;
        let passwordRegex = new RegExp(/^[A-Z][^\s]{4,}$/);
        // get user's guess
        while (true) {
          guess = prompt("A validation code was sent to your email, please enter the validation code:");
          if (!guess)
            return;
          else if (guess != code)
            alert("Wrong code");
          else
            break;
        } 
        // get new password
        while (true) {
          password = prompt("Enter new password:");
          if (!password){
            alert("Update cancelled");
            return;
          }
            else if (!password.match(passwordRegex)){
              alert("Invalid password");
              console.log(password.match(passwordRegex))
            }
          else
            break;
        } 
        // repeat password
        while (true) {
          repeatPassword = prompt("Repeat the new password:");
          if (!repeatPassword){
            alert("Update cancelled");
            return;
          }
          else if ( password !== repeatPassword)
            alert("Wrong");
          else
            break;
        }
        // update password
        this.usersHttp.updatePassword(email, password).subscribe((resCode)=>{
          if (resCode == 204)
            alert("Password updated successfully");
          else if (resCode == 401)
            alert("Update error, invalid email");
        });
    });
  }

}
