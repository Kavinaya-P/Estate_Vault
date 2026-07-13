# Digital Estate Vault

A secure, automated digital legacy platform designed to safeguard your critical digital assets, passwords, and crypto credentials, ensuring they are seamlessly passed on to your trusted nominees when you are no longer around.

## 🌟 Key Features

* **Secure Asset Storage**: Safely store sensitive notes, passwords, and cryptocurrency credentials in an encrypted vault.
* **Nominee Assignment**: Invite trusted individuals to act as your digital heirs. Nominees receive dedicated portal access.
* **Dead Man's Switch**: An automated background system that periodically checks your activity. If you fail to check in within your configured timeframe, the system will automatically alert your nominees.
* **Death Verification System**: Nominees can submit a death certificate if the vault owner passes away. Access is heavily restricted and only granted upon manual verification by system administrators.
* **Automated Email Notifications**: Full suite of email alerts (OTP verification, nominee invitations, dead man's warnings, and vault unlocks) powered by the Gmail API via OAuth2, ensuring reliable delivery.
* **Admin Dashboard**: Dedicated portal for administrators to review death certificates and unlock vaults for verified nominees.

## 🛠️ Tech Stack

**Frontend:**
* React (Vite)
* React Router DOM
* Context API (for Auth state)
* CSS (Custom Dark/Gold UI theme)
* Axios

**Backend:**
* Node.js & Express
* MongoDB (Mongoose)
* JWT Authentication
* Nodemailer + Googleapis (Raw MIME compiling via HTTPS Port 443 to bypass strict PaaS SMTP firewalls)
* Node-Cron (for background Dead Man's Switch jobs)
* Multer (for Death Certificate uploads)

## 🚀 Deployment Architecture

This project is built using a modern split-stack deployment methodology:
* **Frontend Hosting**: [Vercel](https://vercel.com)
* **Backend Hosting**: [Render](https://render.com) (Web Service)
* **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas)

## 💻 Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/Kavinaya-P/Estate_Vault.git
cd Estate_Vault
```

### 2. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` folder using `.env.example` as a template. You will need:
* A MongoDB Atlas URI (`MONGO_URI`)
* JWT Secret strings
* Gmail OAuth2 Credentials (`GMAIL_USER`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`)

Run the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```
Create a `.env` file in the `frontend` folder:
```env
VITE_API_URL=http://localhost:5000/api
```

Run the frontend server:
```bash
npm run dev
```

## 📩 Contact & Queries

For any queries regarding this project, please contact: [pkavinayaaa@gmail.com](mailto:pkavinayaaa@gmail.com)
