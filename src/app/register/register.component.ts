import { Component, OnInit } from '@angular/core';
import {FormGroup,FormControl} from '@angular/forms';
import { User } from '../classes';
import { UserManagerService } from '../user-manager.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {

  register:FormGroup;

  constructor(private userManager:UserManagerService) { }

  ngOnInit(): void {
    this.createForm();  // init register form
  }

  /**
   * initialize register form
   */
  createForm(){
    this.register = new FormGroup({
      name: new FormControl(),
      email: new FormControl(),
      password: new FormControl(),
      phone: new FormControl()
    });
  }

  /**
   * submit function for register form,
   * calls user-manager service to register a new user
   */
  onSubmit(form){
    let user:User = new User(this.register.controls['email'].value,this.register.controls['name'].value,this.register.controls['password'].value,this.register.controls['phone'].value,1);
    this.userManager.register(user);
  }

  /**
   * returns true if the control value is valid and if it has been ditied or touched,
   * else returns false
   * @param {formControl} control 
   * @returns boolean
   */
  isValid(control){
    return !control.valid && (control.dirty || control.touched);
  }

}
