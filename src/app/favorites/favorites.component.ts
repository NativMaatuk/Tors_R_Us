import { Component, OnInit } from '@angular/core';
import { BusinessesHttpService } from '../businesses-http.service';
import { Business } from '../classes';
import { UserManagerService } from '../user-manager.service';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.css']
})
export class FavoritesComponent implements OnInit {

  constructor(private userManager:UserManagerService ,private businessHttp:BusinessesHttpService) { }

  private _favorites:Business[];
  public get favorites():Business[]{
    return this._favorites;
  }

  ngOnInit(): void {
    // refresh favorite businesses in user-manager service
    this.userManager.refreshFavorites();
  }

  getFavorites():Map<string,Business>{
    return this.userManager.favorites;
  }
}
