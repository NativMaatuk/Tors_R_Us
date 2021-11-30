import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import {ReactiveFormsModule,FormsModule} from "@angular/forms";
import {HttpClientModule} from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BusinessComponent } from './business/business.component';
import { ManagerComponent } from './business/manager/manager.component';
import { BusinessAppointmentsComponent } from './business/manager/business-appointments/business-appointments.component';
import { InfoAndReviewsComponent } from './business/manager/info-and-reviews/info-and-reviews.component';
import { OutboxComponent } from './business/manager/outbox/outbox.component';
import { SchedulesAndServicesComponent } from './business/manager/schedules-and-services/schedules-and-services.component';
import { StatisticsComponent } from './business/manager/statistics/statistics.component';
import { MonthsChartComponent } from './business/manager/statistics/months-chart/months-chart.component';
import { ServicesChartComponent } from './business/manager/statistics/services-chart/services-chart.component';
import { ProfileComponent } from './profile/profile.component';
import { OwnedBusinessesComponent } from './profile/owned-businesses/owned-businesses.component';
import { UserInfoComponent } from './profile/user-info/user-info.component';
import { HomeComponent } from './home/home.component';
import { FavoritesComponent } from './favorites/favorites.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { InboxComponent } from './inbox/inbox.component';
import { SearchComponent } from './search/search.component';
import { UserAppointmentsComponent } from './user-appointments/user-appointments.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NavbarComponent } from './navbar/navbar.component';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { NgxGaugeModule } from 'ngx-gauge';
import { MatTabsModule } from '@angular/material/tabs'; 
import { MatDividerModule } from '@angular/material/divider'; 
import { AngularStickyThingsModule } from '@w11k/angular-sticky-things';
import { AgmCoreModule } from '@agm/core';


@NgModule({
  declarations: [
    AppComponent,
    BusinessComponent,
    ManagerComponent,
    BusinessAppointmentsComponent,
    InfoAndReviewsComponent,
    OutboxComponent,
    SchedulesAndServicesComponent,
    StatisticsComponent,
    MonthsChartComponent,
    ServicesChartComponent,
    ProfileComponent,
    OwnedBusinessesComponent,
    UserInfoComponent,
    HomeComponent,
    FavoritesComponent,
    LoginComponent,
    RegisterComponent,
    InboxComponent,
    SearchComponent,
    UserAppointmentsComponent,
    PageNotFoundComponent,
    NavbarComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    NgxChartsModule,
    BrowserAnimationsModule,
    MatTabsModule,
    MatDividerModule,
    NgxGaugeModule,
    AngularStickyThingsModule,
    AgmCoreModule.forRoot({
      apiKey: 'AIzaSyDsI1mNlB82cU7zcLkuEw_W3nH7-bGIuIc'
    })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
