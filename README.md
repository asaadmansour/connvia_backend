# ⚙️ Connvia – Backend API (Node.js & Express)

This is the backend for **Connvia**, a full-featured event management platform that connects **Event Creators, Vendors, Venue Owners, and Attendees** through a modern and scalable system.

The backend powers authentication, event logic, payments, file uploads, notifications, dashboards, and integrations with third-party services.

---

## 🌐 Frontend & Live Demo

- ✅ **Frontend Repository:** [Connvia Frontend](https://github.com/asaadmansour/connvia)
- ✅ **Live Website:** [Visit Connvia](https://connvia-production.up.railway.app/)

---

## 🚀 Tech Stack

The backend is built using the following technologies:

- **Node.js** – JavaScript runtime  
- **Express.js** – Server framework  
- **MongoDB** – Main database  
- **SQL2 / phpMyAdmin** – Additional relational data handling  
- **JWT** – Authentication & security  
- **Stripe** – Secure payment processing  
- **Railway** – Deployment & hosting  
- **Brevo** – Email notifications & communication  

---

## 📂 Project Structure
```
connvia_backend/
├── config/ # Database & service configurations
├── controllers/ # Route logic & business rules
├── jobs/ # Scheduled tasks (cron jobs)
├── middleware/ # Auth, validation, error handling
├── routes/ # API endpoints
├── uploads/ # Uploaded files (images, documents)
├── utils/ # Helpers & utilities
├── draft/ # Temporary or test code
├── create_notifications_table.js
├── app.js # App configuration
├── server.js # Server startup
├── testpw.js # Password testing (temporary/debug)
├── package.json
├── package-lock.json
└── .gitignore
---
```
## 🔌 API Overview (Examples)
```
| Feature          | Description |
|------------------|-------------|
| Authentication   | JWT-based login & registration |
| Payments         | Stripe integration for secure checkout |
| Events           | Create, browse, update, manage events |
| Vendors          | Bidding, quotes, location requests |
| Venues           | Listings, bookings, approvals |
| Notifications    | Email + in-app (via Brevo & custom logic) |
| File Uploads     | Handled via uploads/ directory |
| Admin Tools      | Analytics, monitoring, and validation |
```
---

## 🚀 Deployment

This backend is deployed using Railway, with environment variables and database connections configured on the platform.

## 🛠️ Installation & Setup

```bash
# 1. Clone the repository
git clone https://github.com/asaadmansour/connvia_backend.git

# 2. Navigate into the folder
cd connvia_backend

# 3. Install dependencies
npm install

# 4. Run the server (development)
npm run dev

# Or start normally
npm start 
```
