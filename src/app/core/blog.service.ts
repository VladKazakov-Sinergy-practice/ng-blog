import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap, tap } from 'rxjs';
import {
  AccessRequest,
  Comment,
  Follow,
  NewPostForm,
  Post,
  PostView,
  RequestStatus,
  User
} from './blog.models';

const API_URL = 'http://localhost:3000';
const CURRENT_USER_KEY = 'sy-blog-current-user';

@Injectable({ providedIn: 'root' })
export class BlogService {
  private readonly http = inject(HttpClient);
  private readonly currentUserSignal = signal<User | null>(this.restoreUser());

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.currentUserSignal()));

  login(email: string, password: string): Observable<User> {
    const normalizedEmail = email.trim().toLowerCase();

    return this.http.get<User[]>(`${API_URL}/users`).pipe(
      map((users) => {
        const user = users.find((candidate) =>
          candidate.email.trim().toLowerCase() === normalizedEmail
          && candidate.password === password
        );

        if (!user) {
          throw new Error('Неверная почта или пароль');
        }

        return user;
      }),
      tap((user) => this.setCurrentUser(user))
    );
  }

  register(user: Omit<User, 'id'>): Observable<User> {
    const normalizedEmail = user.email.trim().toLowerCase();

    return this.http.get<User[]>(`${API_URL}/users`).pipe(
      switchMap((users) => {
        if (users.some((candidate) => candidate.email.trim().toLowerCase() === normalizedEmail)) {
          throw new Error('Пользователь с такой почтой уже есть');
        }

        return this.http.post<User>(`${API_URL}/users`, {
          ...user,
          email: normalizedEmail,
          id: crypto.randomUUID()
        });
      }),
      tap((createdUser) => this.setCurrentUser(createdUser))
    );
  }

  logout(): void {
    localStorage.removeItem(CURRENT_USER_KEY);
    this.currentUserSignal.set(null);
  }

  loadUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${API_URL}/users`);
  }

  loadFollows(userId: string): Observable<Follow[]> {
    return this.http.get<Follow[]>(`${API_URL}/follows`, {
      params: new HttpParams().set('followerId', userId)
    });
  }

  toggleFollow(followerId: string, followingId: string): Observable<Follow | null> {
    return this.http.get<Follow[]>(`${API_URL}/follows`, {
      params: new HttpParams().set('followerId', followerId).set('followingId', followingId)
    }).pipe(
      switchMap((follows) => {
        const existingFollow = follows.at(0);

        if (existingFollow) {
          return this.http.delete<void>(`${API_URL}/follows/${existingFollow.id}`).pipe(map(() => null));
        }

        return this.http.post<Follow>(`${API_URL}/follows`, {
          id: crypto.randomUUID(),
          followerId,
          followingId
        });
      })
    );
  }

  loadPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(`${API_URL}/posts`).pipe(
      map((posts) => [...posts].sort((first, second) => second.createdAt.localeCompare(first.createdAt)))
    );
  }

  loadPostViews(): Observable<PostView[]> {
    return forkJoin({
      users: this.loadUsers(),
      posts: this.loadPosts(),
      comments: this.http.get<Comment[]>(`${API_URL}/comments`),
      accessRequests: this.http.get<AccessRequest[]>(`${API_URL}/accessRequests`)
    }).pipe(
      map(({ users, posts, comments, accessRequests }) => {
        const currentUser = this.currentUserSignal();

        return posts.map((post) => {
          const author = users.find((user) => user.id === post.authorId);
          const access = currentUser
            ? accessRequests.find((request) => request.postId === post.id && request.requesterId === currentUser.id)
            : undefined;
          const canRead = post.visibility === 'public'
            || post.authorId === currentUser?.id
            || access?.status === 'approved';

          return {
            ...post,
            author,
            access,
            canRead,
            comments: comments
              .filter((comment) => comment.postId === post.id)
              .map((comment) => ({
                ...comment,
                author: users.find((user) => user.id === comment.authorId)
              }))
          };
        });
      })
    );
  }

  loadPost(id: string): Observable<Post | undefined> {
    return this.http.get<Post[]>(`${API_URL}/posts`, {
      params: new HttpParams().set('id', id)
    }).pipe(map((posts) => posts.at(0)));
  }

  createPost(authorId: string, form: NewPostForm): Observable<Post> {
    const now = new Date().toISOString();

    return this.http.post<Post>(`${API_URL}/posts`, {
      id: crypto.randomUUID(),
      authorId,
      ...this.normalizePostForm(form),
      createdAt: now,
      updatedAt: now
    });
  }

  updatePost(post: Post, form: NewPostForm): Observable<Post> {
    return this.http.patch<Post>(`${API_URL}/posts/${post.id}`, {
      ...this.normalizePostForm(form),
      updatedAt: new Date().toISOString()
    });
  }

  deletePost(postId: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/posts/${postId}`);
  }

  addComment(postId: string, authorId: string, body: string): Observable<Comment> {
    return this.http.post<Comment>(`${API_URL}/comments`, {
      id: crypto.randomUUID(),
      postId,
      authorId,
      body,
      createdAt: new Date().toISOString()
    });
  }

  requestAccess(postId: string, requesterId: string): Observable<AccessRequest> {
    return this.http.get<AccessRequest[]>(`${API_URL}/accessRequests`, {
      params: new HttpParams().set('postId', postId).set('requesterId', requesterId)
    }).pipe(
      switchMap((requests) => {
        const existingRequest = requests.at(0);

        if (existingRequest) {
          return of(existingRequest);
        }

        return this.http.post<AccessRequest>(`${API_URL}/accessRequests`, {
          id: crypto.randomUUID(),
          postId,
          requesterId,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      })
    );
  }

  loadRequestsForAuthor(authorId: string): Observable<Array<AccessRequest & { post?: Post; requester?: User }>> {
    return forkJoin({
      users: this.loadUsers(),
      posts: this.http.get<Post[]>(`${API_URL}/posts`, {
        params: new HttpParams().set('authorId', authorId)
      }),
      requests: this.http.get<AccessRequest[]>(`${API_URL}/accessRequests`)
    }).pipe(
      map(({ users, posts, requests }) => requests
        .filter((request) => posts.some((post) => post.id === request.postId))
        .map((request) => ({
          ...request,
          post: posts.find((post) => post.id === request.postId),
          requester: users.find((user) => user.id === request.requesterId)
        })))
    );
  }

  updateAccessRequest(id: string, status: RequestStatus): Observable<AccessRequest> {
    return this.http.patch<AccessRequest>(`${API_URL}/accessRequests/${id}`, { status });
  }

  private setCurrentUser(user: User): void {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    this.currentUserSignal.set(user);
  }

  private restoreUser(): User | null {
    const savedUser = localStorage.getItem(CURRENT_USER_KEY);

    return savedUser ? JSON.parse(savedUser) as User : null;
  }

  private normalizePostForm(form: NewPostForm): Pick<Post, 'title' | 'body' | 'tags' | 'visibility'> {
    return {
      title: form.title.trim(),
      body: form.body.trim(),
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
      visibility: form.visibility
    };
  }
}
