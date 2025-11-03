# Simple Deployment Guide - Coner Backend

This is a simplified guide explaining how our deployment system works and how to access the server.

## Server Information

- **Server IP**: `146.190.92.0`
- **Server Type**: DigitalOcean Droplet (Ubuntu 22.04)
- **Application Port**: `8080`
- **API URL**: `http://146.190.92.0:8080`

---

## 1. How to Get SSH Access to the Server

SSH (Secure Shell) allows you to remotely connect to the server and run commands.

### Step 1: Generate Your SSH Key Pair

On your local computer, open Terminal and run:

```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
```

**What this does**: Creates two keys:
- **Private key** (stays on your computer, never share this!)
- **Public key** (safe to share, this goes on the server)

**Default location**: `~/.ssh/id_ed25519`

Press Enter to accept defaults, optionally add a password for extra security.

### Step 2: Send Your Public Key to Server Administrator

Find your public key:

```bash
cat ~/.ssh/id_ed25519.pub
```

Copy the entire output (starts with `ssh-ed25519 ...`) and send it to the server administrator.

### Step 3: Administrator Adds Your Key to Server

The administrator will SSH into the server and run:

```bash
# SSH into server
ssh root@146.190.92.0

# Add your public key
echo "ssh-ed25519 AAAAB3... your-email@example.com" >> ~/.ssh/authorized_keys

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys
```

### Step 4: You Can Now Access the Server

```bash
ssh root@146.190.92.0
```

That's it! You're now connected to the server.

---

## 2. How GitHub Actions Deploys to the Server

Think of GitHub Actions as a robot that automatically deploys your code when you push changes.

### The Deployment Flow (Simple Version)

```
You push code to GitHub
       ↓
GitHub Actions starts
       ↓
Builds a Docker image (a package containing your app)
       ↓
Uploads image to GitHub Container Registry
       ↓
SSHs into the server (146.190.92.0)
       ↓
Downloads the new image
       ↓
Restarts the application with new code
       ↓
Done!
```

### What Actually Happens (Technical Details)

1. **Trigger**: When you push code to the `dev` branch
   ```bash
   git push origin dev
   ```

2. **Build Phase** (on GitHub's servers):
   - GitHub Actions reads `.github/workflows/deploy.yml`
   - Builds a Docker image from `src/Dockerfile`
   - Tags it as `ghcr.io/vneseyoungster/coner-backend-master:dev`
   - Pushes it to GitHub Container Registry (GHCR)

3. **Deploy Phase** (on your Droplet):
   - GitHub Actions SSHs into `146.190.92.0` using the stored SSH key
   - Runs these commands on the server:
     ```bash
     cd /opt/coner-backend
     docker login ghcr.io                    # Login to download images
     docker compose -f docker-compose.prod.yml pull  # Download new image
     docker compose -f docker-compose.prod.yml up -d # Restart with new image
     ```

4. **Verify**: Checks that the container is running properly

### Docker on the Server

**What is Docker?**
Docker packages your application and all its dependencies into a "container" - think of it as a complete, self-contained package.

**Where things are located on the server:**
```
/opt/coner-backend/              # Main directory
├── .env                          # Environment variables (secrets, config)
├── docker-compose.prod.yml       # Instructions for running the container
└── logs/                         # Application logs
```

**Key Docker commands:**
```bash
# See running containers
docker ps

# View application logs
docker logs coner-backend

# Restart the application
docker compose -f docker-compose.prod.yml restart

# Stop the application
docker compose -f docker-compose.prod.yml down

# Start the application
docker compose -f docker-compose.prod.yml up -d
```

---

## 3. How to Access the Server

### Method 1: SSH Command Line Access

```bash
ssh root@146.190.92.0
```

Once connected, you can run commands like:

```bash
# Check if app is running
docker ps | grep coner-backend

# View recent logs
docker logs --tail 50 coner-backend

# Check server resources
docker stats coner-backend

# Test the API
curl http://localhost:8080/health
```

### Method 2: Access the API Publicly

From anywhere on the internet:

```bash
# Health check
curl http://146.190.92.0:8080/health

# Example API endpoint (with authentication)
curl -X GET http://146.190.92.0:8080/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Common Tasks on the Server

#### Check Application Status
```bash
ssh root@146.190.92.0
docker ps | grep coner-backend
```

Expected output if running:
```
abc123  ghcr.io/vneseyoungster/coner-backend-master:dev  Up 2 hours  0.0.0.0:8080->8080/tcp
```

#### View Application Logs
```bash
ssh root@146.190.92.0
docker logs -f coner-backend
```
(Press Ctrl+C to stop viewing logs)

#### Restart the Application
```bash
ssh root@146.190.92.0
cd /opt/coner-backend
docker compose -f docker-compose.prod.yml restart
```

#### Update Environment Variables
```bash
ssh root@146.190.92.0
cd /opt/coner-backend
nano .env
# Make your changes, then Ctrl+X, Y, Enter to save
docker compose -f docker-compose.prod.yml restart
```

---

## How It All Works Together

### Daily Development Workflow

1. **Developer writes code** on their local machine
2. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add new feature"
   git push origin dev
   ```
3. **GitHub Actions automatically**:
   - Builds Docker image
   - Uploads to registry
   - Deploys to server (146.190.92.0)
4. **New version is live** in ~3-5 minutes

### Architecture Diagram

```
┌─────────────────┐
│  Your Computer  │
│   (git push)    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│     GitHub      │
│  (code storage) │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ GitHub Actions  │
│ (builds Docker) │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│      GHCR       │
│ (image storage) │
└────────┬────────┘
         │
         ↓
┌─────────────────┐      ┌──────────────┐
│ Droplet Server  │─────→│   Supabase   │
│ 146.190.92.0    │      │  (Database)  │
│  (runs Docker)  │      └──────────────┘
└─────────────────┘
```

---

## Quick Reference

### Access Information
- **Server IP**: `146.190.92.0`
- **SSH Access**: `ssh root@146.190.92.0`
- **API Health Check**: `http://146.190.92.0:8080/health`
- **Application Location**: `/opt/coner-backend`
- **Container Name**: `coner-backend`

### Useful Commands
```bash
# Connect to server
ssh root@146.190.92.0

# Check if app is running
docker ps

# View logs
docker logs coner-backend

# Restart app
cd /opt/coner-backend && docker compose -f docker-compose.prod.yml restart

# Check health
curl http://localhost:8080/health
```

### GitHub Actions
- **Workflow File**: `.github/workflows/deploy.yml`
- **Triggers**: Push to `dev` branch or manual trigger
- **View Status**: GitHub → Actions tab
- **Image Location**: `ghcr.io/vneseyoungster/coner-backend-master:dev`

---

## Need Help?

- **View deployment logs**: Go to GitHub → Actions tab
- **Check server logs**: `ssh root@146.190.92.0` → `docker logs coner-backend`
- **Test API**: `curl http://146.190.92.0:8080/health`
- **Full documentation**: See `DEPLOYMENT.md`
