import { ObjectId } from 'mongodb';

export interface PropertyEdit {
  _id: ObjectId;
  elementId: ObjectId;
  userId: ObjectId;
  timestamp: Date;
  changes: {
    [key: string]: {
      oldValue: any;
      newValue: any;
    };
  };
}

export interface Issue {
  _id: ObjectId;
  elementId: ObjectId;
  modelId: string;
  title: string;
  description: string;
  authorId: ObjectId;
  createdAt: Date;
  status: string;
  priority: string;
  type: string;
  labels: string[];
  assignedTo?: ObjectId;
  dueDate?: Date;
  deleted?: boolean; // Add deleted field for soft delete
}

export interface IssueEdit {
  _id: ObjectId;
  issueId: ObjectId;
  userId: ObjectId;
  timestamp: Date;
  changes: {
    [key: string]: {
      oldValue: any;
      newValue: any;
    };
  };
  authorInfo?: {
    username: string;
  };
}

export interface Response {
  _id: ObjectId;
  issueId: ObjectId;
  authorId: ObjectId;
  authorName: string;
  text: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date; // Add updatedAt field
}

export interface ResponseEdit {
  _id: ObjectId;
  responseId: ObjectId;
  userId: ObjectId;
  timestamp: Date;
  changes: {
    [key: string]: {
      oldValue: any;
      newValue: any;
    };
  };
}

export interface User {
  _id: string;
  username: string;
  email: string;
  password?: string; // Password might not be present when fetched from session
  role: 'user' | 'admin'; // Add role field
  avatar?: string; // Add avatar field
  createdAt: Date;
  updatedAt: Date;
}
