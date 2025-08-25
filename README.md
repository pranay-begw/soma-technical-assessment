## Soma Capital Technical Assessment

This is a technical assessment as part of the interview process for Soma Capital.

> [!IMPORTANT]  
> You will need a Pexels API key to complete the technical assessment portion of the application. You can sign up for a free API key at https://www.pexels.com/api/  

To begin, clone this repository to your local machine.

## Development

This is a [NextJS](https://nextjs.org) app, with a SQLite based backend, intended to be run with the LTS version of Node.

To run the development server:

```bash
npm i
npm run dev
```

## Task:

Modify the code to add support for due dates, image previews, and task dependencies.

### Part 1: Due Dates 

When a new task is created, users should be able to set a due date.

When showing the task list is shown, it must display the due date, and if the date is past the current time, the due date should be in red.

### Part 2: Image Generation 

When a todo is created, search for and display a relevant image to visualize the task to be done. 

To do this, make a request to the [Pexels API](https://www.pexels.com/api/) using the task description as a search query. Display the returned image to the user within the appropriate todo item. While the image is being loaded, indicate a loading state.

You will need to sign up for a free Pexels API key to make the fetch request. 

### Part 3: Task Dependencies

Implement a task dependency system that allows tasks to depend on other tasks. The system must:

1. Allow tasks to have multiple dependencies
2. Prevent circular dependencies
3. Show the critical path
4. Calculate the earliest possible start date for each task based on its dependencies
5. Visualize the dependency graph

## Submission:

1. Add a new "Solution" section to this README with a description and screenshot or recording of your solution. 
2. Push your changes to a public GitHub repository.
3. Submit a link to your repository in the application form.

Thanks for your time and effort. We'll be in touch soon!

## Solution:

### Part 1:

1. Due date has been added as a field in the exisiting todo model.
2. The "Add Task" form takes due date as an input.
3. Each task has an edit option which can be used to edit the due date (among other fields).
4. If a task is overdue, due date is displayed in red.

### Part 2:

1. I added a separate field for description which would be used to search for an image using the Pexels API.
2. The image is fetched using the description field and displayed in the todo item.
3. The first image is set as the image of the task.
4. PEXELS_API_KEY is used to authenticate the request to the Pexels API and can be set using `echo "PEXELS_API_KEY=your_api_key" > .env.local`
5. I also implemented a local cache for the images to avoid making multiple requests to the Pexels API for the same image for an already created task.

### Part 3:

1. I added a separate field for dependencies which would be used to store the dependencies of a task.
2. The dependencies are stored as an array of numbers, where each number is the ID of a task that the current task depends on.
3. The dependencies are displayed in the todo item as a list of checkboxes, where each checkbox is associated with a task.
4. The dependencies are calculated using the `calculateEarliestStartDates` function, which takes the todos as input and returns the todos with the earliest possible start date for each task based on its dependencies.
5. The critical path is calculated using the `findCriticalPath` function, which takes the todos as input and returns the todos that are on the critical path.
6. The earliest possible start date for each task is displayed in the todo item as a date.
7. I used react-flow to visualize the dependency graph of all tasks.
8. The graph updates when the todos are updated, added, or deleted.
9. Cycles are checked for with each update and addition.
10. Adding a new task doesn't really create a cycle ever because the dependencies can only be set with existing tasks.
11. Cycles are checked for and the user is alerted if a cycle is detected and the edit doesn't take place.
12. Finally, for deleting tasks - a task cannot be deleted if it is a dependency of another task.

### Link to Demo:

https://drive.google.com/file/d/1Mk4E0CyoIJgPzeboTqb-2s6JiLeuckSZ/view?usp=sharing
