import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { AuthPage } from './pages/auth/auth-page';
import { FeedPage } from './pages/feed/feed-page';
import { PostManagerPage } from './pages/post-manager/post-manager-page';
import { PublicPostsPage } from './pages/public-posts/public-posts-page';

export const routes: Routes = [
  { path: 'auth', component: AuthPage },
  { path: 'feed', component: FeedPage, canActivate: [authGuard] },
  { path: 'public', component: PublicPostsPage },
  { path: 'posts', component: PostManagerPage, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'feed' },
  { path: '**', redirectTo: 'feed' }
];
