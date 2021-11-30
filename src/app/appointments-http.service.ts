import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Appointment, Functions, Review, Service } from './classes';
import { HttpManagerService } from './http-manager.service';

@Injectable({
  providedIn: 'root'
})
export class AppointmentsHttpService {

  
  constructor(private httpManager:HttpManagerService) { }

  /**
   * return a cloned appointments array, to use the functions and other attributes
   * @param {Appointment[]} arr 
   * @returns Appointment[]
   */
  private createAppointmentArray(arr:Appointment[]):Appointment[]{
    let res:Appointment[] = [];
    arr.forEach((item)=>{
      res.push(Appointment.clone(item));
    });
    return res;
  }

  /**
   * fetch all the appointments related to the user, will also uptated pass appointments to completed
   * @param {string} userEmail string - the user's email
   * @returns Appointment[] - the user's appointments
   */
  getByUser(userEmail:string):Observable<Appointment[]>{
    return this.httpManager.http.get(`${this.httpManager.baseUrl}/appointmentManager/getByUser/${userEmail}`).pipe(
      map((res:Appointment[])=>{
        return this.createAppointmentArray(res);
      }), catchError(this.httpManager.handleError));
  }

  /**
   * returns all the appointments of given business name
   * @param {string} businessName string - the business name
   * @returns Appointment[]
   */
  getByBusiness(businessName:string): Observable<Appointment[]>{
    return this.httpManager.http.get(`${this.httpManager.baseUrl}/appointmentManager/getByBusiness/${businessName}`).pipe(
      map((res:Appointment[])=>{
        return this.createAppointmentArray(res);
      }), catchError(this.httpManager.handleError));
  }

  /**
   * request to enter the new appointment to the server, the object argument won't include the appointment id and it's schedule id.
   * @param {object} appointment object - {timeOf,dateOf,irregular,businessName,userEmail}
   * @param {Service[]} services Service[] - an array of the services related to the appointment
   * @returns Appointment - the newly inserted appointment with the id and scheduleId
   */
  addAppointment(appointment:object,services:Service[]): Observable<Appointment>{
    return this.httpManager.http.post(`${this.httpManager.baseUrl}/appointmentManager/addAppointment`,JSON.stringify({appointment:appointment,services:services}),{headers:this.httpManager.header}).pipe(
      map((res:Appointment)=>{
        return Appointment.clone(res);
      }), catchError(this.httpManager.handleError));
  }

  /**
   * request to accept offer from server, if all goes well returns true, else if the time is already taken or other error will throw http error
   * @param {number} id number - the appointment's id
   * @param {string} offer string - the time offered, format HH:mm or HH:mm:ss
   * @returns true | Error
   */
  acceptOffer(id:number,offer:string): Observable<boolean>{
    return this.httpManager.http.put(`${this.httpManager.baseUrl}/appointmentManager/acceptOffer`,JSON.stringify({appId:id,offer:offer}),{headers:this.httpManager.header}).pipe(
      map((res)=>{
        return true;
      }), catchError(this.httpManager.handleError));
  }

  /**
   * request to delete the appointment from server, returns the same id if successfull
   * @param {number} id number - the appointment's id
   * @returns number - the same given id
   */
  deleteAppointment(id:number): Observable<number>{
    return this.httpManager.http.delete(`${this.httpManager.baseUrl}/appointmentManager/deleteAppointment/${id}`).pipe(
      map((res)=>{
        return id;
      }), catchError(this.httpManager.handleError));
  }

  /**
   * request to delete the appointment from server, and send a message to user, returns the same id if successfull
   * @param {number} id number - the appointment's id
   * @param {string} content string - the message content
   * @returns number - the same given id
   */
  deleteAppointmentMessage(id:number,content:string):Observable<number> {
    return this.httpManager.http.delete(`${this.httpManager.baseUrl}/appointmentManager/deleteAppointment/${id}/${content}`).pipe(
      map((res)=>{
        return id;
      }), catchError(this.httpManager.handleError));
  }

  /**
   * fetch all the services of given appointment's id from server, using INNER JOIN `appointmentService` <- `Service`
   * @param {number} appointmentId number - appointment's id to get the services from server
   * @returns Service[] - all the services related to given appointment
   */
  getServices(appointmentId:number):Observable<Service[]>{
    return this.httpManager.http.get(`${this.httpManager.baseUrl}/appointmentManager/getServices/${appointmentId}`).pipe(
      map((res:Service[])=>{
        return Functions.createServiceArray(res);
      }),catchError(this.httpManager.handleError));
  }

  /**
   * request to add a new review to the server, the appointmentId will be the same as the base id, if successfully added will return the same review object
   * @param {Review} review Review - the new review, appointmentId will be the same as the base id
   * @returns Review
   */
  addReview(review:Review): Observable<Review>{
    return this.httpManager.http.post(`${this.httpManager.baseUrl}/appointmentManager/addReview`,JSON.stringify(review),{headers:this.httpManager.header}).pipe(
      map((res)=>{
        return review;
      }),catchError(this.httpManager.handleError));
  }

}
