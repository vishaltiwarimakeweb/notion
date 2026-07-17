# Project Overview

- This is a Notion type AI powered collaborative B2B Multi tenancy CRUD SaaS application with RBAC. Organizaton manager registers at our app via email (unique) & password credentials and can invite human employees to register as an emoloyee of the organzation via Google or Github OAuth (no-credentials, memebrs automatically sign-in and get access to the assigned workspace automatically upon clicking the invitation link sent via email by the manager). OTP sent to email in case the manager forgets their password. The app has workspaces like Engineering department, HR Department, Fix Laptop ( any custom thing etc. ) and only manager can create,update or delete those workspaces and invite members to that workspaces or assign/unassign existing members to that workspace whereas members can only access that workspace, can't change their workspace or create a new workspace, update or delete any existing workspace or assign themselves to any workspace. However members can usassign themselves from an assigned workspace. Workspaces contain pages which contain 2 things, Page content and a link to the next page like a tree. Page contents are stored using block-based editor (blocknote) where every heading, paragraph, table, bullet list is considered a block so that they can be independently edited or deleted. Blocks can be customizable headings (font style, size and orientation etc. blocknote formatting), customizable paragraphs, a cover image, resizable bullet lists with custom font weight, image, video, audio, any media file, customizable tables(custom rows and columns with custom table borders etc. blocknote formatting), links. Link to other pages within a page contains reference to a page which contains the same thing, page content and a next page link. Example : Page 1 : React.js( linked to Hooks ) --> Nested page ( Hooks in React ) --> Nested page( useEffect ), hence there's infinite nesting of pages. Employees can create multiple individual pages within a workspace or nested pages in a page, update contents of a page or delete a page ( both individual or nested ).Heart of this app is that the employees in a workspace can see the changes being made on a page by any other employees by using WebSockets and edit it in the real-time too. There are 2 AI features in this application : Inline - AI tool -> Inside a page, after writing something, the inline AI provides features like elaborate content ( relevant to the already writtent content ), compact content, fix grammatical mistakes, enhance content ( make it more professional ). And the second AI feature is a chatbot assistant which can respond to queries of the user such as find this page, find me all my workspaces, edit this page, delete this page, unassign me from the workspace. Billing is done via Razorpay which includes 3 plans : Free ( allows 2 members per workspace ),Pro ( 20 members per workspace ) & Enterprise ( unlimited members per workspace ). Deleted pages and workpaces don't get removed from the database, instead they go to trash, Employees can mark pages as thier favourites. Searching pages in a workspace, recently visited pages.

# Tech Stack

- **Frontend** : Next.js ( App Router ), Tailwind CSS, Lucide React, Typescript, React Toastify ( for Toasters )
- **Backend** : Next.js ( API Routes )
- **Database** : MongoDB
- **Tools** : Redis ( for storing and managing OTPs ), WebSockets via a dedicated Node/Socket.io server ( for real-time page collaboration — Next.js API routes can't hold persistent connections ), fallback LLMs ( OpenAI -> Gemini -> Groq ), RAG using MongoDB Atlas Vector Search ( reuses existing DB instead of adding a separate vector store ), MCP Tools ( in-built, added in Phase 8 ), Razorpay, Brevo ( for Email sending ), Cloudinary ( for media file-storage )

# UI

- Modern and eye-catching UI of all the pages.
- Light/Dark mode UI using Tailwind CSS.
- Decent layout of all the pages.
- Fully responsive
- Toasters, Loaders ( page & buttons ) & Icons ( Lucide React )

# Features

## Authentication

- Manager auth via email(unique), password credentials and register as an organization.
- Hashed password storage via bcrypt
- Secure login via JWT
- Generated JWT token is stored in Cookies
- Token properties : httpOnly : true, sameSite : "lax", secure : true, path : "/", expiresIn : 24 _ 7 _ 60 _ 60 _ 1000
- Employees don't need credentials, they automatically sign in via Google/Github OAuth.
- In case of forgotten password, manager can enter the email by which his organzation is registered and request a 5 digit OTP and upon successful verification, can change the password.

## OTP Rules

- All OTP and its TTL is stored & managed in Redis.
- OTP is hashed via bcrypt and then stored in Redis as a hashed string.
- Once requested an OTP for any purpose, user can request a new OTP after 90 seconds(TTL), if the user tries before, an error toaster asks the user to wait for remaining seconds.
- Rate limiting is implemented and managed in Redis in such a way that if a user enters incorrect OTP for more than 5 times, the user is blocked from entering and requesting the OTP for 3 minutes and the user is notified via an error toaster.
- Entered OTP by the user is compared by await bcrypt.compare() method as the OTP stored is also a hashed string.

## Dashboard

- Dashboards show assigned workspaces, their counts, pages from the first dashboard.
- Search bar to search pages ( visible on both, dashboard and inside every workspace )
- Trash bin
- AI widget ( visible on all the pages, so must be used in layout.tsx )

## Pages

- Landing page ( accessible with or without login ) : Advertising the app's features
- Dashboard
- Profile page
- Edit profile page
- Individual workspace page
- Indivdual Page page
- Login
- Register
- Navbar containing links to different pages : Home, My workspaces, Profile, Recently viewed pages

## Workspaces

- Workspaces exist inside an organization and require a name.
- Workspaces consist of multiple pages.
- Workspaces can be created, updated or deleted only by the organzation's manager.
- Employees can't view other workspaces they are not assigned to or assign themselves to a workspace.
- Employees can only unassign themselves from a workspace.
- Only manager can invite new employees to a workspace, assign/unassign existing employees to a workspace.

## Page's features inside a workspace

- Employees can create new pages inside a workspace.
- Pages have a unique title.
- Pages inside a workspace can only be modified/deleted by all the workspace's employees.
- Each content inside a page (heading, paragraph, media files, tables etc.) is stored via Block based editor ( Blocknote ) so that every block can be updated/deleted individually and independently.
- All media files are uploaded on Cloudinary.
- Pages can be nested inside a page with a link.
- Pages contain page content and a link to the next page as described in the project overview.
- All the changes to a page's content are visible to all the employees in real time via WebSockets.
- Employees can also modify a page in real-time.
- Upon writing a content inside a page, the In-line AI feature suggests blocknote editor formatting (font size, weight etc.), elaborate the relevant content, concise the relevant content, enhance the content ( make the content more professional ), fix grammatical mistakes.

## AI Widget

- The AI Chat widget is fixed on the bottom right and is visible on all the pages.
- The AI widget provides a chat screen where user can ask queries to the AI Chat assistant about the app or their workspace, pages.
- It uses a fallback LLM model, firstly it calls OpenAI then Gemini then Groq to avoid failure.
- It is a RAG based model.
- It uses in built MCP tools that call the backend and send a response to the LLM which it summarizes and sends appoprate response to the user.
- MCP tools are : Search page, Search Workspace, Find all pages (only main pages, not the nested ones) along with their asssociated workspace name, delete page, edit page, create page, create nested page inside [parent page's name/title].

## Billing

- Billing is implemented via Razorpay.
- It consists of 3 plans : Free, Pro & Enterprise.
- Free plan provides 2 users per workspace.
- Pro plan provides 20 users per workspace.
- Enterprise plan provides unlimited users per workspace.
- Only manager can access the upgrade billing section.

## Employee Invitation

- The organzation can invite employees by sending them email ( handled by Brevo ) to a specific workspace of that organzation.
- The invitation email mentions the organization and the workspace name.
- Existing employees on the organzation don't need email invitation again to be assigned to a new workspace.
- Employees don't need credentials, upon clicking the invitation link in the email, the employee is redirected to continue via Google or Github and upon continuation, the employee can access the dashboard via OAuth.

# Database Schema ( \_id is automatically assigned by MongoDB to all the documents )

## Organization

```
 name : String , minLength : 5 & required
 billingPlan : String, default - free, enum : [free,pro, enterprise]
 createdAt : default mongodb timestamp
 updatedAt : default mongodb timestamp
```

index By : name

## Manager

```
organizationId : mongoose.Schema.Types.ObjectId, ref to organization
 name : String , minLength : 2 & required
 avatar : String, default : null
 email : String, unique : true & strict regex matching, required
 password : String and minLength of 8, required
 createdAt : default mongodb timestamp
 updatedAt : default mongodb timestamp
```

index By : name

## Workspace

```
organizationId : mongoose.Schema.Types.ObjectId, ref to organization
title : String , minLength : 6 & required
isDeleted : Boolean, default : false ( trash flag )
deletedAt : Date, default : null
createdAt : default mongodb timestamp
updatedAt : default mongodb timestamp
```

index By : title

## WorkspaceMember

```
organizationId : mongoose.Schema.Types.ObjectId, ref to organization, required
workspaceId : mongoose.Schema.Types.ObjectId, ref to workspace, required
employeeId : mongoose.Schema.Types.ObjectId, ref to employee, required
createdAt : default mongodb timestamp
updatedAt : default mongodb timestamp
```

index By : compound unique ( workspaceId, employeeId ) — tracks which employees are assigned to which workspace, used to enforce per-plan member limits ( Free : 2, Pro : 20, Enterprise : unlimited )

## Invitation

```
organizationId : mongoose.Schema.Types.ObjectId, ref to organization, required
workspaceId : mongoose.Schema.Types.ObjectId, ref to workspace, required
invitedBy : mongoose.Schema.Types.ObjectId, ref to manager, required
email : String, required
token : String, unique : true & required
status : String, enum : [pending, accepted, expired], default : pending
expiresAt : Date, required
createdAt : default mongodb timestamp
updatedAt : default mongodb timestamp
```

index By : token

## Page

```
organizationId : mongoose.Schema.Types.ObjectId, ref to organization
workspaceId : mongoose.Schema.Types.ObjectId, ref to workspace, required
createdBy : mongoose.Schema.Types.ObjectId, ref to employee, required
title : String , minLength : 3 & required
nextPage : mongoose.Schema.Types.ObjectId, ref to page, default : null
isDeleted : Boolean, default : false ( trash flag )
deletedAt : Date, default : null
createdAt : default mongodb timestamp
updatedAt : default mongodb timestamp
```

index By : title, workspaceId

## Content

```
pageId : mongoose.Schema.Types.ObjectId, ref to page
type: String , enum : [Heading, Paragraph, Bullet List, Table, Image, Video, Audio, Media File], required
data : mongoose.Schema.Types.Mixed, required ( the actual block payload : text, media URL, table rows/cols etc., shape depends on type )
prevContent : mongoose.Schema.Types.ObjectId, ref to content, default : null ( if first content of that page, otherwise the last inserted content of that page )
nextContent : mongoose.Schema.Types.ObjectId, ref to content, default : null( updated to the latest inserted content's id when a new content is inserted, updated appropriately upon deleting a content )
createdAt : default mongodb timestamp
updatedAt : default mongodb timestamp
```

## Employee

```
organizationId : mongoose.Schema.Types.ObjectId, ref to organization
 name : String , minLength : 2 & required
 avatar : String, default : null
 email : String, required
 oAuth : String, enum : [Google,Github]
 createdAt : default mongodb timestamp
 updatedAt : default mongodb timestamp
```

index By : name, compound unique ( organizationId, email )

## Favorite

```
employeeId : mongoose.Schema.Types.ObjectId, ref to employee, required
pageId : mongoose.Schema.Types.ObjectId, ref to page, required
createdAt : default mongodb timestamp
updatedAt : default mongodb timestamp
```

index By : compound unique ( employeeId, pageId )

## RecentlyVisited

```
employeeId : mongoose.Schema.Types.ObjectId, ref to employee, required
pageId : mongoose.Schema.Types.ObjectId, ref to page, required
visitedAt : Date, default : now ( updated on every visit )
createdAt : default mongodb timestamp
updatedAt : default mongodb timestamp
```

index By : compound unique ( employeeId, pageId ), sort by visitedAt desc

## Message

```
organizationId : mongoose.Schema.Types.ObjectId, ref to organization, required
userId : mongoose.Schema.Types.ObjectId, ref to manager or employee depending on userType, required
userType : String, enum : [manager, employee], required
 message : String , minLength : 1 & required
 sender : String, enum : [user,assistant], required
 createdAt : default mongodb timestamp
 updatedAt : default mongodb timestamp
```

# Building Plan

## Phase 0 :

- Project scaffolding, .env.example, Manager auth (register/login/JWT/bcrypt), OTP password reset via Redis, landing page shell

## Phase 1 :

- Workspace CRUD (manager-only) + WorkspaceMember schema + plan member-limit check against Organization.billingPlan

## Phase 2 :

- Employee invitation (Invitation schema + Brevo email) + Google/GitHub OAuth sign-in + auto-assign to workspace on accept

## Phase 3 :

- Page CRUD (with workspaceId) + Blocknote content blocks + Trash (soft-delete) + Favorites

## Phase 4 :

- Real-time collaboration via WebSockets (dedicated WS service/server, since Next.js API routes can't hold persistent connections)

## Phase 5 :

- Inline AI feature (elaborate, compact, fix grammar, enhance)

## Phase 6 :

- Search (workspaces & pages) + Recently Visited

## Phase 7 :

- AI assistant widget — RAG-only, answers from the org's own pages as knowledge base, no MCP tools yet

## Phase 8 :

- MCP tools (search page, search workspace, find pages, create/edit/delete page, create nested page, unassign from workspace) wired into the Phase 7 assistant

## Phase 9 :

- Billing via Razorpay (checkout + plan upgrade/downgrade UI; limit logic already enforced since Phase 1)

## Phase 10 :

- Edit profile UI with backend features as well, both managers and employees can update/delete their profiles.
- Updating password requires entering correct current password or by verifying a 5 digits OTP sent to the registered email ( Redis + Brevo )
