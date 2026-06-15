import express from "express";
import path from "path";
import fs from "fs";

interface UserAccount {
  username: string;
  name: string;
  password: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
}

const USERS_FILE = path.join(process.cwd(), "users.json");

// Aux function to read/initialize users file
function readUsers(): UserAccount[] {
  try {
    let users: UserAccount[] = [];
    if (!fs.existsSync(USERS_FILE)) {
      users = [
        {
          username: "admin",
          name: "Administrador",
          password: "123",
          isAdmin: true,
          mustChangePassword: false
        }
      ];
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
    } else {
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      users = JSON.parse(data);
    }

    // Garante que o login solicitado pelo usuário esteja cadastrado
    const requestedUsername = "09013091";
    if (!users.some(u => u.username.toLowerCase() === requestedUsername)) {
      users.push({
        username: requestedUsername,
        name: "Militar 09013091",
        password: "19881995",
        isAdmin: true, // Configurado como Administrador para liberação total de recursos
        mustChangePassword: false
      });
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
    }

    return users;
  } catch (error) {
    console.error("Error reading users database:", error);
    return [
      {
        username: "admin",
        name: "Administrador",
        password: "123",
        isAdmin: true,
        mustChangePassword: false
      },
      {
        username: "09013091",
        name: "Militar 09013091",
        password: "19881995",
        isAdmin: true,
        mustChangePassword: false
      }
    ];
  }
}

function writeUsers(users: UserAccount[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing users database:", error);
  }
}

// Instantiate Express app at module scope so it can be exported for Vercel serverless
const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize database file
readUsers();

// Health check with diagnostics
app.get("/api/health", (req, res) => {
  try {
    const users = readUsers();
    const distPath = path.join(process.cwd(), 'dist');
    const hasDist = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));
    res.json({
      status: "ok",
      env: process.env.NODE_ENV || "development",
      hasDist,
      usersList: users.map(u => u.username),
      apiLoaded: true
    });
  } catch (e: any) {
    res.status(500).json({ status: "error", message: e?.message });
  }
});

// Login endpoint
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  console.log(`[AUTH] Login attempt - Username: "${username}", Password Length: ${password ? password.length : 0}`);
  
  if (!username || !password) {
    res.status(400).json({ success: false, message: "Insira usuário e senha." });
    return;
  }

  const users = readUsers();
  console.log(`[AUTH] Registered users in database:`, users.map(u => ({ username: u.username, isAdmin: u.isAdmin })));

  const cleanInputUsername = username.trim().toLowerCase();
  const user = users.find(u => u.username.toLowerCase() === cleanInputUsername);

  if (!user) {
    console.log(`[AUTH] Login failed: User "${cleanInputUsername}" not found.`);
    res.status(401).json({ success: false, message: "Usuário ou senha inválidos." });
    return;
  }

  if (user.password !== password.trim()) {
    console.log(`[AUTH] Login failed: Password mismatch for user "${cleanInputUsername}". Expected: "${user.password}", Got: "${password.trim()}"`);
    res.status(401).json({ success: false, message: "Usuário ou senha inválidos." });
    return;
  }

  console.log(`[AUTH] Login successful for user "${cleanInputUsername}"`);
  res.json({
    success: true,
    user: {
      username: user.username,
      name: user.name,
      isAdmin: user.isAdmin,
      mustChangePassword: user.mustChangePassword
    }
  });
});

// Change password endpoint
app.post("/api/auth/change-password", (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  if (!username || !oldPassword || !newPassword) {
    res.status(400).json({ success: false, message: "Campos obrigatórios ausentes." });
    return;
  }

  const users = readUsers();
  const userIndex = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());

  if (userIndex === -1 || users[userIndex].password !== oldPassword) {
    res.status(401).json({ success: false, message: "Senha atual incorreta." });
    return;
  }

  users[userIndex].password = newPassword;
  users[userIndex].mustChangePassword = false;
  writeUsers(users);

  res.json({ success: true });
});

// LIST users (Admin only checking performed on client/server simple role check)
app.get("/api/users", (req, res) => {
  const users = readUsers();
  // Return users omission of hashes/password for security
  const result = users.map(u => ({
    username: u.username,
    name: u.name,
    isAdmin: u.isAdmin,
    mustChangePassword: u.mustChangePassword
  }));
  res.json(result);
});

// CREATE user (Admin only)
app.post("/api/users/create", (req, res) => {
  const { username, name, password, isAdmin } = req.body;
  if (!username || !name || !password) {
    res.status(400).json({ success: false, message: "Por favor, preencha todos os campos obrigatórios." });
    return;
  }

  const users = readUsers();
  const cleanUsername = username.trim().toLowerCase();

  if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
    res.status(400).json({ success: false, message: "Este login de usuário já existe." });
    return;
  }

  const newUser: UserAccount = {
    username: cleanUsername,
    name: name.trim(),
    password: password.trim(),
    isAdmin: !!isAdmin,
    mustChangePassword: true // defaults to requiring reset on first login as requested
  };

  users.push(newUser);
  writeUsers(users);

  res.json({ success: true });
});

// DELETE user (Admin only)
app.delete("/api/users/:username", (req, res) => {
  const { username } = req.params;
  const cleanUsername = username.trim().toLowerCase();

  if (cleanUsername === "admin") {
    res.status(400).json({ success: false, message: "Não é possível excluir o usuário administrador padrão." });
    return;
  }

  const users = readUsers();
  const filtered = users.filter(u => u.username.toLowerCase() !== cleanUsername);

  if (users.length === filtered.length) {
    res.status(404).json({ success: false, message: "Usuário não encontrado." });
    return;
  }

  writeUsers(filtered);
  res.json({ success: true });
});

async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');
  const hasDist = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));
  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  console.log(`Starting server. NODE_ENV: ${process.env.NODE_ENV}, hasDist: ${hasDist}, isProduction: ${isProduction}`);

  if (!isProduction) {
    console.log("Serving application in DEVELOPMENT mode using Vite middleware.");
    // Dynamically import Vite to prevent runtime dependency errors in serverless/production stages
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log(`Serving application in PRODUCTION mode from: ${distPath}`);
    app.use(express.static(distPath));
    // SPA fallback handling
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only bind port if not running under a serverless host like Vercel Functions
  if (process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}

if (process.env.VERCEL !== "1") {
  startServer();
}

export default app;
