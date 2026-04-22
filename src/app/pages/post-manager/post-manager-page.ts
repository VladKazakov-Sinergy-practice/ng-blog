import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BlogService } from '../../core/blog.service';
import { AccessRequest, NewPostForm, Post, RequestStatus } from '../../core/blog.models';

@Component({
  selector: 'app-post-manager-page',
  imports: [DatePipe, FormsModule],
  templateUrl: './post-manager-page.html'
})
export class PostManagerPage implements OnInit {
  private readonly blogService = inject(BlogService);

  readonly currentUser = this.blogService.currentUser;
  readonly posts = signal<Post[]>([]);
  readonly requests = signal<Array<AccessRequest & { post?: Post; requester?: { name: string } }>>([]);
  readonly editingPost = signal<Post | null>(null);

  form: NewPostForm = {
    title: '',
    body: '',
    tags: '',
    visibility: 'public'
  };

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    const currentUser = this.currentUser();

    if (!currentUser) {
      return;
    }

    this.blogService.loadPosts().subscribe((posts) => {
      this.posts.set(posts.filter((post) => post.authorId === currentUser.id));
    });
    this.blogService.loadRequestsForAuthor(currentUser.id).subscribe((requests) => this.requests.set(requests));
  }

  edit(post: Post): void {
    this.editingPost.set(post);
    this.form = {
      title: post.title,
      body: post.body,
      tags: post.tags.join(', '),
      visibility: post.visibility
    };
  }

  save(): void {
    const post = this.editingPost();

    if (!post) {
      return;
    }

    this.blogService.updatePost(post, this.form).subscribe(() => {
      this.editingPost.set(null);
      this.reload();
    });
  }

  delete(post: Post): void {
    this.blogService.deletePost(post.id).subscribe(() => this.reload());
  }

  updateRequest(requestId: string, status: RequestStatus): void {
    this.blogService.updateAccessRequest(requestId, status).subscribe(() => this.reload());
  }
}
