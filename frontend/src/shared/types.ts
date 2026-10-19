export type Role = 'ADMIN' | 'COORDINATOR' | 'PROFESSOR';
export interface Course {
  id: string;
  code: string;
  name: string;
  semesters: number;
}
export interface User {
  id: string;
  name: string;
  cpf: string;
  role: Role;
  active: boolean;
  courses: Course[];
}
export interface Subject {
  id: string;
  course_id: string;
  name: string;
}
export interface Group {
  id: string;
  course_id: string;
  code: string;
  semester: number;
}
export interface Room {
  id: string;
  name: string;
  floor: string;
  capacity: number | null;
}
export interface Staff {
  id: string;
  name: string;
  role: Role;
}
export interface Calendar {
  start: string;
  end: string;
}
export interface Lesson {
  id: string;
  series_id: string;
  course_id: string;
  subject_id: string;
  professor_id: string;
  room_id: string;
  lesson_date: string;
  starts_at: string;
  ends_at: string;
  published: boolean;
  status: 'CONFIRMED' | 'CANCELLED';
  subject_name: string;
  professor_name: string;
  room_name: string;
  course_name: string;
  groups: Group[];
}
export interface Notice {
  id: string;
  message: string;
  created_at: string;
}
export interface LoginResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}
