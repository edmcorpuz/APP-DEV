# **Blog Website**

Midterm Exam | Applications Development and Emerging Technologies

## **Overview**

Build a mini blog platform backend as **two Express servers**. The Auth Server registers users and issues JWTs. The Blog API verifies those tokens using the same secret and never calls the Auth Server.

There are three roles: ***reader***, ***author*** and ***admin***. Anyone can read posts without logging in, but writing needs a valid token. Data lives in in-memory arrays, so no database is needed. You can test your endpoints with Postman.

## **Technical requirements**

* Utilize Node.js alongside Express, incorporating the jsonwebtoken and dotenv packages.

* Both access and refresh tokens must be signed using JWT\_SECRET. Both instances pull this value from a unified .env file located at the project root using dotenv path options. Avoid hardcoding secret keys.

* Refresh tokens share the same JWT\_SECRET signature and include a type: "refresh" payload parameter to allow immediate rejection by the Blog API.

* The Auth Server listens on port 4000, while the Blog API operates on port 5000\.

* Access tokens hold { id, username, role } data with a 15-minute lifespan. Refresh tokens remain valid for 7 days.

* Data persists within localStorage. In-memory arrays store user and post records, reading from localStorage upon startup and updating following modifications. 

* User objects inside the Auth Server follow this schema: { id, username, hashed\_password, role, refresh\_token, created\_at, revoked\_at }. Hashing should leverage Node's native crypto module.

* Upon logging in, populate the user's refresh\_token field and wipe revoked\_at. The /refresh endpoint must confirm validity, verify the "refresh" type claim, and match the saved refresh\_token. During logout, clear the refresh\_token reference and update revoked\_at.

* The Blog API operates independently, rejecting refresh tokens without querying the Auth Server.

* Format error responses uniformly as JSON objects: { "error": "message" }.

* Maintain distinct folders for routes, controllers, and middleware across both server projects.

Folder structure:

blog-platform/  
├── .env              (shared by both servers)  
├── .env.example  
├── auth-server/  
│   ├── server.js  
│   └── src/  
│       ├── routes/  
│       └── controllers/  
└── blog-api/  
    ├── server.js  
    └── src/  
        ├── routes/  
        ├── controllers/  
        └── middleware/   (authenticate.js, authorize.js)

## **Server 1: Auth Server (port 4000\)**

| Method | Endpoint | Description | Success | Errors |
| :---- | :---- | :---- | :---- | :---- |
| POST | /register | Body: username, password, role (reader, author or admin) | 201 | 400 missing field or invalid role, 409 username taken |
| POST | /login | Body: username, password. Returns { "accessToken": "...", "refreshToken": "..." } and stores the refresh token | 200 | 400 missing field, 401 wrong credentials |
| POST | /refresh | Body: refreshToken. Returns a new { "accessToken": "..." } | 200 | 400 missing token, 401 invalid, expired or revoked token |
| POST | /logout | Body: refreshToken.  clear the refresh\_token reference and update revoked\_at | 200 | 400 missing token |

## **User Model:**

	{

	id: ,

	username: “”,

role: “”,

hashed\_password= “”, 

role=””, 

refresh\_token= “”, created\_at, revoked\_at

}

## **Server 2: Blog API (port 5000\)**

Two middleware are required: 

* authenticate   
  * reads Authorization: Bearer \<token\>, verifies it and sets req.user (otherwise 401\) and rejects any token with type refresh.   
  * Apply authenticate per route, because the two post GET routes are public.   
* authorize(...roles)   
  * returns 403 when the role is not allowed.   
  * Ownership checks (post author or admin) belong in the controller or a small middleware.

| Method | Endpoint | Who can access | Description | Success | Errors |
| :---- | :---- | :---- | :---- | :---- | :---- |
| GET | /api/posts | public, no token | List all posts | 200 | none |
| GET | /api/posts/:id | public, no token | View one post | 200 | 404 |
| POST | /api/posts | author, admin | Create a post: title, content. authorId comes from the token | 201 | 400, 401, 403 |
| PUT | /api/posts/:id | post owner or admin | Update title or content | 200 | 400, 401, 403, 404 |
| DELETE | /api/posts/:id | admin | Delete a post | 200 | 401, 403, 404 |
| GET | /api/me/posts | any logged-in user | List only your own posts | 200 | 401 |

## **Posts Model:**

	{

	Id: ,

	User\_id : ,

	Title: “”,

}

## **Submission and grading**

1. Push your code into a new branch and name it ***midterm-exam***.  
2. Deadline will be on Oct 21, 2026 (Wednesday).  
3. Output will be presented in front. Corresponding criteria will be followed.   
4. The Midterm Exam is worth 100 points and 60% of your total period grade.  
5. A submission bin will be given for you to upload your GitHub repository.

## 

## **RUBRICS:**

|  | *Rubric Item* | *Excellent* | *Accomplished* | *Developing* | *Poor* | *Total* |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| *Auth Server* | ***Register endpoint*** | 10 pts. | 7 pts. | 5pts. | 2 pts. | 10 pts. |
|  | ***Login** \-generate access token \-updates revoke\_at to be null \-updates refresh\_token of user* | 15 pts. | 12 pts. | 7 pts. | 4 pts. | 15 pts. |
|  | ***Refresh**  \-regenerates accessToken* | 15 pts. | 12 pts. | 7 pts. | 4 pts. | 15 pts. |
|  | ***Logout*** | 10 pts. | 7 pts. | 5pts. | 2 pts. | 10 pts. |
| *Posts Server* | ***Public/Logged-in user** \-view all \-view own \-view specific one* | 10 pts. | 7 pts. | 5pts. | 2 pts. | 10 pts. |
|  | ***Author:** \-create  \-edit* | 15 pts. | 12 pts. | 7 pts. | 4 pts. | 15 pts. |
|  | ***Admin:** \-delete posts \-view all posts \-create \-edit*  | 20 pts. | 15 pts. | 12 pts. | 6 pts. | 20 pts. |
|  | ***Middleware Use*** | 5 pts. | 4 pts. | 3 pts. | 1 pt. | 5 pts |
|  |  |  |  |  | ***TOTAL*** | ***100*** |

