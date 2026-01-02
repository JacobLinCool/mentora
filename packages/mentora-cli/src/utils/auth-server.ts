/**
 * Local authentication server for OAuth flow
 * Runs a small localhost server to handle Firebase authentication
 */
import http from "node:http";
import { URL } from "node:url";
import { getConfig } from "../config.js";

const LOGIN_HTML = (config: {
    apiKey: string;
    authDomain: string;
    projectId: string;
}) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mentora CLI - Authentication</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,600;1,600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-dark: #0f172a;
            --bg-accent: #1e1b4b;
            --glass-bg: rgba(255, 255, 255, 0.03);
            --glass-border: rgba(255, 255, 255, 0.08);
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent-gold: #fbbf24;
            --success: #10b981;
            --error: #ef4444;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, var(--bg-dark) 0%, var(--bg-accent) 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-primary);
            overflow: hidden;
            position: relative;
        }

        /* Ambient background effects */
        body::before, body::after {
            content: '';
            position: absolute;
            width: 500px;
            height: 500px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
            z-index: 0;
            animation: float 20s infinite ease-in-out;
        }
        body::before { top: -100px; left: -100px; animation-delay: -5s; }
        body::after { bottom: -100px; right: -100px; background: radial-gradient(circle, rgba(251, 191, 36, 0.05) 0%, transparent 70%); }

        @keyframes float {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(30px, 50px); }
        }

        .container {
            position: relative;
            z-index: 10;
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            padding: 3.5rem;
            border-radius: 1.5rem;
            border: 1px solid var(--glass-border);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            text-align: center;
            max-width: 420px;
            width: 90%;
            animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .logo {
            font-family: 'Playfair Display', serif;
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            background: linear-gradient(135deg, #fff 0%, #cbd5e1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.02em;
        }

        .subtitle {
            color: var(--text-secondary);
            margin-bottom: 2.5rem;
            font-weight: 300;
            font-size: 1.1rem;
            line-height: 1.5;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            padding: 1rem 1.5rem;
            border: 1px solid var(--glass-border);
            border-radius: 0.75rem;
            font-size: 1rem;
            font-family: inherit;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            width: 100%;
            margin-bottom: 1rem;
            position: relative;
            overflow: hidden;
        }

        .btn-google {
            background: rgba(255, 255, 255, 0.08);
            color: white;
        }

        .btn-google:hover {
            background: rgba(255, 255, 255, 0.12);
            transform: translateY(-2px);
            box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.3);
            border-color: rgba(255, 255, 255, 0.2);
        }

        .btn:active { transform: translateY(0); }

        .icon { width: 20px; height: 20px; }

        .status {
            margin-top: 2rem;
            font-size: 0.9rem;
            min-height: 1.5em;
            transition: color 0.3s;
        }
        .status.success { color: var(--success); }
        .status.error { color: var(--error); }

        .loading-ring {
            display: inline-block;
            width: 20px;
            height: 20px;
            margin-right: 10px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
            vertical-align: middle;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .loading-container {
            display: none;
            color: var(--text-secondary);
            margin-top: 1.5rem;
        }

        /* Success State adjustments */
        .success-icon {
            font-size: 4rem;
            color: var(--success);
            margin-bottom: 1rem;
            animation: scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes scaleIn {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div id="content">
            <h1 class="logo">Mentora</h1>
            <p class="subtitle">Access via CLI.<br>Please sign in to continue.</p>
            
            <button class="btn btn-google" onclick="signInWithGoogle()">
                <svg class="icon" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
            </button>
            
            <div id="status" class="status"></div>
            <div id="loading" class="loading-container">
                <span class="loading-ring"></span> Authenticating...
            </div>
        </div>
    </div>

    <script type="module">
        import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js';
        import { getAuth, signInWithPopup, GoogleAuthProvider, GithubAuthProvider } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';

        const firebaseConfig = {
            apiKey: "${config.apiKey}",
            authDomain: "${config.authDomain}",
            projectId: "${config.projectId}"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);

        window.signInWithGoogle = async () => {
            const provider = new GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');
            await signIn(provider);
        };

        async function signIn(provider) {
            const status = document.getElementById('status');
            const loading = document.getElementById('loading');
            const btns = document.querySelectorAll('button');
            
            try {
                loading.style.display = 'block';
                status.textContent = '';
                btns.forEach(b => b.style.opacity = '0.5');
                btns.forEach(b => b.disabled = true);

                const result = await signInWithPopup(auth, provider);
                
                let credential = null;
                if (provider instanceof GoogleAuthProvider) {
                    credential = GoogleAuthProvider.credentialFromResult(result);
                } else if (provider instanceof GithubAuthProvider) {
                    credential = GithubAuthProvider.credentialFromResult(result);
                }
                
                const responsePayload = {
                    uid: result.user.uid,
                    email: result.user.email,
                    displayName: result.user.displayName,
                    credential: credential ? {
                        accessToken: credential.accessToken,
                        idToken: credential.idToken,
                        providerId: credential.providerId,
                    } : undefined
                };
                
                const response = await fetch('/callback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(responsePayload)
                });

                if (response.ok) {
                    const content = document.getElementById('content');
                    content.innerHTML = \`
                        <div class="success-icon">✓</div>
                        <h1 class="logo" style="font-size: 2rem; margin-bottom: 1rem">Welcome Back</h1>
                        <p class="subtitle" style="margin-bottom: 1.5rem">
                            Logged in as <strong style="color: white">\${result.user.email}</strong>
                        </p>
                        <p style="color: var(--success); font-weight: 500">
                            You may now close this window and return to the terminal.
                        </p>
                    \`;
                } else {
                    throw new Error('Failed to save authentication');
                }
            } catch (error) {
                loading.style.display = 'none';
                status.className = 'status error';
                status.textContent = 'Authentication failed. Please try again.';
                console.error(error);
                btns.forEach(b => b.style.opacity = '1');
                btns.forEach(b => b.disabled = false);
            }
        }
    </script>
</body>
</html>
`;

export interface AuthResult {
    uid: string;
    email: string;
    displayName: string;
    credential?: {
        accessToken?: string;
        idToken?: string;
        providerId: string;
    };
}

export function startAuthServer(port: number = 9876): Promise<AuthResult> {
    return new Promise((resolve, reject) => {
        const config = getConfig();

        if (!config.projectId || !config.apiKey) {
            reject(
                new Error(
                    "Missing Firebase configuration. Run 'mentora config set projectId <id>' and 'mentora config set apiKey <key>' first.",
                ),
            );
            return;
        }

        let timeoutId: NodeJS.Timeout | null = null;
        let isResolved = false;

        const closeServer = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            server.close();
        };

        const server = http.createServer((req, res) => {
            const url = new URL(req.url || "/", `http://localhost:${port}`);

            if (req.method === "GET" && url.pathname === "/") {
                // Serve login page
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(
                    LOGIN_HTML({
                        apiKey: config.apiKey!,
                        authDomain:
                            config.authDomain ||
                            `${config.projectId}.firebaseapp.com`,
                        projectId: config.projectId!,
                    }),
                );
            } else if (req.method === "POST" && url.pathname === "/callback") {
                // Handle authentication callback
                let body = "";
                req.on("data", (chunk) => (body += chunk));
                req.on("end", () => {
                    try {
                        const data = JSON.parse(body) as AuthResult;
                        res.writeHead(200, {
                            "Content-Type": "application/json",
                        });
                        res.end(JSON.stringify({ success: true }));

                        // Close server and resolve
                        if (!isResolved) {
                            isResolved = true;
                            closeServer();
                            resolve(data);
                        }
                    } catch (err) {
                        res.writeHead(400, {
                            "Content-Type": "application/json",
                        });
                        res.end(JSON.stringify({ error: "Invalid request" }));

                        // Close server on parse error
                        if (!isResolved) {
                            isResolved = true;
                            closeServer();
                            reject(
                                new Error(
                                    "Failed to parse authentication response",
                                ),
                            );
                        }
                    }
                });
            } else {
                res.writeHead(404);
                res.end("Not found");
            }
        });

        server.on("error", (err) => {
            if (!isResolved) {
                isResolved = true;
                closeServer();
                reject(err);
            }
        });

        server.listen(port, "127.0.0.1", () => {
            // Server started successfully
        });

        // Timeout after 5 minutes
        timeoutId = setTimeout(
            () => {
                if (!isResolved) {
                    isResolved = true;
                    closeServer();
                    reject(new Error("Authentication timed out"));
                }
            },
            5 * 60 * 1000,
        );
    });
}
