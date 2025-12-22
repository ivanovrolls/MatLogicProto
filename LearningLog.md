# Learning Log
Aside from wanting to implement an app idea for myself that I've been thinking about for a while, I wanted to take the project to proerly learn and understand how **React Flow** works. A lot of app.tsx React code was generated or accelerated with the help of AI. If some code looks too smooth, then it was probably written by AI, but I am actively rewriting, editing, or adding on top of code myself. This learning log exists to document what I learned and explain design decisions.

## What is MatLogic?
Simply put, it is a grappling-logic graph editor for martial artists, which implements my own first-person visualisation techniques and flow modelling that I have only ever used on paper in notebooks over the years, that I used to document my martial arts progress.
- Nodes represent positions and techniques
- Edges represent transitions between these positions/techniques
- Each graph belongs to a user, and a user can have multiple graphs

## AI assistance disclosure
I used AI assistance primarily for:
- React Flow setup patterns (nodes/edges state hooks, connect handlers)
- basic auth wiring (register/login token handling)
- UI layout and “glue code” when integrating API calls with the editor

## What I did myself / verified manually:
- backend code
- containerisation
- debugging
- some css, such as the dropdown menu, was reused from previous websites 

---------

## React & TypeScript notes

### TypeScript Types
One of the first things I learnt was **TypeScript types**. They concept is similar to OOP classes, but more lightweight. No need for me to worry about constructors or anything of the sort; it just describes the shape of the data, but it has no inherent runtime behaviour. One of the typescripts I used: 

```ts
type Graph = {
  id: number;
  title: string;
  user_id: number;
};
```

### Async functions and promises
**Async functions** are different from normal functions. A normal function has the expected behaviour as functions in other languages, but async function have the ability to pause, waiting for slow processes such as file reads/writes or timers. Regardless of this, they let your app run while it waits. As opposed to normal functions, they return promises, not values. Promises are representations of values that you do not yet have, but will have.

**"I promise that I will either give you the result, or tell you what went wrong"**

There are three states of a promise. 
1. Pending - still waiting. 
2. Fulfilled - finished successfully (value was returned). 
3. Rejected - failed.

fetch() always returns a promise.

```ts 
const result = fetch("/api/graphs");
```

But other things return promises too, such as: 

```ts
const data = await res.json();
```
So to conclude, if a function is marked as **async** it always returns a promise.
