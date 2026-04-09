import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  sancNumber?: string;
  role: 'nurse' | 'admin';
  totalCpdPoints: number;
  isPremium?: boolean;
  createdAt: Timestamp;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface Webinar {
  id: string;
  title: string;
  description: string;
  provider: string;
  accreditationNumber: string;
  cpdPoints: number;
  startTime: Timestamp;
  durationMinutes: number;
  zoomLink: string;
  price?: number;
  quiz: QuizQuestion[];
}

export interface Registration {
  id: string;
  userId: string;
  webinarId: string;
  registeredAt: Timestamp;
  attended: boolean;
  paid?: boolean;
  quizScore?: number;
  certificateIssued: boolean;
  certificateUrl?: string;
}
