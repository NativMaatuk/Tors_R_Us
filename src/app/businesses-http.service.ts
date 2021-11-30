import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Business, Functions, Message, Review, Schedule, Service, Statistics } from './classes';
import { HttpManagerService } from './http-manager.service';

@Injectable({
  providedIn: 'root'
})
export class BusinessesHttpService {

  
  constructor(private httpManager:HttpManagerService) { }

  /**
   * fetch the current user's businesses from the server by it's email
   * @param {string} userEmail string - the logged in user's email
   * @returns Business[] - the businesses owned by current logged in user
   */
  getOwned(userEmail:string):Observable<Business[]>{
    return this.httpManager.http.get(`${this.httpManager.baseUrl}/businessManager/getByOwner/${userEmail}`).pipe(
      map((res:Business[])=>{
        return Functions.createBusinessArray(res);
      }), catchError(this.httpManager.handleError));
  }

  /**
   * request a business from the server by name, return null if non found else the requested business
   * @param {string} name string - the requested business name
   * @returns Business | null
   */
  getBusiness(name:string):Observable<Business>{
    return this.httpManager.http.get(`${this.httpManager.baseUrl}/businessManager/getByName/${name}`).pipe(
      map((res:Business)=>{
        if (!res) return null;
        return Business.clone(res);
      }), catchError(this.httpManager.handleError));
  }

  /**
   * request from the server the statistics of given business's name
   * @param {string} name 
   * @returns {Statistics}
   */
   getStatistics(name:string):Observable<Statistics>{
    return this.httpManager.http.get(`${this.httpManager.baseUrl}/businessManager/getStatistics/${name}`).pipe(
      map((res:Statistics)=>{
        return res;
      }), catchError(this.httpManager.handleError));
  }

  /**
   * requests the server to add a business, return the requested business if all goes well
   * @param {string} business Business - the business
   * @returns Business - will return the same business if all went well
   */
  addBusiness(business:Business):Observable<Business>{
    return this.httpManager.http.post(`${this.httpManager.baseUrl}/businessManager/addBusiness`,JSON.stringify(business),{headers:this.httpManager.header}).pipe(
      map((res:Business)=>{
        return Business.clone(res);
      }), catchError(this.httpManager.handleError));
  }

  /**
   * requests the server to update a business info, will return the updated business if all goes well
   * @param {Business} business Business - the updated business info
   * @param {string} orgName string - the original business name, for checks
   * @returns Business - the updated info
   */
  updateBusiness(business:Business,orgName:string): Observable<Business>{
    return this.httpManager.http.put(`${this.httpManager.baseUrl}/businessManager/updateBusiness`,JSON.stringify({business:business,orgName:orgName}),{headers:this.httpManager.header}).pipe(
      map((res)=>{
        return business;
      }), catchError(this.httpManager.handleError));
  }

  /**
   * request to delete business from the server, returns true if all goes well
   * @param name string - the business name
   * @returns true | error
   */
  /* businesses won't be deleted but deactivated
  deleteBusiness(name:string): Observable<boolean>{
    let params:HttpParams = new HttpParams().set('name',name);
    return this.httpManager.http.delete(`${this.httpManager.baseUrl}/businessManager/deleteBusiness`,{params:params}).pipe(
      map((res)=>{
        return true;
      }), catchError(this.httpManager.handleError));
  }
  */
  
  /**
   * request to toggle the business activated state.
   * if succeed will also deactivate its services and delete all future appointments related to the business.
   * returns true if succeed else http error
   * @param {string} name string - the business name
   * @param {number} currentState number - the current business activated state
   * @returns true | Error
   */
  toggleActivatedBusiness(name:string,currentState:number): Observable<boolean>{
    return this.httpManager.http.put(`${this.httpManager.baseUrl}/businessManager/toggleActivatedBusiness`,JSON.stringify({name:name,activated:currentState}),{headers:this.httpManager.header}).pipe(
      map((res)=>{
        return true;
      }), catchError(this.httpManager.handleError));
  }

  /**
   * get and set the extras (schedules and services) in given business
   * @param {Business} business Business
   */
  setExtras(business:Business): void{
    this.getSchedules(business.name).subscribe(
      (res:Schedule[])=>business.schedules=res
    );
    this.getServices(business.name).subscribe(
      (res:Service[])=>business.services=res
    );
  }

  /**
   * fetch the business schedules from the server, ordered by dayInWeek
   * @param {string} businessName string - the business name
   * @returns Schedule[] - the business schedules, ordered by dayInWeek
   */
  getSchedules(businessName:string):Observable<Schedule[]>{
    return this.httpManager.http.get(`${this.httpManager.baseUrl}/businessManager/getSchedules/${businessName}`).pipe(
      map((res:Schedule[])=>{
        return Functions.createScheduleArray(res);
      }), catchError(this.httpManager.handleError));
  }

  /**
   * sends an update request in server for the given schedule, will return the same updated schedule if all went well
   * @param {Schedule} schedule Schedule
   * @returns Schedule | Error
   */
  updateSchedule(schedule:Schedule):Observable<Schedule>{
    return this.httpManager.http.put(`${this.httpManager.baseUrl}/businessManager/updateSchedule`,JSON.stringify(schedule),{headers:this.httpManager.header}).pipe(
      map((res:Schedule)=>{
        return Schedule.clone(res);
      }), catchError(this.httpManager.handleError));
  }

  /**
   * will request to add the service to the database, if all goes well will return the same service
   * @param {Service} service Service - the service
   * @returns Service | error
   */
  addService(service:object):Observable<Service>{
    return this.httpManager.http.post(`${this.httpManager.baseUrl}/businessManager/addService`,JSON.stringify(service),{headers:this.httpManager.header}).pipe(
      map((res:Service)=>{
        return Service.clone(res);
      }), catchError(this.httpManager.handleError));
  }

  /**
   * fetch the business services from the server
   * @param {string} businessName string - the business name
   * @returns Service[]
   */
  getServices(businessName:string):Observable<Service[]>{
    return this.httpManager.http.get(`${this.httpManager.baseUrl}/businessManager/getServices/${businessName}`).pipe(
      map((res:Service[])=>{
        return Functions.createServiceArray(res);
      }), catchError(this.httpManager.handleError));
  }

  /**
   * sends an update request in server for the given service, will return the same updated service if all went well
   * @param {Service} service Service
   * @returns Schedule | Error
   */
  updateService(service:Service):Observable<Service>{
    console.log(JSON.stringify(service))
    return this.httpManager.http.put(`${this.httpManager.baseUrl}/businessManager/updateService`,JSON.stringify(service),{headers:this.httpManager.header}).pipe(
      map((res:Service)=>{
        return Service.clone(res);
      }), catchError(this.httpManager.handleError));
  }

  /**
   * request to delete the service from the server by it's id, if all goes well will return the same id
   * @param id number - the service's id
   * @returns number
   */
  /* services wont be deleted, only deactivated or reactivated
  deleteService(id:number): Observable<number>{
    let params:HttpParams = new HttpParams().set("id",id.toString());
    return this.httpManager.http.delete(`${this.httpManager.baseUrl}/businessManager/deleteService`,{params:params}).pipe(
      map((res)=>{
        return id;
      }), catchError(this.httpManager.handleError));
  }
  */

  /**
   * request the service to toggle the activated state of given service.
   * if succeed then will then all future appointments related to the service will be deleted.
   * returns true if succeed else http error code.
   * @param {number} id number - the service id
   * @param {number} currentState number - the current service activated state
   * @returns true | Error
   */
  toggleActivatedService(id:number,currentState:number): Observable<boolean>{
    return this.httpManager.http.put(`${this.httpManager.baseUrl}/businessManager/toggleActivatedService`,JSON.stringify({id:id,activated:currentState}),{headers:this.httpManager.header}).pipe(
      map((res)=>{
        return true;
      }), catchError(this.httpManager.handleError));
  }

  /**
   * returns the outbox of given business name
   * @param {string} name string - the business name
   * @returns Message[]
   */
  getOutbox(name:string): Observable<Message[]>{
    return this.httpManager.http.get(`${this.httpManager.baseUrl}/businessManager/getOutbox/${name}`).pipe(
      map((res:Message[])=>{
        return Functions.createMessageArray(res);
      }), catchError(this.httpManager.handleError));
  }

  /**
   * returns the free times in given date in the format of an array, each item is {'timeOf':string,'duration':number}
   * @param {string} businessName string - the business name
   * @param {string} dateOf string - the requested date
   * @returns object[] - the free times in given date in the format of {'timeOf':string,'duration':number}, duration as in how long the time is free for
   */
  getFreeTimes(businessName:string,dateOf:string): Observable<object[]>{
    return this.httpManager.http.get(`${this.httpManager.baseUrl}/businessManager/getFreeTimes/${businessName}/${dateOf}`).pipe(
      map((res:object[])=>{
        return res;
      }), catchError(this.httpManager.handleError));
  }

  /**
   * requests the reviews of given business, by its name.
   * @param {string} businessName string - the requested business name
   * @returns Review[]
   */
  getReviewsByBusiness(businessName:string): Observable<Review[]>{
    return this.httpManager.http.get(`${this.httpManager.baseUrl}/businessManager/getReviews/${businessName}`).pipe(
      map((res:Review[])=>{
        return Functions.createReviewArray(res);
      }), catchError(this.httpManager.handleError));
  }

  /**
   * request from server to search for any business that its name contain the given name, and not owned by the userEmail given
   * @param {string} name string
   * @param {string} userEmail string
   * @returns Business[]
   */
  searchByName(name:string,userEmail:string): Observable<Business[]>{
    return this.httpManager.http.get(`${this.httpManager.baseUrl}/businessManager/searchByName/${name}/${userEmail}`).pipe(
      map((res:Business[])=>{
        return Functions.createBusinessArray(res);
      }), catchError(this.httpManager.handleError));
  }

  /**
   * request the server to search for all businesses that offer services with similler names, and not owned by the userEmail given
   * @param {string} names string
   * @param {string} userEmail string
   * @returns Business[]
   */
  searchByServices(names:string, userEmail:string): Observable<Business[]>{
    return this.httpManager.http.get(`${this.httpManager.baseUrl}/businessManager/searchByServices/${names}/${userEmail}`).pipe(
      map((res:Business[])=>{
        return Functions.createBusinessArray(res);
      }), catchError(this.httpManager.handleError));
  }

  /**
   * request the server to search for all businesses that offer services with similler names that have an openning at the requested time
   * returns an array with each item [business:Business, time:string]
   * @param {string} dateOf string - dateFormat: {yyyy-MM-dd}
   * @param {string} timeOf string - dateFormat: {HH:mm}
   * @param {string} names string
   * @param {string} userEmail string
   * @returns object[] - each item -> [business:Business, time:string]
   */
  searchByTimeServices(dateOf:string,timeOf:string,names:string,userEmail:string): Observable<object[]>{
    return this.httpManager.http.get(`${this.httpManager.baseUrl}/businessManager/searchByTimeServices/${names}/${userEmail}/${dateOf}/${timeOf}`).pipe(
      map((res:object[])=>{
        return res;
      }), catchError(this.httpManager.handleError));
  }
  

  /**
   * request the server to send a message, if sendMail is true will also send an email to the receiverEmail
   * if all went well will return true
   * @param {object} message
   * @param {string} message.content
   * @param {string} message.subject
   * @param {string} message.businessName
   * @param {string} message.receiverEmail
   * @param {boolean} sendMail 
   * @return {Observable<boolean>}
   */
  sendMessage(message:object,sendMail:boolean): Observable<boolean>{
    return this.httpManager.http.post(`${this.httpManager.baseUrl}/businessManager/sendMessage/${sendMail}`,JSON.stringify(message),{headers:this.httpManager.header}).pipe(
      map(res=>{
        return true;
      }), catchError(this.httpManager.handleError));
  }

  /**
   * request the server to hide the message from the business
   * @param {number} id 
   * @returns {void}
   */
  deleteMessage(id:number):Observable<void>{
    return this.httpManager.http.put(`${this.httpManager.baseUrl}/businessManager/deleteMessage`,JSON.stringify({id:id}),{headers:this.httpManager.header}).pipe(
      map(res=>{
        return;
      }), catchError(this.httpManager.handleError));
  }

}
