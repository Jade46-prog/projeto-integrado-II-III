import type { Group, Lesson, Staff, Subject } from '../../shared/types';
export interface Details {
  lessons: Lesson[];
  subjects: Subject[];
  staff: Staff[];
  groups: Group[];
}
