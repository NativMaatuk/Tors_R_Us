import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HttpManagerService {

  readonly baseUrl = "http://localhost:8000/api";
  readonly header = {'Content-Type':'application/json'};

  constructor(public readonly http:HttpClient) { }

  
  handleError(error:HttpErrorResponse){
    console.log(error); // log error in client side
    switch (error.status){
      case 303:
        alert("The business name is already taken");
        break;
      case 400:
        alert("Invalid data");
        break;
      case 401:
        alert("Invalid email or password");
        break;
      case 403:
        alert("the time is no longer available");
        break;
      case 409:
        alert("The email is already taken");
        break;
      case 417:
        alert("Http Error - try again later");
        break;
      case 418:
        alert("The appointment has passed, can no longer write a review for it");
        break;
      case 422:
        alert("Bad Request - Data not received");
        break;
      case 406:
        alert("There is already a review for the appointment");
        break;
    }
    if (error.status>=500)
      alert("Server Error - "+error.status);
    return throwError(error);
  }

}
