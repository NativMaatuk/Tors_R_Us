import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Business, Message, User } from './classes';
import { UsersHttpService } from './users-http.service';

@Injectable({
  providedIn: 'root'
})
export class UserManagerService {

  constructor(private usersHttp:UsersHttpService,private router:Router) {
    this._user = null;
    this._inbox = [];
  }

  private _user: User;
  private _inbox: Message[];
  private _favorites: Map<string,Business>;


  public set user(user:User) {
    this._user = User.clone(user);
    localStorage.setItem('user',JSON.stringify(this.user)); // for future use
  }

  /**
   * if the user is logged in then will return his info else the user will be sent to login page
   * @returns User | null
   */
  public get user(): User {
    if (!this.loginCheck()){
      this.logoutWarning();
      return null;
    }
    else if (this._user==null){
      this._user = User.clone(JSON.parse(localStorage.getItem('user')));
    }
    return this._user;
  }

  public get inbox(): Message[] {
    return this._inbox;
  }

  public get favorites(): Map<string,Business>{
    return this._favorites;
  }

  /**
   * check if there is a logged user, ether in the service or in localStorage
   * @returns boolean
   */
  loginCheck():boolean{
    return (this._user!=null || localStorage.getItem('user')!=null);
  }

  logoutWarning(): void{
    alert("Not logged in");
    this.logout();
  }

  /**
   * clearing local storage and set current user to null before routing to login page
   */
  logout(): void{
    localStorage.removeItem("user");
    this.router.navigate(['/login']);
  }

  /**
   * If successfull than will localstore the user object and route to home page else alert invalid info 
   * @param email string 
   * @param password string
   */
  requestLogin(email:string,password:string):void{
    this.usersHttp.checkLogin(email,password).subscribe(
      (res:User)=>{
        // the user is active, login
        if (res.activated == 1){
          this.user = res;
          this.refreshFavorites();
          alert("Logged in");
          this.router.navigate(['/home']); // route to home
        // the user is inactive, request reactivation
        } else if (res.activated == 0){
          if (!confirm("The account is deactived, do you wish to reactivate the account?"))
            return;
          this.toggleActivatedUser(res);
        }
      }
    );
  }

  /**
   * will send a register request to the server, if the email is not already taken it will likely be successful
   * @param user User - to be registered
   */
  register(user:User): void{
    this.usersHttp.register(user).subscribe(
      (res:User)=>{
        this._user = User.clone(res);
        alert("Registered");
        this.router.navigate(['']);
      }
    );
  }

  /**
   * request to send an http request to get the user's messages,
   * and upon receiving them will update this._inbox
   * @returns void
   */
  refreshInbox(): void{
    if (!this.loginCheck()) return;
    this.usersHttp.getInbox(this.user.email).subscribe(
      (res:Message[])=>{
        this._inbox = res;
      }
    );
  }

  /**
   * request to send an http request to update a message as read
   * @param {Message} message 
   */
  toggleWasRead(message:Message): void{
    this.usersHttp.toggleReadMessage(message).subscribe(
      (res:Message)=>{
        message.wasRead = (message.wasRead)? 0:1;
      }
    );
  }

  /**
   * request to send an http request to update user's data,
   * if succeed will update this.user to the new updated data
   * @param {User} user 
   * @returns 
   */
  updateUser(user:User): void{
    if (!this.loginCheck()) return;
    this.usersHttp.updateUser(user,this._user.email).subscribe(
      (res:User)=>{
        this.user = res;
        alert("Info Updated");
      }
    );
  }

  /**
   * get a validation code and request the user to enter it and conform he wants de/activation
   * if sorequest to send an http request to update user as de/activated
   * if all went well will route the router to login screen if he is now deactivated
   * @param {User} user
   * @returns boolean|void
   */
  toggleActivatedUser(user:User): number|void{
   this.usersHttp.getValidation(user.email).subscribe(
     (code)=>{
      while (true){
        let guess = prompt("A validation code was sent to your email, please enter the code:");
        if (guess===code)
          break;
        else if (!guess){
          alert(`${!user.activated? "activation":"Deactivation"} cancelled`);
          return;
        }
      }
      if (user.activated && !confirm("Are you sure?\nAll businesses, services, and appointments related to your businesses or you will be cancelled."))
        return;
      else if (!user.activated && !confirm("Are you sure you want to reactivate the account?"))
        return;
      this.usersHttp.toggleActivatedUser(user.email,user.activated).subscribe(
        (res:boolean)=>{
          if (!res) return;
          alert(`The account is now ${ !user.activated ? "active.\nWelcome back":"inactive. You will now be logged out."}`);
          user.activated = user.activated == 1 ? 0:1;
          if (user.activated == 1){
            this.user = user;
            this.refreshFavorites();
            this.router.navigate(['/home']); // route to home
          }
          else if (user.activated == 0){
            this.logout();
          }
          return user.activated;
        });
     }
   );
  }

  /**
   * return the getValidation function
   * @returns Observable<string>
   */
  getValidation(): Observable<string> {
    return this.usersHttp.getValidation(this.user.email);
  }

  /**
   * request to send an http request to get the user's favorite businesses
   * if an answer is returned will update this._favorites
   */
  refreshFavorites(): void{
    this._favorites = null;
    this.usersHttp.getFavorites(this.user.email).subscribe(
      (res:Business[])=>{
        this._favorites = new Map<string,Business>();
        res.forEach((item)=>this._favorites.set(item.name,item));
      }
    );
  }

  /**
   * request to send an http request to add a business to the user's favorite list
   * if true is returned will add business to this._favorites
   * @param {Business} business 
   * @returns 
   */
  addFavorite(business:Business): void{
    if (!this.loginCheck()) return;
    this.usersHttp.addFavorite(this.user.email,business.name).subscribe(
      (res:boolean)=>{
        if (!res || this._favorites.has(business.name)) return;
        this._favorites.set(business.name,business);
        //alert("Business marked as favorite");
      });
  }
  
  /**
   * request to send an http request to remove a business to the user's favorite list
   * if true is returned will remove business to this._favorites
   * @param {Business} business 
   * @returns 
   */
  deleteFavorite(business:Business): void{
    if (!this.loginCheck()) return;
    this.usersHttp.deleteFavorite(this.user.email,business.name).subscribe(
      (res:boolean)=>{
        if (!res || !this._favorites.has(business.name)) return;
        this._favorites.delete(business.name);
        //alert("Business unmarked as favorite");
      });
  }

  /**
   * request to send an http request to "delete" a message from the user
   * if an answer is returned will remove the message from local data 
   * @param id 
   */
  deleteMessage(id:number): void{
    this.usersHttp.deleteMessage(id).subscribe(val=>{
      alert("Message successfully deleted");
      this._inbox = this._inbox.filter(msg=>msg.id!==id);
    });
  }
  
}
