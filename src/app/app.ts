import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BlogService } from './core/blog.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly blogService = inject(BlogService);
  protected readonly currentUser = this.blogService.currentUser;

  logout(): void {
    this.blogService.logout();
  }
}
