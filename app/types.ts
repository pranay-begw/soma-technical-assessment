import { Todo } from '@prisma/client';

export interface TodoWithCalculations extends Todo {
  earliestStartDate: Date;
  isOnCriticalPath?: boolean;
  dependenciesArray: number[];
  _order?: number; // Used to maintain the order of todos
}
