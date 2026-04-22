export type PostVisibility = 'public' | 'request';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  bio: string;
}

export interface Post {
  id: string;
  authorId: string;
  title: string;
  body: string;
  tags: string[];
  visibility: PostVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface AccessRequest {
  id: string;
  postId: string;
  requesterId: string;
  status: RequestStatus;
  createdAt: string;
}

export interface NewPostForm {
  title: string;
  body: string;
  tags: string;
  visibility: PostVisibility;
}

export interface PostView extends Post {
  author?: User;
  comments: CommentView[];
  access?: AccessRequest;
  canRead: boolean;
}

export interface CommentView extends Comment {
  author?: User;
}
