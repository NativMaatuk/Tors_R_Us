import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BusinessComponent } from './business/business.component';
import { ManagerComponent } from './business/manager/manager.component';
import { FavoritesComponent } from './favorites/favorites.component';
import { HomeComponent } from './home/home.component';
import { InboxComponent } from './inbox/inbox.component';
import { LoginComponent } from './login/login.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { ProfileComponent } from './profile/profile.component';
import { RegisterComponent } from './register/register.component';
import { SearchComponent } from './search/search.component';
import { UserAppointmentsComponent } from './user-appointments/user-appointments.component';

const routes: Routes = [
  {path:'',component:LoginComponent},
  {path:'login',component:LoginComponent},
  {path:'register',component:RegisterComponent},
  {path:'home',component:HomeComponent},
  {path:'messages',component:InboxComponent},
  {path:'appointments',component:UserAppointmentsComponent},
  {path:'favorites',component:FavoritesComponent},
  {path:'profile',component:ProfileComponent},
  {path:'search/:request',component:SearchComponent},
  {path:'searchByTime/:request/:timestamp',component:SearchComponent},
  {path:'business/:name',component:BusinessComponent},
  {path:'business/:name/manage',component:ManagerComponent
  /*,children:[ // replaced with mat-tab
    {path:'',component:BusinessAppointmentsComponent},
    {path:'outbox',component:OutboxComponent},
    {path:'statistics',component:StatisticsComponent},
    {path:'appointments',component:BusinessAppointmentsComponent},
    {path:'services',component:SchedulesAndServicesComponent},
    {path:'info',component:InfoComponent},
    {path:'**',component:PageNotFoundComponent},
  ]*/},
  {path:'**',component:PageNotFoundComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
