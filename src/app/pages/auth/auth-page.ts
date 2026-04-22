import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BlogService } from '../../core/blog.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of, tap } from 'rxjs';

@Component({
  selector: 'app-auth-page',
  imports: [FormsModule],
  templateUrl: './auth-page.html',
})
export class AuthPage {
  private readonly blogService = inject(BlogService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly mode = signal<'login' | 'register'>('login');
  readonly error = signal('');
  readonly isLoading = signal(false);
  readonly name = signal('');
  readonly bio = signal('');
  readonly email = signal('');
  readonly password = signal('');

  submit(): void {
    this.error.set('');
    this.isLoading.set(true);

    const request =
      this.mode() === 'login'
        ? this.blogService.login(this.email().trim(), this.password())
        : this.blogService.register({
            name: this.name().trim(),
            email: this.email().trim(),
            password: this.password(),
            bio: this.bio().trim(),
          });

    request
      .pipe(
        tap(() => {
          this.router.navigateByUrl('/feed').then();
        }),
        catchError((error: unknown) => {
          this.error.set(error instanceof Error ? error.message : 'Не удалось выполнить действие');
          return of(null);
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
