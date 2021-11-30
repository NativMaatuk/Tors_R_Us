import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Business, Functions, Message, Review, User } from './classes';
import { HttpManagerService } from './http-manager.service';
import {AES} from 'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class UsersHttpService {

  
  constructor(private httpManager:HttpManagerService) { }

  /**
   * request the server to confirm the client login, by email and password
   * @param {string} email User's email
   * @param {string} password User's password
   * @returns {User} object if the info was correct, if no user found than error code 404
   */
  checkLogin(email:string,password:string): Observable<User>{
    let encPassword:string = AES.encrypt(password,email).toString();  // encrypt the password, the email is the key
    return this.httpManager.http.get(`${this.httpManager.baseUrl}/userManager/checkLogin/${encodeURIComponent(email)}/${encodeURIComponent(encPassword)}`).pipe(
      map((res:User)=>{
        return res;
      }), catchError(this.httpManager.handleError));
  }

  /**
   * request the server to register the new user
   * @param {User} user User
   * @returns {User} User - will return the same object if all went well
   */
  register(user:User): Observable<User>{
    return this.httpManager.http.post(`${this.httpManager.baseUrl}/userManager/addUser`,JSON.stringify(user),{headers:this.httpManager.header}).pipe(
      map((res:User)=>{
        return res;
      }), catchError(this.httpManager.handleError));
  }

  /**
   * request the user's inbox from the server
   * @param {string} email string - the email of the user requesting the messages
   * @returns {Message[]} - the requested messages for given user's email
   */
  getInbox(email:string): Observable<Message[]>{
    return this.httpManager.http.get(`${this.httpManager.baseUrl}/userManager/getInbox/${email}`).pipe(
      map((res:Message[])=>{
        return Functions.createMessageArray(res);
      }), catchError(this.httpManager.handleError));
  }

  /**
   * 
   * @param {Message} message Message - sends the message's id and the opposite wasRead value
   * @returns {Message} Message - the message with updated read value
   */
  toggleReadMessage(message:Message): Observable<Message>{
    message.wasRead = 1;
    return this.httpManager.http.put(`${this.httpManager.baseUrl}/userManager/toggleReadMessage`,JSON.stringify({id:message.id,wasRead:message.wasRead}),{headers:this.httpManager.header}).pipe(
      map((res)=>{
        return message;
      }), catchError(this.httpManager.handleError));
  }

  /**
   * requests the user to update the user's info, if the new email is already taken or there is an erro will throw Http Error, else return true
   * @param {User} user User
   * @param {string} email string - original email of user
   * @returns {User} User | Error
   */
  updateUser(user:User,email:string): Observable<User>{
    return this.httpManager.http.put(`${this.httpManager.baseUrl}/userManager/updateUser`,JSON.stringify({user:user,orgEmail:email}),{headers:this.httpManager.header}).pipe(
      map((res:User)=>{
        return res;
      }), catchError(this.httpManager.handleError));
  }

  
  /**
   * request to toggle the user activated state.
   * if succeed will also deactivate its businesses, services, and delete all future appointments related to the businesses or the user.
   * returns true if succeed else http error
   * @param {string} email string - the user email
   * @param {number} currentState number - the current user activated state
   * @returns true | Error
   */
   toggleActivatedUser(email:string,currentState:number): Observable<boolean>{
    return this.httpManager.http.put(`${this.httpManager.baseUrl}/userManager/toggleActivated`,JSON.stringify({email:email,activated:currentState}),{headers:this.httpManager.header}).pipe(
      map((res)=>{
        return true;
      }), catchError(this.httpManager.handleError));
  }

  /**
   * requests the reviews of given user, by its email.
   * @param {string} email string - the requested user email
   * @returns Review[]
   */
  getReviewsByUser(email:string): Observable<Review[]>{
    return this.httpManager.http.get(`${this.httpManager.baseUrl}/userManager/getReviews/${email}`).pipe(
      map((res:Review[])=>{
        return Functions.createReviewArray(res);
      }), catchError(this.httpManager.handleError));
  }

  /**
   * requests from the server all the businesses marked as favorite by the user
   * @param {string} email string
   * @returns Business[]
   */
  getFavorites(email:string): Observable<Business[]>{
    return this.httpManager.http.get(`${this.httpManager.baseUrl}/userManager/getFavorites/${email}`).pipe(
      map((res:Business[])=>{
        return Functions.createBusinessArray(res);
      }),catchError(this.httpManager.handleError));
  }

  /**
   * requests the server to add a favorite business
   * @param {string} userEmail string
   * @param {string} businessName string
   * @returns true | Error
   */
  addFavorite(userEmail:string,businessName:string): Observable<boolean>{
    return this.httpManager.http.post(`${this.httpManager.baseUrl}/userManager/addFavorite`,JSON.stringify({userEmail:userEmail,businessName:businessName}),{headers:this.httpManager.header}).pipe(
      map((res)=>{
        return true;
      }),catchError(this.httpManager.handleError));
  }

  /**
   * requests the server to delete a favorite business
   * @param {string} userEmail string
   * @param {string} businessName string
   * @returns true | Error
   */
  deleteFavorite(userEmail:string,businessName:string): Observable<boolean>{
    return this.httpManager.http.delete(`${this.httpManager.baseUrl}/userManager/deleteFavorite/${userEmail}/${businessName}`).pipe(
      map((res)=>{
        return true;
      }),catchError(this.httpManager.handleError));
  }

  /**
   * request the server to hide the message from the user
   * @param {number} id 
   * @returns {void}
   */
   deleteMessage(id:number):Observable<void>{
    return this.httpManager.http.put(`${this.httpManager.baseUrl}/userManager/deleteMessage`,JSON.stringify({id:id}),{headers:this.httpManager.header}).pipe(
      map(res=>{
        return;
      }), catchError(this.httpManager.handleError));
  }

  /**
   * sends an email with the validation code (4 digits), and after the email is sent will return the same code
   * @param {string} email 
   * @returns {string} four digit string
   */
  getValidation(email:string): Observable<string>{
    return this.httpManager.http.get(`${this.httpManager.baseUrl}/userManager/getValidation/${email}`).pipe(
      map((res:string)=>{
        return res;
      }),catchError(this.httpManager.handleError));
  }

  /**
   * sends a request to update the password for the given email,
   * if successful return 204, else if the email isn't found return 401
   * @param {string} email 
   * @param {string} password 
   */
  updatePassword(email:string, password:string): Observable<number>{
    return this.httpManager.http.put(`${this.httpManager.baseUrl}/userManager/updatePassword`,JSON.stringify({email:email,password:password}),{headers:this.httpManager.header}).pipe(
      map((res:number)=>{
        return res;
      },catchError(this.httpManager.handleError)));
  }
  
}
