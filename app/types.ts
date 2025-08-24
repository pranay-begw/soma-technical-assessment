import { Todo } from '@prisma/client';

export interface TodoWithCalculations extends Todo {
  earliestStartDate: Date;
  isOnCriticalPath?: boolean;
  dependenciesArray: number[];
}
