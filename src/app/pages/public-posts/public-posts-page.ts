import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BlogService } from '../../core/blog.service';
import { PostView } from '../../core/blog.models';

@Component({
  selector: 'app-public-posts-page',
  imports: [DatePipe, FormsModule],
  templateUrl: './public-posts-page.html'
})
export class PublicPostsPage implements OnInit {
  private readonly blogService = inject(BlogService);

  readonly currentUser = this.blogService.currentUser;
  readonly posts = signal<PostView[]>([]);
  readonly selectedTag = signal('');

  ngOnInit(): void {
    this.reload();
  }

  get publicPosts(): PostView[] {
    return this.posts()
      .filter((post) => post.visibility === 'public')
      .filter((post) => !this.selectedTag() || post.tags.includes(this.selectedTag()));
  }

  get tags(): string[] {
    return [...new Set(this.posts().filter((post) => post.visibility === 'public').flatMap((post) => post.tags))].sort();
  }

  reload(): void {
    this.blogService.loadPostViews().subscribe((posts) => this.posts.set(posts));
  }

  addComment(post: PostView, body: string): void {
    const currentUser = this.currentUser();
    const text = body.trim();

    if (!currentUser || !text) {
      return;
    }

    this.blogService.addComment(post.id, currentUser.id, text).subscribe(() => this.reload());
  }
}
