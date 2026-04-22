import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BlogService } from '../../core/blog.service';
import { NewPostForm, PostView, User } from '../../core/blog.models';

@Component({
  selector: 'app-feed-page',
  imports: [DatePipe, FormsModule],
  templateUrl: './feed-page.html'
})
export class FeedPage implements OnInit {
  private readonly blogService = inject(BlogService);

  readonly currentUser = this.blogService.currentUser;
  readonly users = signal<User[]>([]);
  readonly followingIds = signal<Set<string>>(new Set());
  readonly posts = signal<PostView[]>([]);
  readonly selectedTag = signal('');
  readonly isPostModalOpen = signal(false);
  postForm: NewPostForm = {
    title: '',
    body: '',
    tags: '',
    visibility: 'public'
  };

  readonly followedPosts = computed(() => {
    const followed = this.followingIds();
    const selectedTag = this.selectedTag();

    return this.posts()
      .filter((post) => followed.has(post.authorId) || post.authorId === this.currentUser()?.id)
      .filter((post) => !selectedTag || post.tags.includes(selectedTag));
  });

  readonly availableTags = computed(() => {
    const tags = this.followedPosts().flatMap((post) => post.tags);

    return [...new Set(tags)].sort();
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    const currentUser = this.currentUser();

    if (!currentUser) {
      return;
    }

    this.blogService.loadUsers().subscribe((users) => this.users.set(users));
    this.blogService.loadFollows(currentUser.id).subscribe((follows) => {
      this.followingIds.set(new Set(follows.map((follow) => follow.followingId)));
    });
    this.blogService.loadPostViews().subscribe((posts) => this.posts.set(posts));
  }

  toggleFollow(user: User): void {
    const currentUser = this.currentUser();

    if (!currentUser) {
      return;
    }

    this.blogService.toggleFollow(currentUser.id, user.id).subscribe(() => this.reload());
  }

  openPostModal(): void {
    this.postForm = { title: '', body: '', tags: '', visibility: 'public' };
    this.isPostModalOpen.set(true);
  }

  createPost(): void {
    const currentUser = this.currentUser();

    if (!currentUser) {
      return;
    }

    this.blogService.createPost(currentUser.id, this.postForm).subscribe(() => {
      this.isPostModalOpen.set(false);
      this.reload();
    });
  }

  addComment(post: PostView, body: string): void {
    const currentUser = this.currentUser();
    const text = body.trim();

    if (!currentUser || !text) {
      return;
    }

    this.blogService.addComment(post.id, currentUser.id, text).subscribe(() => this.reload());
  }

  requestAccess(post: PostView): void {
    const currentUser = this.currentUser();

    if (!currentUser) {
      return;
    }

    this.blogService.requestAccess(post.id, currentUser.id).subscribe(() => this.reload());
  }

  userIsFollowed(user: User): boolean {
    return this.followingIds().has(user.id);
  }
}
